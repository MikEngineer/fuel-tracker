import { Outlet, Link, useLocation } from 'react-router-dom';

export default function App(){
  const loc = useLocation();
  const is = (p:string)=> loc.pathname===p;
  return (
    <div className="min-h-dvh bg-bg text-on">
      <div className="max-w-md mx-auto p-4 pb-20">
        <Outlet/>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-[#222]">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center">
          <Link className={`p-3 ${is('/')?'text-primary':'text-on'}`} to="/">Home</Link>
          <Link className={`p-3 ${is('/refuels')?'text-primary':'text-on'}`} to="/refuels">Riforn.</Link>
          <Link className={`p-3 ${is('/stats')?'text-primary':'text-on'}`} to="/stats">Stat</Link>
          <Link className={`p-3 ${is('/vehicles')?'text-primary':'text-on'}`} to="/vehicles">Veicoli</Link>
        </div>
      </nav>
    </div>
  );
}
