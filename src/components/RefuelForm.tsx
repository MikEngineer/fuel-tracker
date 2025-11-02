import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';

type F = {
  date: string;
  odometer: number;
  liters: number;
  price_per_liter: number;
  notes?: string;
};

export default function RefuelForm({onSubmit, initial}:{onSubmit:(v:F)=>void; initial?:Partial<F>}){
  const { register, handleSubmit, watch } = useForm<F>({
    defaultValues: {
      date: initial?.date ?? dayjs().toISOString(),
      odometer: initial?.odometer ?? undefined,
      liters: initial?.liters ?? undefined,
      price_per_liter: initial?.price_per_liter ?? undefined,
      notes: initial?.notes ?? ''
    }
  });
  const l = Number(watch('liters')||0);
  const p = Number(watch('price_per_liter')||0);
  const cost = isFinite(l*p) ? (l*p).toFixed(2) : '0.00';

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="card space-y-2">
        <label className="block text-sm">Data ISO</label>
        <input className="input" {...register('date')}/>
        <label className="block text-sm">Contachilometri (km)</label>
        <input className="input" type="number" step="1" {...register('odometer',{valueAsNumber:true})}/>
        <label className="block text-sm">Litri</label>
        <input className="input" type="number" step="0.01" {...register('liters',{valueAsNumber:true})}/>
        <label className="block text-sm">Prezzo/L (€)</label>
        <input className="input" type="number" step="0.001" {...register('price_per_liter',{valueAsNumber:true})}/>
        <div className="text-sm opacity-80">Pieno: <span className="text-primary font-semibold">sì</span></div>
        <label className="block text-sm">Note (opz.)</label>
        <textarea className="input" rows={2} {...register('notes')}/>
        <div className="row"><div className="opacity-80">Costo stimato</div><div className="font-semibold">€ {cost}</div></div>
      </div>
      <button className="btn w-full" type="submit">Salva</button>
    </form>
  );
}
