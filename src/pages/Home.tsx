import { useEffect, useState } from 'react';
import { vehiclesAll, refuelsByVehicle } from '../db';
import StatCard from '../components/StatCard';
import { buildSegments } from '../logic';
import type { Refuel } from '../types';

export default function Home(){
  const [vid, setVid] = useState<number | undefined>();
  const [name, setName] = useState<string>('—');
  const [monthly, setMonthly] = useState(0);
  const [l100, setL100] = useState<number | null>(null);
  const [eurkm, setEurkm] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const vs = await vehiclesAll();
      if (vs.length){
        setVid(vs[0].id);
        setName(vs[0].name);
      }
    })();
  }, []);

  useEffect(() => {
    if (!vid) return;
    (async () => {
      const all: Refuel[] = await refuelsByVehicle(vid);
      const now = Date.now();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const costMonth = all
        .filter((r: Refuel) => new Date(r.date) >= monthStart)
        .reduce((s: number, r: Refuel) => s + r.liters * r.price_per_liter, 0);
      setMonthly(costMonth);
      const last90 = all.filter((r: Refuel) => new Date(r.date) >= new Date(now - 90 * 864e5));
      const segs = buildSegments(last90);
      const mean = (a: number[]) => (a.length ? a.reduce((x: number, y: number) => x + y, 0) / a.length : null);
      setL100(mean(segs.map((s) => s.l100)));
      setEurkm(mean(segs.map((s) => s.eurkm)));
    })();
  }, [vid]);

  const hasVehicle = name !== '—';
  const subtitle = hasVehicle
    ? 'Statistiche recenti sul tuo veicolo principale.'
    : 'Aggiungi un veicolo nel garage per iniziare.';

  return (
    <div className="page-stack">
      <header>
        <div className="page-title">Panoramica</div>
        <p className="page-subtitle">{subtitle}</p>
      </header>

      <div className="card hero-card">
        <span className="stat-card__label">Veicolo attivo</span>
        <div className="hero-card__name">{hasVehicle ? name : 'Nessun veicolo'}</div>
        <p className="hero-card__meta">
          {hasVehicle
            ? 'Continua a registrare i pieni per ottenere stime sempre più precise.'
            : 'Vai nel garage e crea il primo veicolo per iniziare a monitorare i consumi.'}
        </p>
      </div>

      <StatCard title="Spesa mese corrente" value={`€ ${monthly.toFixed(2)}`} />
      <StatCard title="Media 90 giorni" value={l100 ? `${l100.toFixed(2)} L/100km` : 'n/d'} />
      <StatCard title="€/km 90 giorni" value={eurkm ? eurkm.toFixed(3) : 'n/d'} />
    </div>
  );
}
