import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  initDriveClient,
  subscribeAuth,
  getAuthState,
  ensureSignedIn,
  signOut,
  type DriveAuthState
} from './services/googleDrive';
import {
  resetCache,
  reloadFromDrive,
  subscribeArchive,
  type ArchiveInfo
} from './db';

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/refuels', label: 'Rifornimenti', icon: FuelIcon },
  { to: '/stats', label: 'Statistiche', icon: StatsIcon },
  { to: '/vehicles', label: 'Garage', icon: CarIcon }
] as const;

export default function App(){
  const location = useLocation();
  const [authState, setAuthState] = useState<DriveAuthState>(() => getAuthState());
  const [archiveInfo, setArchiveInfo] = useState<ArchiveInfo | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    initDriveClient().catch(() => {
      /* lo stato di errore viene gestito dal client */
    });
    const unsubscribeAuth = subscribeAuth(setAuthState);
    const unsubscribeArchive = subscribeArchive((info) => {
      if (info.created || info.hasData){
        setArchiveInfo(info);
      } else {
        setArchiveInfo(null);
      }
    });
    return () => {
      unsubscribeAuth();
      unsubscribeArchive();
    };
  }, []);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const readyForApp = authState.signedIn && !authState.loading && !authState.error;

  useEffect(() => {
    if (!readyForApp){
      readyRef.current = false;
      if (!authState.signedIn){
        setArchiveInfo(null);
      }
      return;
    }
    if (!readyRef.current){
      reloadFromDrive().catch((error) => {
        console.error('Errore nel caricamento dell\'archivio Google Drive', error);
      });
      readyRef.current = true;
    }
  }, [readyForApp, authState.signedIn]);

  async function handleConnect(){
    try {
      await ensureSignedIn();
    } catch (error){
      console.error('Errore durante la connessione a Google Drive', error);
    }
  }

  async function handleSignOut(){
    try {
      await signOut();
    } finally {
      resetCache();
      setArchiveInfo(null);
      readyRef.current = false;
    }
  }

  return (
    <div className="app-shell">
      <div className="app-body">
        <DriveStatusBanner state={authState} onConnect={handleConnect} onSignOut={handleSignOut} />
        {readyForApp && archiveInfo && <ArchiveInfoBanner info={archiveInfo} />}
        {readyForApp ? (
          <Outlet />
        ) : !authState.loading && !authState.error ? (
          <div className="card empty-state">
            Collega Google Drive per iniziare a tracciare i rifornimenti.
          </div>
        ) : null}
      </div>
      <nav className="bottom-nav">
        <div className="bottom-nav__content">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className={`bottom-nav__item${isActive(to) ? ' bottom-nav__item--active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
          <Link
            to={readyForApp ? '/refuels/new' : '#'}
            className={`bottom-nav__fab${readyForApp ? '' : ' bottom-nav__fab--disabled'}`}
            aria-label="Nuovo rifornimento"
            onClick={(event) => {
              if (!readyForApp){
                event.preventDefault();
                handleConnect();
              }
            }}
          >
            <PlusIcon />
          </Link>
        </div>
      </nav>
    </div>
  );
}

function DriveStatusBanner({ state, onConnect, onSignOut }: {
  state: DriveAuthState;
  onConnect: () => void;
  onSignOut: () => void;
}){
  if (state.loading){
    return <div className="card empty-state">Connessione a Google Drive…</div>;
  }
  if (state.error){
    return (
      <div className="card hero-card">
        <span className="stat-card__label">Google Drive</span>
        <div className="hero-card__name">Connessione non riuscita</div>
        <p className="hero-card__meta">{state.error}</p>
        <button className="btn w-full" onClick={onConnect}>Riprova collegamento</button>
      </div>
    );
  }
  if (!state.signedIn){
    return (
      <div className="card hero-card">
        <span className="stat-card__label">Google Drive</span>
        <div className="hero-card__name">Nessun account collegato</div>
        <p className="hero-card__meta">
          Collega il tuo account Google Drive per salvare veicoli e rifornimenti nel cloud.
        </p>
        <button className="btn w-full" onClick={onConnect}>Collega Google Drive</button>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="row">
        <div>
          <div className="stat-card__label">Google Drive</div>
          <div className="hero-card__meta">
            Connesso come {state.userName || state.userEmail || 'utente'}
          </div>
        </div>
        <button className="btn-alt" onClick={onSignOut}>Disconnetti</button>
      </div>
    </div>
  );
}

function ArchiveInfoBanner({ info }: { info: ArchiveInfo }){
  if (info.hasData){
    return (
      <div className="card">
        <div className="row">
          <div>
            <div className="stat-card__label">Archivio Google Drive</div>
            <div className="hero-card__meta">Dati sincronizzati dal tuo archivio nel cloud.</div>
          </div>
          <span className="pill">Sincronizzato</span>
        </div>
      </div>
    );
  }

  if (info.created){
    return (
      <div className="card hero-card">
        <span className="stat-card__label">Archivio Google Drive</span>
        <div className="hero-card__name">Nuovo archivio creato</div>
        <p className="hero-card__meta">
          Non abbiamo trovato dati esistenti, quindi abbiamo preparato un nuovo archivio per questo account.
        </p>
      </div>
    );
  }

  return (
    <div className="card hero-card">
      <span className="stat-card__label">Archivio Google Drive</span>
      <div className="hero-card__meta">
        Nessun dato è presente nell'archivio: verrà popolato automaticamente con i prossimi rifornimenti.
      </div>
    </div>
  );
}

function HomeIcon(){
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M4 11.1 12 4l8 7.1V20a1 1 0 0 1-1 1h-4.2a.6.6 0 0 1-.6-.6v-4.7h-4.4v4.7a.6.6 0 0 1-.6.6H5a1 1 0 0 1-1-1v-8.9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FuelIcon(){
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M5.4 20.6V6.9A2.4 2.4 0 0 1 7.8 4.5h3.9a2.4 2.4 0 0 1 2.4 2.4v13.7"
        strokeLinecap="round"
      />
      <path
        d="M5.4 20.6h8.7m4.2-9.6 1.3 1.3a1.7 1.7 0 0 1 .5 1.2v5.4a1.7 1.7 0 0 1-1.7 1.7h-1.4"
        strokeLinecap="round"
      />
      <path d="m17.2 6.1 2.9-2.9" strokeLinecap="round" />
      <path d="m18.1 10.7-.9-.9V5.6" strokeLinecap="round" />
      <rect x="7.4" y="8.1" width="4.6" height="4.2" rx="1" />
    </svg>
  );
}

function StatsIcon(){
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M4 15.5 9.3 10a.5.5 0 0 1 .77.1l2.4 3.35a.5.5 0 0 0 .79.02l3.43-4.16a.5.5 0 0 1 .76.02L20 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 20h16" strokeLinecap="round" />
      <rect x="5" y="12" width="2.6" height="5.5" rx="0.8" />
      <rect x="10.2" y="9.8" width="2.6" height="7.7" rx="0.8" />
      <rect x="15.4" y="7.5" width="2.6" height="10" rx="0.8" />
    </svg>
  );
}

function CarIcon(){
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M4.1 14.5 6 8.2a1.6 1.6 0 0 1 1.54-1.1h8.92c.68 0 1.3.43 1.52 1.07l2 6.33"
        strokeLinecap="round"
      />
      <path
        d="M3.9 15h16.2a1.5 1.5 0 0 1 1.5 1.5v2.1A1.4 1.4 0 0 1 20.2 20H3.8a1.4 1.4 0 0 1-1.4-1.4v-2.1A1.5 1.5 0 0 1 3.9 15Z"
        strokeLinecap="round"
      />
      <path d="M7.5 20v.8M16.7 20v.8" strokeLinecap="round" />
      <circle cx="7.4" cy="16.8" r="1.15" />
      <circle cx="16.6" cy="16.8" r="1.15" />
    </svg>
  );
}

function PlusIcon(){
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
