import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';

export type RefuelFormData = {
  date: string;
  odometer: number;
  liters: number;
  price_per_liter: number;
  notes?: string;
};

export default function RefuelForm({
  onSubmit,
  initial
}:{
  onSubmit: (v: RefuelFormData) => void;
  initial?: Partial<RefuelFormData>;
}){
  const { register, handleSubmit, watch } = useForm<RefuelFormData>({
    defaultValues: {
      date: initial?.date ?? dayjs().toISOString(),
      odometer: initial?.odometer ?? undefined,
      liters: initial?.liters ?? undefined,
      price_per_liter: initial?.price_per_liter ?? undefined,
      notes: initial?.notes ?? ''
    }
  });
  const liters = Number(watch('liters') || 0);
  const price = Number(watch('price_per_liter') || 0);
  const cost = isFinite(liters * price) ? (liters * price).toFixed(2) : '0.00';

  return (
    <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
      <div className="card">
        <div className="form-stack">
          <div>
            <label className="form-label" htmlFor="refuel-date">Data ISO</label>
            <input id="refuel-date" className="input" {...register('date')} />
          </div>
          <div>
            <label className="form-label" htmlFor="refuel-odo">Contachilometri (km)</label>
            <input id="refuel-odo" className="input" type="number" step="1" {...register('odometer', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="refuel-liters">Litri</label>
            <input id="refuel-liters" className="input" type="number" step="0.01" {...register('liters', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="form-label" htmlFor="refuel-price">Prezzo/L (€)</label>
            <input id="refuel-price" className="input" type="number" step="0.001" {...register('price_per_liter', { valueAsNumber: true })} />
          </div>
          <div className="refuel-flag">
            <span className="refuel-flag__label">Pieno</span>
            <span className="pill">Sì</span>
          </div>
          <div>
            <label className="form-label" htmlFor="refuel-notes">Note (opzionali)</label>
            <textarea id="refuel-notes" className="input" rows={3} {...register('notes')} />
          </div>
        </div>
        <div className="refuel-summary">
          <span className="form-label">Costo stimato</span>
          <span className="refuel-summary__value">€ {cost}</span>
        </div>
      </div>
      <button className="btn w-full" type="submit">Salva</button>
    </form>
  );
}
