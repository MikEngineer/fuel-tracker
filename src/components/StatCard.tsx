export default function StatCard({title, value}:{title:string; value:string}){
  return (
    <div className="card">
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
