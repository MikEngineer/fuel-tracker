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

// ________________________________________________________________________________________________________

// import Dexie, { type Table } from 'dexie';
// import type { Vehicle, Refuel } from './types';

// const MIGRATION_EPOCH = Date.UTC(2000, 0, 1);

// type MigrationModifyContext = { primaryKey: unknown };

// class FuelDB extends Dexie {
//   vehicles!: Table<Vehicle, number>;
//   refuels!: Table<Refuel, number>;
//   constructor(){
//     super('fuel_tracker_web');
//     this.version(1).stores({
//       vehicles: '++id, name, plate, tank_capacity_l',
//       refuels:  '++id, vehicle_id, date, odometer, is_full'
//     });

//     this.version(2)
//       .stores({
//         vehicles: '++id, name, plate, tank_capacity_l, created_at',
//         refuels:  '++id, vehicle_id, date, odometer, is_full'
//       })
//       .upgrade(async (tx) => {
//         const table = tx.table('vehicles');
//         await table.toCollection().modify((vehicle, ctx: MigrationModifyContext) => {
//           if (vehicle.created_at) return;
//           const key = typeof ctx.primaryKey === 'number' ? ctx.primaryKey : Date.now();
//           vehicle.created_at = new Date(MIGRATION_EPOCH + key * 1000).toISOString();
//         });
//       });
//   }
// }

// export const db = new FuelDB();

// // Vehicles
// export async function vehiclesAll(){ return db.vehicles.toArray(); }
// export async function vehicleGet(id:number){ return db.vehicles.get(id); }
// export async function vehicleFirst(){
//   return db.vehicles.orderBy('created_at').first();
// }
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

// __________________________________________________________________________________________________

import type { Vehicle, Refuel } from './types';
import { loadFuelData, saveFuelData } from './services/googleDrive';

export type FuelStore = {
  version: number;
  vehicles: Vehicle[];
  refuels: Refuel[];
};

export type ArchiveInfo = {
  created: boolean;
  hasData: boolean;
};

type ArchiveListener = (info: ArchiveInfo) => void;

const createEmptyStore = (): FuelStore => ({
  version: 1,
  vehicles: [],
  refuels: []
});

let store: FuelStore = createEmptyStore();
let fileId: string | null = null;
let loadPromise: Promise<void> | null = null;
let archiveInfo: ArchiveInfo = { created: false, hasData: false };
const archiveListeners = new Set<ArchiveListener>();

function notifyArchive(){
  const snapshot = { ...archiveInfo };
  archiveListeners.forEach((listener) => listener(snapshot));
}

export function subscribeArchive(listener: ArchiveListener){
  archiveListeners.add(listener);
  listener({ ...archiveInfo });
  return () => {
    archiveListeners.delete(listener);
  };
}

export function getArchiveInfo(){
  return { ...archiveInfo };
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeVehicle(raw: unknown): Vehicle | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<Vehicle>;
  const name = typeof data.name === 'string' && data.name.trim() ? data.name : null;
  const created = typeof data.created_at === 'string' ? data.created_at : new Date().toISOString();
  return {
    id: typeof data.id === 'number' ? data.id : undefined,
    name: name ?? 'Veicolo senza nome',
    plate: data.plate ?? null,
    tank_capacity_l: typeof data.tank_capacity_l === 'number' ? data.tank_capacity_l : null,
    created_at: created
  };
}

function normalizeRefuel(raw: unknown): Refuel | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<Refuel>;
  const vehicleId = typeof data.vehicle_id === 'number' ? data.vehicle_id : Number(data.vehicle_id);
  const odometer = typeof data.odometer === 'number' ? data.odometer : Number(data.odometer);
  const liters = typeof data.liters === 'number' ? data.liters : Number(data.liters);
  const price = typeof data.price_per_liter === 'number' ? data.price_per_liter : Number(data.price_per_liter);
  const date = typeof data.date === 'string' ? data.date : null;
  if (!Number.isFinite(vehicleId) || !Number.isFinite(odometer) || !Number.isFinite(liters) || !Number.isFinite(price) || !date){
    return null;
  }
  const created = typeof data.created_at === 'string' ? data.created_at : new Date().toISOString();
  return {
    id: typeof data.id === 'number' ? data.id : undefined,
    vehicle_id: vehicleId,
    date,
    odometer,
    liters,
    price_per_liter: price,
    is_full: 1,
    station: data.station ?? null,
    notes: data.notes ?? null,
    created_at: created
  };
}

