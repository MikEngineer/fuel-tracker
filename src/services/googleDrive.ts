export type DriveAuthState = {
  loading: boolean;
  signedIn: boolean;
  userEmail?: string | null;
  userName?: string | null;
  error?: string | null;
};

type Listener = (state: DriveAuthState) => void;

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function resolve(path: string){
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path;
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

let state: DriveAuthState = { loading: true, signedIn: false };
let initPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify(){
  const snapshot = { ...state };
  listeners.forEach((cb) => cb(snapshot));
}

function setState(next: Partial<DriveAuthState>){
  state = { ...state, ...next };
  notify();
}

type AuthStatusResponse = {
  authenticated: boolean;
  user?: {
    email?: string | null;
    name?: string | null;
  } | null;
};

async function fetchAuthStatus(){
  const response = await fetch(resolve('/api/auth/status'), {
    credentials: 'include'
  });
  const text = await response.text();
  if (!response.ok){
    const message = text || 'Impossibile verificare lo stato di autenticazione.';
    throw new Error(message);
  }
  if (!text){
    return { authenticated: false } satisfies AuthStatusResponse;
  }
  try {
    return JSON.parse(text) as AuthStatusResponse;
  } catch {
    return { authenticated: false } satisfies AuthStatusResponse;
  }
}

async function refresh(){
  setState({ loading: true });
  try {
    const payload = await fetchAuthStatus();
    setState({
      loading: false,
      signedIn: !!payload.authenticated,
      userEmail: payload.user?.email ?? null,
      userName: payload.user?.name ?? null,
      error: null
    });
  } catch (error){
    const message = error instanceof Error ? error.message : String(error);
    setState({
      loading: false,
      signedIn: false,
      userEmail: null,
      userName: null,
      error: message
    });
  }
}

export function subscribeAuth(listener: Listener){
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthState(){
  return { ...state };
}

export async function initDriveClient(){
  if (!initPromise){
    initPromise = refresh().finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

export async function refreshAuthState(){
  await refresh();
}

export async function ensureSignedIn(){
  await refresh();
  if (state.signedIn) return;
  const redirectUri = new URL('/auth/callback', window.location.origin).toString();
  const target = new URL(resolve('/api/auth/signin'), window.location.origin);
  target.searchParams.set('redirect_uri', redirectUri);
  window.location.href = target.toString();
}

export async function signOut(){
  try {
    await fetch(resolve('/api/auth/signout'), {
      method: 'POST',
      credentials: 'include'
    });
  } finally {
    await refresh();
  }
}
