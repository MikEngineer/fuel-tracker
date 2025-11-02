const GAPI_SRC = 'https://apis.google.com/js/api.js';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

export type DriveAuthState = {
  loading: boolean;
  signedIn: boolean;
  userEmail?: string | null;
  userName?: string | null;
  error?: string | null;
};

type Listener = (state: DriveAuthState) => void;

let scriptPromise: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;
let state: DriveAuthState = { loading: true, signedIn: false };
const listeners = new Set<Listener>();

declare const gapi: any;

type GoogleAuthInstance = any;

declare global {
  interface Window {
    gapiLoaded?: boolean;
  }
}

function notify(){
  const snapshot = { ...state };
  listeners.forEach((cb) => cb(snapshot));
}

function setState(next: Partial<DriveAuthState>){
  state = { ...state, ...next };
  notify();
}

async function loadScript(){
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.gapiLoaded){
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GAPI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapiLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Impossibile caricare le API Google.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function getAuth(): GoogleAuthInstance | null {
  if (typeof gapi === 'undefined' || !gapi.auth2) return null;
  try {
    return gapi.auth2.getAuthInstance();
  } catch {
    return null;
  }
}

function handleSignInChange(isSignedIn: boolean){
  const auth = getAuth();
  const user = isSignedIn && auth ? auth.currentUser.get() : null;
  const profile = user ? user.getBasicProfile() : null;
  setState({
    loading: false,
    signedIn: !!isSignedIn,
    userEmail: profile ? profile.getEmail() : null,
    userName: profile ? profile.getName() : null,
    error: null
  });
}

export function subscribeAuth(listener: Listener){
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthState(): DriveAuthState {
  return { ...state };
}

export async function initDriveClient(){
  if (initPromise) return initPromise;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!apiKey || !clientId){
    setState({
      loading: false,
      signedIn: false,
      error: 'Configura le variabili VITE_GOOGLE_API_KEY e VITE_GOOGLE_CLIENT_ID per collegarti a Google Drive.'
    });
    throw new Error('Missing Google Drive credentials');
  }
  initPromise = (async () => {
    setState({ loading: true, error: null });
    await loadScript();
    await new Promise<void>((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey,
            clientId,
            scope: SCOPES,
            discoveryDocs: DISCOVERY_DOCS
          });
          const auth = getAuth();
          if (!auth){
            throw new Error('Impossibile inizializzare Google Auth.');
          }
          auth.isSignedIn.listen(handleSignInChange);
          handleSignInChange(auth.isSignedIn.get());
          resolve();
        } catch (error){
          const message = error instanceof Error ? error.message : String(error);
          setState({ loading: false, signedIn: false, error: message });
          reject(error);
        }
      });
    });
  })();
  return initPromise;
}

export async function ensureSignedIn(){
  await initDriveClient();
  const auth = getAuth();
  if (!auth) throw new Error('Google Auth non disponibile');
  if (!auth.isSignedIn.get()){
    setState({ loading: true, error: null });
    try {
      await auth.signIn({ prompt: 'select_account' });
    } catch (error){
      handleSignInChange(false);
      throw error;
    }
  }
}

export async function signOut(){
  await initDriveClient();
  const auth = getAuth();
  if (!auth) return;
  await auth.signOut();
}

export function isSignedIn(){
  const auth = getAuth();
  return !!auth && auth.isSignedIn.get();
}

async function getAccessToken(){
  await initDriveClient();
  const auth = getAuth();
  if (!auth || !auth.isSignedIn.get()){
    throw new Error('Utente non autenticato con Google Drive.');
  }
  const user = auth.currentUser.get();
  const response = user.getAuthResponse(true);
  if (!response || !response.access_token){
    throw new Error('Token di accesso non disponibile.');
  }
  return response.access_token as string;
}

type DriveFileInfo = { id: string; created: boolean };

async function ensureDataFile(defaultPayload: unknown): Promise<DriveFileInfo>{
  const list = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    fields: 'files(id, name)',
    q: "name = 'fuel-tracker-data.json'",
    pageSize: 1
  });
  const files = list.result?.files as Array<{ id: string }> | undefined;
  if (files && files.length){
    return { id: files[0].id, created: false };
  }
  const created = await gapi.client.drive.files.create({
    resource: {
      name: 'fuel-tracker-data.json',
      parents: ['appDataFolder'],
      mimeType: 'application/json'
    },
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(defaultPayload)
    },
    fields: 'id'
  });
  const id = created.result?.id;
  if (!id) throw new Error('Impossibile creare il file dati su Drive.');
  return { id, created: true };
}

export async function loadFuelData<T>(defaultPayload: T): Promise<{ id: string; data: T; created: boolean }> {
  await ensureSignedIn();
  const token = await getAccessToken();
  const { id: fileId, created } = await ensureDataFile(defaultPayload);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 404){
    return { id: fileId, data: defaultPayload, created };
  }
  if (!response.ok){
    throw new Error('Impossibile leggere i dati da Google Drive.');
  }
  const text = await response.text();
  if (!text){
    return { id: fileId, data: defaultPayload, created };
  }
  try {
    return { id: fileId, data: JSON.parse(text) as T, created };
  } catch {
    return { id: fileId, data: defaultPayload, created };
  }
}

export async function saveFuelData(fileId: string, payload: unknown){
  await ensureSignedIn();
  const token = await getAccessToken();
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok){
    throw new Error('Impossibile salvare i dati su Google Drive.');
  }
}

export async function resetInit(){
  initPromise = null;
  scriptPromise = null;
  state = { loading: true, signedIn: false };
  notify();
}
