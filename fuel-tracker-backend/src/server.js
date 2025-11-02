const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config({ path: '.env' }); // oppure '.env.local'
const { google } = require('googleapis');

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:8787', // aggiorna se usi altra porta/front
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true },
  })
);

// --------- Google OAuth ----------

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

function isAuthenticated(req) {
  return req.session && req.session.tokens;
}

// Endpoint: verifica login
app.get('/api/auth/status', (req, res) => {
  res.json({ loggedIn: isAuthenticated(req) });
});

// Endpoint: avvio login Google
app.get('/api/auth/signin', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.appdata'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// Endpoint: callback OAuth
app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);
  req.session.tokens = tokens;
  res.redirect('http://localhost:8787'); // dopo login torna al frontend
});

// Endpoint: logout
app.post('/api/auth/signout', (req, res) => {
  req.session.destroy(() => res.json({ status: 'signed out' }));
});

// --------- Google Drive (archivio dati) ----------

const getDrive = (req) => {
  const client = new google.auth.OAuth2();
  client.setCredentials(req.session.tokens);
  return google.drive({ version: 'v3', auth: client });
};

app.get('/api/archive', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).send('Not logged in');
  const drive = getDrive(req);
  const files = await drive.files.list({
    spaces: 'appDataFolder',
    fields: 'files(id, name)',
    q: "name='fuel-tracker-data.json'",
  });
  let file;
  if (files.data.files.length === 0) {
    // crea file vuoto se non esiste
    const createRes = await drive.files.create({
      resource: {
        name: 'fuel-tracker-data.json',
        parents: ['appDataFolder'],
      },
      media: { body: JSON.stringify({ refuels: [], vehicles: [] }) },
    });
    file = createRes.data;
    res.json({ created: true, file });
  } else {
    file = files.data.files[0];
    // leggi contenuto
    const contentRes = await drive.files.get({
      fileId: file.id,
      alt: 'media',
    });
    res.json({ hasData: true, data: contentRes.data });
  }
});

app.put('/api/archive', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).send('Not logged in');
  const drive = getDrive(req);
  const files = await drive.files.list({
    spaces: 'appDataFolder',
    fields: 'files(id, name)',
    q: "name='fuel-tracker-data.json'",
  });
  if (!files.data.files[0]) return res.status(404).send('File not found');
  await drive.files.update({
    fileId: files.data.files[0].id,
    media: { body: JSON.stringify(req.body) },
  });
  res.json({ status: 'updated' });
});

app.listen(4000, () => console.log('API backend attivo su http://localhost:4000'));
