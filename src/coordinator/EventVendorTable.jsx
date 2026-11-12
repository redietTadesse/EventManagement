import { useEffect, useRef, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { parseSelection, serviceLabel } from './eventDetailModel';

const percent = value => value == null ? '—' : `${Math.round(value * 10) / 10}%`;
const scoreWidth = value => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

function ScoreBar({ label, subtitle, value, color }) {
  return <div className="space-y-1">
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="text-xs font-semibold text-slate-600">{percent(value)}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" aria-label={`${label} score`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${scoreWidth(value)}%` }} />
    </div>
    <p className="text-[11px] text-slate-500">{subtitle}</p>
  </div>;
}

function ServiceRow({ row, alternatives, excluded, loading, error, highlighted, reviewVersion, canAssign, feedback, onAssign, onHistory }) {
  const [reviewing, setReviewing] = useState(highlighted);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const container = useRef(null);
  const { current } = row;
  const previous = row.attempts.slice(0, -1).reverse()
    .find(attempt => ['DECLINED', 'EXPIRED'].includes(attempt.status));
  const { snapshot, selected } = parseSelection(current);
  const assignable = canAssign && row.state === 'exhausted';

  useEffect(() => {
    if (highlighted) {
      setReviewing(true);
      container.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlighted, reviewVersion]);

  return (
    <div ref={container} className="border-t border-slate-200 first:border-t-0">
      <div className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_1.2fr_1fr_1.2fr_1.2fr] md:items-start md:px-5">
        <div><p className="text-xs text-slate-500 md:hidden">Required service</p><p className="font-semibold capitalize text-slate-900">{serviceLabel(row.category)}</p></div>
        <div><p className="text-xs text-slate-500 md:hidden">Current vendor</p><p className="text-sm text-slate-800">{current?.vendorName || (current?.status === 'OPEN' ? 'Open vendor pool' : 'Not assigned')}</p>
          {current?.vendorId && <div className="mt-2 text-xs">
            <button type="button" aria-expanded={evidenceOpen} onClick={() => setEvidenceOpen(value => !value)} className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5"><path d="m13.5 13.5 4 4M8.75 14.5a5.75 5.75 0 1 0 0-11.5 5.75 5.75 0 0 0 0 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              Why selected?
            </button>
            {evidenceOpen && <div className="mt-2 space-y-2 rounded-lg border border-indigo-100 bg-slate-50 p-3 text-slate-600">
              <div className="rounded-md bg-indigo-50 p-2.5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">Decision reasoning</p>
                <p>{snapshot?.reasoning || (snapshot?.selectionReason ? serviceLabel(snapshot.selectionReason) : 'No selection reason was recorded for this offer.')}</p>
              </div>
              {snapshot?.eventDate && <p>Recorded for {snapshot.eventDate}.</p>}
              {selected?.score != null ? <><p className="font-semibold text-slate-800">Selection score: {percent(selected.score)}</p><p className="text-[11px] text-slate-500">Weights: Quality 50% · Load 40% · Rotation 10%</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <ScoreBar label="Quality" subtitle="Client reviews" value={selected.qualityScore} color="bg-indigo-500" />
                  <ScoreBar label="Load" subtitle="Current active events" value={selected.workloadScore} color="bg-amber-500" />
                  <ScoreBar label="Rotation" subtitle="Fair vendor rotation" value={selected.rotationScore} color="bg-sky-500" />
                </div>
              </> : <p>A ranking score is not recorded for this selection.</p>}
              {snapshot?.actor?.username && <div className="rounded-md bg-amber-50 p-2.5 text-amber-900"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Recorded actor</p><p>Assigned by {snapshot.actor.username}.</p></div>}
            </div>}
          </div>}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500 md:hidden">Offer status</p>
          {current ? <StatusBadge status={current.status} /> : <span className="text-sm text-rose-700">No offer</span>}
          {row.backupLabel && <p className="text-xs font-semibold text-indigo-700">{row.backupLabel} · Awaiting response</p>}
          {row.state === 'exhausted' && <p className="text-xs font-medium text-rose-800">Needs coordinator action · {row.reason}.</p>}
          {previous && <p className="text-xs text-slate-600">Previous offer: {previous.vendorName || 'Vendor'} · {previous.status.toLowerCase()}</p>}
        </div>
        <div className="text-sm text-slate-600"><p className="text-xs text-slate-500 md:hidden">Response deadline</p>
          {current?.status === 'PENDING' ? current.expiresAt ? <><time dateTime={current.expiresAt}>{new Date(current.expiresAt).toLocaleString()}</time>{new Date(current.expiresAt) < new Date() && <p className="mt-1 text-xs text-amber-700">Deadline passed; refresh for the latest outcome.</p>}</> : 'No deadline recorded' : '—'}
        </div>
        <div className="space-y-2 text-sm">
          <button type="button" onClick={() => setReviewing(value => !value)} aria-expanded={reviewing} className="font-medium text-indigo-700 hover:underline">{reviewing ? 'Hide alternatives' : 'Review alternatives'}</button>
          {row.state === 'pending' && canAssign && <p className="text-xs text-amber-800">{row.manual ? 'Coordinator follow-up offer' : 'Automatic follow-up after decline or expiry'}</p>}
          {row.attempts.length > 1 && <button type="button" onClick={() => onHistory(row.category)} className="block text-xs text-slate-600 underline">{row.attempts.length - 1} previous {row.attempts.length === 2 ? 'attempt' : 'attempts'}</button>}
          {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`text-xs ${feedback.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{feedback.message}</p>}
        </div>
      </div>
      {reviewing && <div className="mx-4 mb-4 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 md:mx-5">
        <p className="text-xs text-slate-600">Current eligibility for this event. These results can differ from the recorded selection decision.</p>
        {loading && <p role="status" className="text-sm text-slate-500">Checking vendor eligibility…</p>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {!loading && !error && alternatives.length === 0 && <p className="text-sm text-slate-700">No eligible alternative is currently available. Follow up with procurement about approved vendors.</p>}
        {alternatives.map(vendor => <div key={vendor.vendorId || vendor.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-slate-900">#{vendor.rank} {vendor.companyName}</p>
            <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Match</p><p className="text-2xl font-bold leading-none text-indigo-700">{percent(vendor.score)}</p></div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ScoreBar label="Quality" subtitle="Client reviews" value={vendor.qualityScore} color="bg-indigo-500" />
            <ScoreBar label="Load" subtitle="Current active events" value={vendor.workloadScore} color="bg-amber-500" />
            <ScoreBar label="Rotation" subtitle="Fair vendor rotation" value={vendor.rotationScore} color="bg-sky-500" />
          </div>
          <p className="mt-1 text-xs text-emerald-700">{vendor.eligibilityExplanation}</p>
        </div>)}
        {excluded.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-semibold text-rose-800">{excluded.length} excluded {excluded.length === 1 ? 'vendor' : 'vendors'} and reasons</summary><ul className="mt-2 space-y-2">{excluded.map((vendor, index) => <li key={vendor.vendorId || index}><span className="font-medium">{vendor.companyName}</span> — {vendor.reason}</li>)}</ul></details>}
        {assignable && <button type="button" disabled={loading || Boolean(error) || !alternatives.length} onClick={() => onAssign(row)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Assign vendor</button>}
      </div>}
    </div>
  );
}

export default function EventVendorTable({ rows, alternatives, excluded, loading, errors, highlightedCategory, reviewVersion, canAssign, feedbackByCategory, onAssign, onHistory }) {
  if (!rows.length) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No external vendor services are required.</p>;
  return <section aria-label="Required vendor services" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="hidden grid-cols-[1fr_1.2fr_1fr_1.2fr_1.2fr] gap-3 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-500 md:grid">{['Required service', 'Current vendor', 'Offer status', 'Response deadline', 'Action'].map(label => <span key={label}>{label}</span>)}</div>
    {rows.map(row => <ServiceRow key={row.category} row={row} alternatives={alternatives[row.category] || []} excluded={excluded[row.category] || []} loading={Boolean(loading[row.category])} error={errors[row.category]} highlighted={highlightedCategory === row.category} reviewVersion={reviewVersion} canAssign={canAssign} feedback={feedbackByCategory[row.category]} onAssign={onAssign} onHistory={onHistory} />)}
  </section>;
}
