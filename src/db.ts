import Dexie, { type Table } from 'dexie';
import type { Vehicle, Refuel } from './types';

class FuelDB extends Dexie {
  vehicles!: Table<Vehicle, number>;
  refuels!: Table<Refuel, number>;
  constructor(){
    super('fuel_tracker_web');
    this.version(1).stores({
      vehicles: '++id, name, plate, tank_capacity_l, created_at',
      refuels:  '++id, vehicle_id, date, odometer, is_full'
    });
  }
}

export const db = new FuelDB();

// Vehicles
export async function vehiclesAll(){ return db.vehicles.toArray(); }
export async function vehicleGet(id:number){ return db.vehicles.get(id); }
export async function vehicleCreate(v: Omit<Vehicle,'id'|'created_at'>){
  return db.vehicles.add({ ...v, created_at: new Date().toISOString() });
}

// Refuels
async function lastOdo(vehicle_id:number){
  const list = await db.refuels.where('vehicle_id').equals(vehicle_id).sortBy('odometer');
  return list.length ? list[list.length-1].odometer : null;
}
export async function refuelsByVehicle(vid:number){
  return db.refuels.where('vehicle_id').equals(vid).sortBy('date');
}
export async function refuelGet(id:number){ return db.refuels.get(id); }
export async function refuelCreate(r: Omit<Refuel,'id'|'is_full'|'created_at'>){
  const prev = await lastOdo(r.vehicle_id);
  if (prev !== null && r.odometer < prev) throw new Error('Contachilometri decrescente');
  return db.refuels.add({ ...r, is_full:1, created_at: new Date().toISOString() });
}
