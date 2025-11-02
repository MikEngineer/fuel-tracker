import { useEffect, useState } from 'react';
import { vehiclesAll, refuelsByVehicle } from '../db';
import StatCard from '../components/StatCard';
import { buildSegments } from '../logic';
import type { Refuel } from '../types';

export default function Home(){
  const [vid,setVid]=useState<number|undefined>();
  const [name,setName]=useState<string>('—');
  const [monthly,setMonthly]=useState(0);
  const [l100,setL100]=useState<number|null>(null);
  const [eurkm,setEurkm]=useState<number|null>(null);

  useEffect(()=>{ (async()=>{
    const vs = await vehiclesAll();
    if(vs.length){ setVid(vs[0].id); setName(vs[0].name); }
  })(); },[]);

  useEffect(()=>{ if(!vid) return; (async()=>{
    const all:Refuel[] = await refuelsByVehicle(vid);
    const now = Date.now();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const costMonth = all.filter((r:Refuel)=> new Date(r.date)>=monthStart)
                         .reduce((s:number,r:Refuel)=>s+r.liters*r.price_per_liter,0);
    setMonthly(costMonth);
    const last90 = all.filter((r:Refuel)=> new Date(r.date) >= new Date(now-90*864e5));
    const segs = buildSegments(last90);
    const mean = (a:number[])=> a.length? a.reduce((x:number,y:number)=>x+y,0)/a.length : null;
    setL100(mean(segs.map(s=>s.l100)));
    setEurkm(mean(segs.map(s=>s.eurkm)));
  })(); },[vid]);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-sm opacity-80">Veicolo attivo</div>
        <div className="text-xl">{name}</div>
      </div>
      <StatCard title="Spesa mese" value={`€ ${monthly.toFixed(2)}`} />
      <StatCard title="Media 90 giorni" value={l100? `${l100.toFixed(2)} L/100km` : 'n/d'} />
      <StatCard title="€/km 90 giorni" value={eurkm? eurkm.toFixed(3) : 'n/d'} />
    </div>
  );
}
