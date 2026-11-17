const colorMap = {
  navy: 'bg-indigo-50 text-indigo-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
};

export default function StatCard({ label, value, icon, color = 'navy', detail }) {
  return <div className="stat-card h-full">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      {icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5 ${colorMap[color] || colorMap.navy}`}>{icon}</span>}
    </div>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
    {detail && <p className="mt-2 text-xs leading-relaxed text-slate-500">{detail}</p>}
  </div>;
}
