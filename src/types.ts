export type Vehicle = {
  id?: number;
  name: string;
  plate?: string | null;
  tank_capacity_l?: number | null; // capienza serbatoio
  created_at?: string;
};

export type Refuel = {
  id?: number;
  vehicle_id: number;
  date: string;            // ISO
  odometer: number;        // km attuali
  liters: number;          // litri
  price_per_liter: number; // €/L
  is_full: 1;              // pieno obbligatorio
  station?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type Segment = {
  date: string;
  km: number;
  liters: number;
  l100: number;
  kml: number;
  eurkm: number;
};

export type FuelStore = {
  version: number;
  vehicles: Vehicle[];
  refuels: Refuel[];
};

export type ArchiveInfo = {
  created: boolean;
  hasData: boolean;
};
