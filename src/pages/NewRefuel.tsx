import { useEffect, useState } from 'react';
import { vehicleFirst, refuelCreate } from '../db';
import RefuelForm from '../components/RefuelForm';
import type { Vehicle } from '../types';

export default function NewRefuel(){
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const v = await vehicleFirst();
      if (cancelled) return;
      setVehicle(v ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading){
    return (
      <div className="page-stack">
        <header>
          <div className="page-title">Nuovo rifornimento</div>
          <p className="page-subtitle">Caricamento dei dati del veicolo…</p>
        </header>
        <div className="card empty-state">Recupero informazioni…</div>
      </div>
    );
  }

  if (!vehicle){
    return (
      <div className="page-stack">
        <header>
          <div className="page-title">Nuovo rifornimento</div>
          <p className="page-subtitle">Hai bisogno di almeno un veicolo attivo.</p>
        </header>
        <div className="card hero-card">
          <span className="stat-card__label">Nessun veicolo</span>
          <div className="hero-card__meta">
            Crea il tuo primo veicolo nella sezione Garage per poter registrare i pieni.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="section-heading">
        <div>
          <div className="page-title">Nuovo rifornimento</div>
          <p className="page-subtitle">{vehicle.name}</p>
        </div>
      </header>
      <RefuelForm
        onSubmit={async (f) => {
          await refuelCreate({ vehicle_id: vehicle.id!, ...f, station: null });
          location.href = '/refuels';
        }}
      />
    </div>
  );
}
