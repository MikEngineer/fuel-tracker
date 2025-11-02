import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { google } from 'googleapis';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const {
  PORT = '8787',
  BASE_URL = 'http://localhost:8787',
  FRONTEND_ORIGIN = 'http://localhost:5174',
  GOOGLE_CLIENT_ID = '',
  GOOGLE_CLIENT_SECRET = '',
  SESSION_SECRET = 'change-me',
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('❌ Manca GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET nel .env');
  process.exit(1);
}

const app = express();

// --- CORS (cookie di sessione) ---
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// --- Sessione (solo per DEV: MemoryStore) ---
// In produzione usa un session store (Redis/Mongo) oppure passa a cookie-session/iron-session.
app.use(session({
  name: 'ft.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: /^https:\/\//.test(BASE_URL), // true solo su HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 giorni
  }
}));

// --- Google OAuth Client ---
const oauth2 = new google.auth.OAuth2({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: `${BASE_URL}/api/auth/callback`,
});

type SessionData = {
  tokens?: any;
  email?: string;
  redirectAfterLogin?: string;
};

// helper per ottenere client autenticato dalla sessione
function authedClient(req: Request) {
  const s = req.session as any as SessionData;
  if (!s.tokens) return null;
  const client = new google.auth.OAuth2({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: `${BASE_URL}/api/auth/callback`,
  });
  client.setCredentials(s.tokens);
  // refresh automatico token se necessario
  client.on('tokens', (tokens) => {
    if (tokens.refresh_token || tokens.access_token) {
      (req.session as any as SessionData).tokens = { ...s.tokens, ...tokens };
      req.session.save(() => {});
    }
  });
  return client;
}

// --- AUTH: status ---
app.get('/api/auth/status', async (req: Request, res: Response) => {
  const s = req.session as any as SessionData;
  res.json({
    signedIn: !!s.tokens,
    email: s.email || null,
  });
});

// --- AUTH: signin -> redirect a Google ---
app.get('/api/auth/signin', async (req: Request, res: Response) => {
  const redirect_uri = (req.query.redirect_uri as string) || `${FRONTEND_ORIGIN}/auth/callback`;
  (req.session as any as SessionData).redirectAfterLogin = redirect_uri;

  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.appdata',
      'openid',
      'email',
      'profile',
    ],
    include_granted_scopes: true,
    state: crypto.randomBytes(8).toString('hex'),
  });

  res.redirect(url);
});

// --- AUTH: callback ---
app.get('/api/auth/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const { tokens } = await oauth2.getToken(code);

    (req.session as any as SessionData).tokens = tokens;

    // opzionale: leggi email utente
    const client = authedClient(req);
    if (client) {
      const oauth2api = google.oauth2({ version: 'v2', auth: client });
      const me = await oauth2api.userinfo.get();
      (req.session as any as SessionData).email = me.data.email || undefined;
    }

    const redirectTo = (req.session as any as SessionData).redirectAfterLogin || `${FRONTEND_ORIGIN}/auth/callback`;
    res.redirect(redirectTo);
  } catch (err) {
    console.error('OAuth callback error', err);
    res.status(500).send('OAuth Error');
  }
});

// --- AUTH: signout ---
app.post('/api/auth/signout', async (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie('ft.sid');
    res.json({ ok: true });
  });
});

// --- ARCHIVE: helper Drive ---
async function getDrive(client: any) {
  return google.drive({ version: 'v3', auth: client });
}

const FILE_NAME = 'fuel-tracker-data.json';

// trova/crea file in appDataFolder
async function ensureAppDataFile(drive: any) {
  const q = `name='${FILE_NAME}' and 'appDataFolder' in parents and trashed=false`;
  const resp = await drive.files.list({ q, spaces: 'appDataFolder', fields: 'files(id,name)' });
  if (resp.data.files && resp.data.files.length > 0) {
    return { id: resp.data.files[0].id as string, created: false };
  }
  const create = await drive.files.create({
    requestBody: {
      name: FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    },
    media: {
      mimeType: 'application/json',
      body: JSON.stringify({}), // file vuoto iniziale
    },
    fields: 'id',
  });
  return { id: create.data.id as string, created: true };
}

// --- GET /api/archive ---
app.get('/api/archive', async (req: Request, res: Response) => {
  const client = authedClient(req);
  if (!client) return res.status(401).json({ error: 'unauthorized' });

  try {
    const drive = await getDrive(client);
    const { id, created } = await ensureAppDataFile(drive);

    const file = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' });

    let raw = '';
    await new Promise<void>((resolve, reject) => {
      file.data.on('data', (chunk: Buffer) => (raw += chunk.toString('utf8')));
      file.data.on('end', () => resolve());
      file.data.on('error', reject);
    });

    let store: any = {};
    let hasData = false;
    try {
      store = raw ? JSON.parse(raw) : {};
      hasData = !!raw && raw.trim() !== '{}' && raw.trim() !== '';
    } catch {
      store = {};
    }

    res.json({ store, info: { created, hasData } });
  } catch (err) {
    console.error('GET /api/archive error', err);
    res.status(500).json({ error: 'archive_read_failed' });
  }
});

// --- PUT /api/archive ---
app.put('/api/archive', async (req: Request, res: Response) => {
  const client = authedClient(req);
  if (!client) return res.status(401).json({ error: 'unauthorized' });

  const body = req.body;
  if (!body || typeof body.store === 'undefined') {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  try {
    const drive = await getDrive(client);
    const { id } = await ensureAppDataFile(drive);
    const content = JSON.stringify(body.store ?? {}, null, 2);

    await drive.files.update({
      fileId: id,
      media: {
        mimeType: 'application/json',
        body: content,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/archive error', err);
    res.status(500).json({ error: 'archive_write_failed' });
  }
});

// --- Avvio ---
app.listen(Number(PORT), () => {
  console.log(`✅ Fuel Tracker backend on ${BASE_URL}`);
});
