import type { Vehicle, Refuel, FuelStore, ArchiveInfo } from './types';
import { fetchArchive, saveArchive } from './services/cloudApi';

export type { FuelStore, ArchiveInfo } from './types';

export type ArchiveListener = (info: ArchiveInfo) => void;

const createEmptyStore = (): FuelStore => ({
  version: 1,
  vehicles: [],
  refuels: []
});

let store: FuelStore = createEmptyStore();
let hasLoaded = false;
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
  if (value === undefined) return value as T;
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
    plate: typeof data.plate === 'string' ? data.plate : null,
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
    station: typeof data.station === 'string' ? data.station : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
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

function refreshArchiveInfo(next?: Partial<ArchiveInfo>){
  archiveInfo = {
    created: typeof next?.created === 'boolean' ? next.created : archiveInfo.created,
    hasData:
      typeof next?.hasData === 'boolean'
        ? next.hasData
        : store.vehicles.length > 0 || store.refuels.length > 0
  };
  notifyArchive();
}

async function ensureLoaded(){
  if (hasLoaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const { store: remote, info } = await fetchArchive();
    store = normalizeStore(remote);
    hasLoaded = true;
    refreshArchiveInfo(info);
  })();
  await loadPromise;
  loadPromise = null;
}

async function persist(){
  const info = await saveArchive(store);
  refreshArchiveInfo(info);
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
  refreshArchiveInfo();
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
  refreshArchiveInfo();
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
  refreshArchiveInfo();
  await persist();
}

export async function reloadFromDrive(){
  const { store: remote, info } = await fetchArchive();
  store = normalizeStore(remote);
  hasLoaded = true;
  refreshArchiveInfo(info);
  return getArchiveInfo();
}

export function resetCache(){
  store = createEmptyStore();
  hasLoaded = false;
  loadPromise = null;
  archiveInfo = { created: false, hasData: false };
  notifyArchive();
}
