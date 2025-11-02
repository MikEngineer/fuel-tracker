import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { vehiclesAll, vehicleCreate } from '../db';
import type { Vehicle } from '../types';

export default function Vehicles(){
  const [list, setList] = useState<Vehicle[]>([]);
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [cap, setCap] = useState('');

  async function load(){
    setList(await vehiclesAll());
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent){
    e.preventDefault();
    if (!name.trim()) return;
    await vehicleCreate({ name: name.trim(), plate: plate || null, tank_capacity_l: cap ? Number(cap) : null });
    setName('');
    setPlate('');
    setCap('');
    load();
  }

  return (
    <div className="page-stack">
      <header>
        <div className="page-title">Garage</div>
        <p className="page-subtitle">Gestisci i veicoli tracciati dall'app.</p>
      </header>

      <form onSubmit={onSubmit} className="card form-stack">
        <div>
          <label className="form-label" htmlFor="vehicle-name">Nome veicolo</label>
          <input id="vehicle-name" className="input" placeholder="Es. Panda GPL" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="vehicle-plate">Targa (opzionale)</label>
          <input id="vehicle-plate" className="input" placeholder="AB123CD" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="form-label" htmlFor="vehicle-capacity">Capienza serbatoio (L)</label>
          <input id="vehicle-capacity" className="input" placeholder="45" value={cap} onChange={(e) => setCap(e.target.value)} />
        </div>
        <button className="btn w-full" disabled={!name.trim()}>Salva veicolo</button>
      </form>

      <div className="section-heading">
        <h2 className="section-heading__title">Veicoli salvati</h2>
        <span className="section-heading__meta">
          {list.length ? `${list.length} ${list.length === 1 ? 'veicolo' : 'veicoli'}` : 'Nessuno'}
        </span>
      </div>
      <div className="page-stack">
        {list.length === 0 && (
          <div className="card empty-state">Non hai ancora inserito alcun veicolo.</div>
        )}
        {list.map((v) => (
          <div key={v.id} className="card vehicle-card">
            <div className="section-heading__title">{v.name}</div>
            <div className="vehicle-card__meta">
              <span>{v.plate || 'Targa non disponibile'}</span>
              <span>Capienza: {v.tank_capacity_l ?? 'n/d'} L</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
