import { useEffect, useMemo, useState } from 'react';
import { vehicleFirst, refuelsByVehicle } from '../db';
import { buildSegments } from '../logic';
import { Line } from 'react-chartjs-2';
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Filler,
  type ChartData, type ChartOptions
} from 'chart.js';
import type { Vehicle } from '../types';
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Filler);

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      backgroundColor: 'rgba(12,12,24,0.9)',
      borderColor: 'rgba(124,77,255,0.4)',
      borderWidth: 1,
      padding: 12
    }
  },
  scales: {
    x: {
      display: true,
      ticks: { color: 'rgba(236,236,247,0.55)', maxRotation: 0 },
      grid: { display: false }
    },
    y: {
      ticks: { color: 'rgba(236,236,247,0.55)' },
      grid: { color: 'rgba(124,77,255,0.12)' }
    }
  }
};

export default function Stats(){
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof refuelsByVehicle>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const v = await vehicleFirst();
      if (cancelled) return;
      if (!v){
        setVehicle(null);
        setRows([]);
        setLoading(false);
        return;
      }
      const data = await refuelsByVehicle(v.id!);
      if (cancelled) return;
      setVehicle(v);
      setRows(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo<ChartData<'line'> | null>(() => {
    if (!rows.length) return null;
    const threshold = Date.now() - 90 * 864e5;
    const segs = buildSegments(rows.filter((r) => new Date(r.date).getTime() >= threshold));
    if (!segs.length) return null;
    return {
      labels: segs.map((s) => new Date(s.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Litri per 100km',
          data: segs.map((s) => s.l100),
          borderColor: '#7C4DFF',
          borderWidth: 3,
          backgroundColor: 'rgba(124, 77, 255, 0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#FF8E3C',
          pointBorderColor: '#1B1428',
          pointBorderWidth: 2
        }
      ]
    };
  }, [rows]);

  return (
    <div className="page-stack">
      <header>
        <div className="page-title">Statistiche</div>
        <p className="page-subtitle">
          {vehicle ? `Andamento consumi per ${vehicle.name}.` : 'Crea un veicolo per visualizzare i grafici.'}
        </p>
      </header>

      {loading && <div className="card empty-state">Caricamento dati…</div>}

      {!loading && !vehicle && (
        <div className="card hero-card">
          <span className="stat-card__label">Nessun veicolo</span>
          <div className="hero-card__meta">
            Inserisci un veicolo e registra almeno due rifornimenti per ottenere le statistiche.
          </div>
        </div>
      )}

      {!loading && vehicle && !chartData && (
        <div className="card empty-state">
          Servono almeno due rifornimenti negli ultimi 90 giorni per generare il grafico.
        </div>
      )}

      {chartData && (
        <div className="card" style={{ minHeight: 320 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}
