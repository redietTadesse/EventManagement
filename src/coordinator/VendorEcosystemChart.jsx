const MAX_ACTIVE_LOAD = 10;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function qualityColor(qualityScore) {
  if (qualityScore >= 4.5) return 'bg-emerald-500';
  if (qualityScore >= 3.5) return 'bg-amber-500';
  return 'bg-rose-500';
}

export default function VendorEcosystemChart({ data = [] }) {
  return <section aria-labelledby="vendor-ecosystem-title" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Vendor intelligence</p>
        <h2 id="vendor-ecosystem-title" className="mt-1 font-semibold text-slate-900">Vendor Load vs. Quality</h2>
        <p className="mt-1 text-sm text-slate-500">Illustrative demo data for vendor workload and client ratings.</p>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Max load: {MAX_ACTIVE_LOAD}</span>
    </div>

    {data.length > 0 ? <div className="mt-6 space-y-4" role="list" aria-label="Vendor load and quality">
      {data.map((vendor, index) => {
        const activeLoad = Number(vendor.activeLoad) || 0;
        const qualityScore = Number(vendor.qualityScore) || 0;
        const width = clamp(activeLoad / MAX_ACTIVE_LOAD * 100, 0, 100);
        return <div key={`${vendor.name || 'vendor'}-${index}`} role="listitem">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-700">{vendor.name || 'Unnamed vendor'}</span>
            <span className="shrink-0 text-xs tabular-nums text-slate-500">{activeLoad}/{MAX_ACTIVE_LOAD} active · {qualityScore.toFixed(1)}/5 rating</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${vendor.name || 'Vendor'} has ${activeLoad} active events and a ${qualityScore.toFixed(1)} out of 5 client rating`}>
            <div className={`h-full rounded-full transition-all duration-700 ${qualityColor(qualityScore)}`} style={{ width: `${width}%` }} />
          </div>
        </div>;
      })}
    </div> : <p className="mt-6 rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No vendor ecosystem data is available.</p>}

    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500" aria-label="Chart legend">
      <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Bar Width = Active Workload</span>
      <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Bar Color = Client Rating</span>
    </div>
  </section>;
}
