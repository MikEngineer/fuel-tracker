import { useEffect, useState } from 'react';
import { vehiclesAll, refuelCreate } from '../db';
import RefuelForm from '../components/RefuelForm';

export default function NewRefuel(){
  const [vid,setVid]=useState<number|undefined>();
  useEffect(()=>{ (async()=>{ const vs=await vehiclesAll(); if(vs[0]) setVid(vs[0].id); })(); },[]);
  if(!vid) return <div className="card">Crea prima un veicolo</div>;

  return (
    <div className="space-y-3">
      <RefuelForm onSubmit={async (f)=>{
        await refuelCreate({ vehicle_id: vid, ...f, station:null });
        location.href = '/refuels';
      }} />
    </div>
  );
}
