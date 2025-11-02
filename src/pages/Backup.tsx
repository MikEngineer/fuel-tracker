import { db } from '../db';

export default function Backup(){
  async function exportJson(){
    const vehicles = await db.vehicles.toArray();
    const refuels = await db.refuels.toArray();
    const payload = { vehicles, refuels, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fuel_backup_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  async function importJson(e: React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files?.[0]; if(!f) return;
    const text = await f.text();
    const data = JSON.parse(text);
    if(Array.isArray(data.vehicles)) await db.vehicles.bulkPut(data.vehicles);
    if(Array.isArray(data.refuels)) await db.refuels.bulkPut(data.refuels);
    alert('Import completato');
  }
  return (
    <div className="space-y-3">
      <button className="btn w-full" onClick={exportJson}>Esporta JSON</button>
      <label className="btn-alt w-full block text-center">
        Importa JSON
        <input type="file" accept="application/json" className="hidden" onChange={importJson}/>
      </label>
    </div>
  );
}
