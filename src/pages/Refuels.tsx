import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehicleFirst, refuelsByVehicle } from '../db';
import type { Refuel, Vehicle } from '../types';

export default function Refuels(){
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [rows, setRows] = useState<Refuel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const v = await vehicleFirst();
      if (cancelled) return;
      if (!v){
        setVehicle(null);
        setRows([]);
        setLoading(false);
        return;
      }
      const data = await refuelsByVehicle(v.id!);
      if (cancelled) return;
      setVehicle(v);
      setRows([...data].reverse());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-stack">
      <header>
        <div className="page-title">Rifornimenti</div>
        <p className="page-subtitle">
          {vehicle ? `Storico dei pieni per ${vehicle.name}.` : 'Nessun veicolo collegato.'}
        </p>
      </header>

      <Link className="btn w-full" to="/refuels/new">
        Nuovo rifornimento
      </Link>

      {loading && <div className="card empty-state">Caricamento storico…</div>}

      {!loading && !vehicle && (
        <div className="card hero-card">
          <span className="stat-card__label">Nessun veicolo</span>
          <div className="hero-card__meta">
            Aggiungi un veicolo nel garage per iniziare a tracciare i rifornimenti.
          </div>
        </div>
      )}

      {!loading && vehicle && rows.length === 0 && (
        <div className="card empty-state">
          Non hai ancora registrato rifornimenti per questo veicolo.
        </div>
      )}

      {rows.map((r) => {
        const liters = r.liters.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const price = r.price_per_liter.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        const total = (r.liters * r.price_per_liter).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (
          <div key={r.id} className="card refuel-card">
            <div className="refuel-card__meta">
              <span>{new Date(r.date).toLocaleString()}</span>
              <span>{r.odometer} km</span>
            </div>
            <div className="refuel-card__values">
              <span>{liters} L · € {price}/L</span>
              <span>€ {total}</span>
            </div>
            {r.notes && <div className="refuel-card__notes">{r.notes}</div>}
          </div>
        );
      })}
    </div>
  );
}
