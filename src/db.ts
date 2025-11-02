// import Dexie, { type Table } from 'dexie';
// import type { Vehicle, Refuel } from './types';

// class FuelDB extends Dexie {
//   vehicles!: Table<Vehicle, number>;
//   refuels!: Table<Refuel, number>;
//   constructor(){
//     super('fuel_tracker_web');
//     this.version(1).stores({
//       vehicles: '++id, name, plate, tank_capacity_l, created_at',
//       refuels:  '++id, vehicle_id, date, odometer, is_full'
//     });
//   }
// }

// export const db = new FuelDB();

// // Vehicles
// export async function vehiclesAll(){ return db.vehicles.toArray(); }
// export async function vehicleGet(id:number){ return db.vehicles.get(id); }
// export async function vehicleCreate(v: Omit<Vehicle,'id'|'created_at'>){
//   return db.vehicles.add({ ...v, created_at: new Date().toISOString() });
// }

// // Refuels
// async function lastOdo(vehicle_id:number){
//   const list = await db.refuels.where('vehicle_id').equals(vehicle_id).sortBy('odometer');
//   return list.length ? list[list.length-1].odometer : null;
// }
// export async function refuelsByVehicle(vid:number){
//   return db.refuels.where('vehicle_id').equals(vid).sortBy('date');
// }
// export async function refuelGet(id:number){ return db.refuels.get(id); }
// export async function refuelCreate(r: Omit<Refuel,'id'|'is_full'|'created_at'>){
//   const prev = await lastOdo(r.vehicle_id);
//   if (prev !== null && r.odometer < prev) throw new Error('Contachilometri decrescente');
//   return db.refuels.add({ ...r, is_full:1, created_at: new Date().toISOString() });
// }

import Dexie, { type Table } from 'dexie';
import type { Vehicle, Refuel } from './types';

const MIGRATION_EPOCH = Date.UTC(2000, 0, 1);

type MigrationModifyContext = { primaryKey: unknown };

class FuelDB extends Dexie {
  vehicles!: Table<Vehicle, number>;
  refuels!: Table<Refuel, number>;
  constructor(){
    super('fuel_tracker_web');
    this.version(1).stores({
      vehicles: '++id, name, plate, tank_capacity_l',
      refuels:  '++id, vehicle_id, date, odometer, is_full'
    });

    this.version(2)
      .stores({
        vehicles: '++id, name, plate, tank_capacity_l, created_at',
        refuels:  '++id, vehicle_id, date, odometer, is_full'
      })
      .upgrade(async (tx) => {
        const table = tx.table('vehicles');
        await table.toCollection().modify((vehicle, ctx: MigrationModifyContext) => {
          if (vehicle.created_at) return;
          const key = typeof ctx.primaryKey === 'number' ? ctx.primaryKey : Date.now();
          vehicle.created_at = new Date(MIGRATION_EPOCH + key * 1000).toISOString();
        });
      });
  }
}

export const db = new FuelDB();

// Vehicles
export async function vehiclesAll(){ return db.vehicles.toArray(); }
export async function vehicleGet(id:number){ return db.vehicles.get(id); }
export async function vehicleFirst(){
  return db.vehicles.orderBy('created_at').first();
}
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
