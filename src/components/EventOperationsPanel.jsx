import { ArrowRightIcon, BuildingOffice2Icon, ClipboardDocumentCheckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import StatusBadge from './StatusBadge';

const tracks = [
  ['venue', 'Venue reservation', BuildingOffice2Icon],
  ['vendors', 'Vendor commitments', UserGroupIcon],
  ['tasks', 'Preparation', ClipboardDocumentCheckIcon],
];

export default function EventOperationsPanel({ status, summary, handoff, decision, compact = false }) {
  return <section aria-label={compact ? 'Sample event operations' : 'Event operations'}
    className="overflow-hidden rounded-2xl border border-[#38605b] bg-[#142f32] text-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#efd392]">
          {compact ? 'Sample event · Coordinator view' : 'Event operations'}
        </p>
        <h2 className={compact ? 'mt-1 text-lg font-semibold' : 'mt-1 text-xl font-semibold sm:text-2xl'}>
          {decision.title}
        </h2>
        {decision.description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/85">{decision.description}</p>}
        {decision.note && <p className="mt-2 text-sm text-amber-200">{decision.note}</p>}
      </div>
      <StatusBadge status={status} showIcon />
    </div>
    <dl className={`grid gap-px border-y border-white/15 bg-white/15 ${compact ? '' : 'md:grid-cols-3'}`}>
      {tracks.map(([key, label, Icon]) => <div key={key}
        className={`min-w-0 bg-[#1a3a3c] ${compact ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-2 px-4 py-3' : 'px-5 py-4 sm:px-6'}`}>
        <dt className="flex items-center gap-2 text-xs font-medium text-emerald-100/85">
          <Icon className="h-4 w-4 shrink-0 text-[#efd392]" aria-hidden="true" />{label}
        </dt>
        <dd className={compact ? 'text-right text-sm font-semibold' : 'mt-2 text-lg font-semibold'}>
          {summary[key].value}
          {summary[key].detail && <span className="mt-0.5 block text-xs font-normal leading-relaxed text-emerald-50/80">{summary[key].detail}</span>}
        </dd>
      </div>)}
    </dl>
    {handoff && <div className={`px-5 py-4 sm:px-6 ${compact ? '' : 'sm:py-5'}`}>
      <p className="text-xs font-semibold text-[#efd392]">{handoff.service} offer history</p>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        {[handoff.previous, handoff.current].map((offer, index) => (
          <div key={index} className="contents">
            {index === 1 && <ArrowRightIcon className="h-4 w-4 text-emerald-100/70" aria-hidden="true" />}
            <div className="min-w-0 rounded-lg border border-white/15 bg-white/5 p-2.5 sm:p-3">
              <p className="text-xs text-emerald-50/80">{index === 0 ? 'Previous offer' : 'Current offer'}</p>
              <p className="my-1.5 break-words text-sm font-semibold">{offer.vendorName || 'Vendor'}</p>
              <StatusBadge status={offer.status} />
            </div>
          </div>
        ))}
      </div>
    </div>}
    {decision.action && <div className="flex flex-wrap gap-4 border-t border-white/15 px-5 py-4 sm:px-6">
      <button type="button" disabled={decision.disabled} onClick={decision.onClick}
        className="inline-flex items-center gap-2 rounded-lg bg-[#efd392] px-4 py-2.5 text-sm font-semibold text-[#142f32] hover:bg-[#ffe5ad] disabled:opacity-60">
        {decision.action} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {handoff?.onHistory && <button type="button" onClick={handoff.onHistory} className="text-sm font-semibold text-emerald-100 hover:underline">View {handoff.service} history</button>}
    </div>}
  </section>;
}
