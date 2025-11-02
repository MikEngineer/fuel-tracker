import { useEffect, useState } from 'react';
import { vehiclesAll, refuelsByVehicle } from '../db';
import type { Refuel } from '../types';

export default function Refuels(){
  const [rows,setRows]=useState<Refuel[]>([]);
  useEffect(()=>{ (async()=>{
    const vs = await vehiclesAll();
    if(vs[0]){ setRows(await refuelsByVehicle(vs[0].id!)); }
  })(); },[]);
  return (
    <div className="space-y-2">
      <a className="btn w-full block text-center" href="/refuels/new">Aggiungi rifornimento</a>
      {rows.map(r=>(
        <div key={r.id} className="card">
          <div>{new Date(r.date).toLocaleString()}</div>
          <div className="row">
            <span>{r.odometer} km · {r.liters} L</span>
            <span>€ {(r.liters*r.price_per_liter).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
