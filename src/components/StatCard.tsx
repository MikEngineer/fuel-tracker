export default function StatCard({ title, value }: { title: string; value: string }){
  return (
    <div className="card stat-card">
      <span className="stat-card__label">{title}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  );
}
