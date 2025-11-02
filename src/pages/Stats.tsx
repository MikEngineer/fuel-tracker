// import { useEffect, useState } from 'react';
// import { vehiclesAll, refuelsByVehicle } from '../db';
// import { buildSegments } from '../logic';
// import { Line } from 'react-chartjs-2';
// import {
//   Chart, LineElement, PointElement, LinearScale, CategoryScale, Filler,
//   type ChartData
// } from 'chart.js';
// Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler);

// export default function Stats(){
//   const [data,setData]=useState<ChartData<'line'> | null>(null);

//   useEffect(()=>{ (async()=>{
//     const vs = await vehiclesAll(); if(!vs[0]) return;
//     const rows = await refuelsByVehicle(vs[0].id!);
//     const last90 = rows.filter(r=> new Date(r.date) >= new Date(Date.now()-90*864e5));
//     const segs = buildSegments(last90);
//     setData({
//       labels: segs.map(s=> new Date(s.date).toLocaleDateString()),
//       datasets: [{ label: 'L/100km', data: segs.map(s=> s.l100), fill: true }]
//     });
//   })(); },[]);

//   if(!data) return <div className="card">Nessun dato</div>;
//   return (
//     <div className="card">
//       <Line data={data} options={{ plugins:{legend:{display:false}}, scales:{x:{display:false}} }} />
//     </div>
//   );
// }

import { useEffect, useState } from 'react';
import { vehicleFirst, refuelsByVehicle } from '../db';
import { buildSegments } from '../logic';
import { Line } from 'react-chartjs-2';
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Filler,
  type ChartData
} from 'chart.js';
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler);

export default function Stats(){
  const [data,setData]=useState<ChartData<'line'> | null>(null);

  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      const vehicle = await vehicleFirst();
      const vehicleId = vehicle?.id;
      if(vehicleId == null) return;
      const rows = await refuelsByVehicle(vehicleId);
      const threshold = Date.now() - 90*864e5;
      const segs = buildSegments(rows.filter(r=> new Date(r.date).getTime() >= threshold));
      if(cancelled) return;
      setData({
        labels: segs.map(s=> new Date(s.date).toLocaleDateString()),
        datasets: [{ label: 'L/100km', data: segs.map(s=> s.l100), fill: true }]
      });
    })();
    return ()=>{ cancelled = true; };
  },[]);

  if(!data) return <div className="card">Nessun dato</div>;
  return (
    <div className="card">
      <Line data={data} options={{ plugins:{legend:{display:false}}, scales:{x:{display:false}} }} />
    </div>
  );
}
