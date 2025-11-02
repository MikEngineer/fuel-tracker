import { db } from '../db';

export default function Backup(){
  async function exportJson(){
    const vehicles = await db.vehicles.toArray();
    const refuels = await db.refuels.toArray();
    const payload = { vehicles, refuels, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuel_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e: React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const data = JSON.parse(text);
    if (Array.isArray(data.vehicles)) await db.vehicles.bulkPut(data.vehicles);
    if (Array.isArray(data.refuels)) await db.refuels.bulkPut(data.refuels);
    alert('Import completato');
  }

  return (
    <div className="page-stack">
      <header>
        <div className="page-title">Backup</div>
        <p className="page-subtitle">Esporta o importa i tuoi dati in formato JSON.</p>
      </header>

      <div className="card form-stack">
        <div>
          <div className="section-heading__title">Esporta dati</div>
          <p className="hero-card__meta">Scarica un file con veicoli e rifornimenti.</p>
        </div>
        <button className="btn w-full" onClick={exportJson}>Scarica JSON</button>
      </div>

      <div className="card form-stack">
        <div>
          <div className="section-heading__title">Importa dati</div>
          <p className="hero-card__meta">Seleziona un file JSON generato dall'app.</p>
        </div>
        <label className="btn-alt w-full">
          Seleziona file
          <input type="file" accept="application/json" className="hidden" onChange={importJson} />
        </label>
      </div>
    </div>
  );
}
