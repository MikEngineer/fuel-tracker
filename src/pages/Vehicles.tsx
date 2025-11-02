import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { vehiclesAll, vehicleCreate } from '../db';
import type { Vehicle } from '../types';

export default function Vehicles(){
  const [list,setList]=useState<Vehicle[]>([]);
  const [name,setName]=useState('');
  const [plate,setPlate]=useState('');
  const [cap,setCap]=useState('');

  async function load(){ setList(await vehiclesAll()); }
  useEffect(()=>{ load(); },[]);

  async function onSubmit(e:FormEvent){
    e.preventDefault();
    await vehicleCreate({ name, plate: plate||null, tank_capacity_l: cap? Number(cap): null });
    setName(''); setPlate(''); setCap(''); load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="card space-y-2">
        <div className="text-lg font-semibold">Nuovo veicolo</div>
        <input className="input" placeholder="Nome" value={name} onChange={e=>setName(e.target.value)}/>
        <input className="input" placeholder="Targa (opz.)" value={plate} onChange={e=>setPlate(e.target.value)}/>
        <input className="input" placeholder="Capienza serbatoio (L)" value={cap} onChange={e=>setCap(e.target.value)} />
        <button className="btn w-full" disabled={!name}>Salva</button>
      </form>

      <div className="space-y-2">
        {list.map(v=>(
          <div key={v.id} className="card">
            <div className="font-semibold">{v.name} {v.plate? `(${v.plate})`:''}</div>
            <div className="opacity-80">Capienza: {v.tank_capacity_l ?? 'n/d'} L</div>
          </div>
        ))}
      </div>
    </div>
  );
}
