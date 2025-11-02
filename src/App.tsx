import { Outlet, Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/refuels', label: 'Rifornimenti', icon: FuelIcon },
  { to: '/stats', label: 'Statistiche', icon: StatsIcon },
  { to: '/vehicles', label: 'Garage', icon: CarIcon }
] as const;

export default function App(){
  const location = useLocation();
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="app-shell">
      <div className="app-body">
        <Outlet />
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
            to="/refuels/new"
            className="bottom-nav__fab"
            aria-label="Nuovo rifornimento"
          >
            <PlusIcon />
          </Link>
        </div>
      </nav>
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
