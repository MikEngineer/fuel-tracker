import type { ChangeEvent } from 'react';
import { exportSnapshot, importSnapshot, reloadFromDrive } from '../db';

export default function Backup(){
  async function exportJson(){
    const snapshot = await exportSnapshot();
    const payload = { ...snapshot, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuel_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e: ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await importSnapshot(data);
    alert('Import completato su Google Drive. I dati sono stati sincronizzati.');
  }

  async function refreshFromDrive(){
    const info = await reloadFromDrive();
    if (info.hasData){
      alert('Archivio aggiornato con i dati presenti su Google Drive.');
    } else if (info.created){
      alert('È stato creato un nuovo archivio su Google Drive per questo account.');
    } else {
      alert('Archivio vuoto su Google Drive: nessun dato da sincronizzare.');
    }
  }

  return (
    <div className="page-stack">
      <header>
        <div className="page-title">Backup</div>
        <p className="page-subtitle">I dati vengono sincronizzati su Google Drive in modo automatico.</p>
      </header>

      <div className="card form-stack">
        <div>
          <div className="section-heading__title">Esporta copia locale</div>
          <p className="hero-card__meta">Scarica un file JSON con veicoli e rifornimenti per un backup offline.</p>
        </div>
        <button className="btn w-full" onClick={exportJson}>Scarica JSON</button>
      </div>

      <div className="card form-stack">
        <div>
          <div className="section-heading__title">Importa da file</div>
          <p className="hero-card__meta">Sovrascrivi l'archivio su Google Drive con un file esportato in precedenza.</p>
        </div>
        <label className="btn-alt w-full">
          Seleziona file
          <input type="file" accept="application/json" className="hidden" onChange={importJson} />
        </label>
      </div>

      <div className="card form-stack">
        <div>
          <div className="section-heading__title">Ricarica da Drive</div>
          <p className="hero-card__meta">Recupera l'ultima versione salvata nel cloud nel caso di modifiche da altri dispositivi.</p>
        </div>
        <button className="btn-alt w-full" onClick={refreshFromDrive}>Aggiorna archivio</button>
      </div>
    </div>
  );
}
