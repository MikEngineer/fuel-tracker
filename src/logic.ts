export function cost(l:number, p:number){ return l*p; }
export function lPer100km(l:number, km:number){ if(km<=0) return null; return (l*100)/km; }
export function kmPerL(l:number, km:number){ if(l<=0) return null; return km/l; }
export function eurPerKm(eur:number, km:number){ if(km<=0) return null; return eur/km; }

import type { Refuel, Segment } from './types';

// Deriva segmenti tra pieni consecutivi (ordinati per odometro)
export function buildSegments(rows: Refuel[]): Segment[] {
  const sorted = [...rows].sort((a,b)=>a.odometer-b.odometer);
  const segs: Segment[] = [];
  for(let i=1;i<sorted.length;i++){
    const prev = sorted[i-1], cur = sorted[i];
    const km = cur.odometer - prev.odometer;
    const l = cur.liters;
    const eur = l * cur.price_per_liter;
    if (km>0 && l>0){
      segs.push({
        date: cur.date,
        km,
        liters: l,
        l100: (l*100)/km,
        kml: km/l,
        eurkm: eur/km
      });
    }
  }
  return segs;
}