function normalizeStore(payload: unknown): FuelStore {
  if (!payload || typeof payload !== 'object') return createEmptyStore();
  const data = payload as Partial<FuelStore>;
  const vehicles = Array.isArray(data.vehicles)
    ? data.vehicles.map(normalizeVehicle).filter((v): v is Vehicle => v !== null)
    : [];
  const refuels = Array.isArray(data.refuels)
    ? data.refuels.map(normalizeRefuel).filter((r): r is Refuel => r !== null)
    : [];
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    vehicles,
    refuels
  };
}

function updateArchiveInfo(created?: boolean){
  if (typeof created === 'boolean'){
    archiveInfo.created = created;
  }
  archiveInfo.hasData = store.vehicles.length > 0 || store.refuels.length > 0;
  notifyArchive();
}

async function ensureLoaded(){
  if (fileId) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const empty = createEmptyStore();
    const { id, data, created } = await loadFuelData(empty);
    fileId = id;
    store = normalizeStore(data);
    updateArchiveInfo(created);
  })();
  await loadPromise;
  loadPromise = null;
}

async function ensureFileId(){
  if (fileId) return;
  await ensureLoaded();
}

async function persist(){
  await ensureFileId();
  if (!fileId) throw new Error('File di archivio Google Drive non pronto.');
  await saveFuelData(fileId, store);
}

function nextVehicleId(){
  const maxId = store.vehicles.reduce((max, v) => Math.max(max, v.id ?? 0), 0);
  return maxId + 1 || 1;
}

function nextRefuelId(){
  const maxId = store.refuels.reduce((max, r) => Math.max(max, r.id ?? 0), 0);
  return maxId + 1 || 1;
}

export async function vehiclesAll(){
  await ensureLoaded();
  const sorted = [...store.vehicles].sort((a, b) => {
    const da = new Date(a.created_at ?? '').getTime();
    const db = new Date(b.created_at ?? '').getTime();
    return da - db;
  });
  return clone(sorted);
}

export async function vehicleGet(id: number){
  await ensureLoaded();
  const found = store.vehicles.find((v) => v.id === id);
  return found ? clone(found) : undefined;
}

export async function vehicleFirst(){
  const all = await vehiclesAll();
  return all[0];
}

export async function vehicleCreate(v: Omit<Vehicle, 'id' | 'created_at'>){
  await ensureLoaded();
  const now = new Date().toISOString();
  const vehicle: Vehicle = {
    id: nextVehicleId(),
    name: v.name,
    plate: v.plate ?? null,
    tank_capacity_l: typeof v.tank_capacity_l === 'number' ? v.tank_capacity_l : null,
    created_at: now
  };
  store.vehicles.push(vehicle);
  updateArchiveInfo();
  await persist();
  return vehicle.id!;
}

function lastOdo(vehicle_id: number){
  const entries = store.refuels.filter((r) => r.vehicle_id === vehicle_id);
  if (!entries.length) return null;
  return entries.reduce((max, cur) => (cur.odometer > max ? cur.odometer : max), entries[0].odometer);
}

export async function refuelsByVehicle(vid: number){
  await ensureLoaded();
  const rows = store.refuels.filter((r) => r.vehicle_id === vid);
  const sorted = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return clone(sorted);
}

export async function refuelGet(id: number){
  await ensureLoaded();
  const found = store.refuels.find((r) => r.id === id);
  return found ? clone(found) : undefined;
}

export async function refuelCreate(r: Omit<Refuel, 'id' | 'is_full' | 'created_at'>){
  await ensureLoaded();
  const prev = lastOdo(r.vehicle_id);
  if (prev !== null && r.odometer < prev){
    throw new Error('Contachilometri decrescente');
  }
  const refuel: Refuel = {
    id: nextRefuelId(),
    vehicle_id: r.vehicle_id,
    date: r.date,
    odometer: r.odometer,
    liters: r.liters,
    price_per_liter: r.price_per_liter,
    station: r.station ?? null,
    notes: r.notes ?? null,
    is_full: 1,
    created_at: new Date().toISOString()
  };
  store.refuels.push(refuel);
  updateArchiveInfo();
  await persist();
  return refuel.id!;
}

export async function exportSnapshot(){
  await ensureLoaded();
  return clone(store);
}

export async function importSnapshot(snapshot: FuelStore){
  await ensureLoaded();
  store = normalizeStore(snapshot);
  updateArchiveInfo();
  await persist();
}

export async function reloadFromDrive(){
  fileId = null;
  store = createEmptyStore();
  await ensureLoaded();
  return getArchiveInfo();
}

export function resetCache(){
  fileId = null;
  store = createEmptyStore();
  loadPromise = null;
  archiveInfo = { created: false, hasData: false };
  notifyArchive();
}
