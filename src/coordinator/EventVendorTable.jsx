import { useEffect, useRef, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { parseSelection, serviceLabel } from './eventDetailModel';

const percent = value => value == null ? '—' : `${Math.round(value * 10) / 10}%`;

function ServiceRow({ row, alternatives, excluded, loading, error, highlighted, reviewVersion, canAssign, feedback, onAssign, onHistory }) {
  const [reviewing, setReviewing] = useState(highlighted);
  const container = useRef(null);
  const { current } = row;
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
          {current?.vendorId && <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium text-indigo-700">Why selected?</summary>
            <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 text-slate-600">
              <p>{snapshot?.reasoning || (snapshot?.selectionReason ? serviceLabel(snapshot.selectionReason) : 'No selection reason was recorded for this offer.')}</p>
              {snapshot?.eventDate && <p>Recorded for {snapshot.eventDate}.</p>}
              {selected?.score != null ? <><p className="font-semibold text-slate-800">Selection score: {percent(selected.score)}</p><p>Weights: quality 50% · load 40% · rotation 10%.</p>
                <p>Scores: quality {percent(selected.qualityScore)} · load {percent(selected.workloadScore)} · rotation {percent(selected.rotationScore)}.</p>
                {(selected.qualityContribution != null || selected.workloadContribution != null || selected.rotationContribution != null) && <p>Weighted contributions: {selected.qualityContribution ?? '—'} + {selected.workloadContribution ?? '—'} + {selected.rotationContribution ?? '—'} percentage points.</p>}
              </> : <p>A ranking score is not recorded for this selection.</p>}
              {snapshot?.actor?.username && <p>Assigned by {snapshot.actor.username}.</p>}
            </div>
          </details>}
        </div>
        <div><p className="text-xs text-slate-500 md:hidden">Offer status</p>{current ? <StatusBadge status={current.status} /> : <span className="text-sm text-rose-700">No offer</span>}</div>
        <div className="text-sm text-slate-600"><p className="text-xs text-slate-500 md:hidden">Response deadline</p>
          {current?.status === 'PENDING' ? current.expiresAt ? <><time dateTime={current.expiresAt}>{new Date(current.expiresAt).toLocaleString()}</time>{new Date(current.expiresAt) < new Date() && <p className="mt-1 text-xs text-amber-700">Deadline passed; refresh for the latest outcome.</p>}</> : 'No deadline recorded' : '—'}
        </div>
        <div className="space-y-2 text-sm">
          <button type="button" onClick={() => setReviewing(value => !value)} aria-expanded={reviewing} className="font-medium text-indigo-700 hover:underline">{reviewing ? 'Hide alternatives' : 'Review alternatives'}</button>
          {row.state === 'pending' && canAssign && <p className="text-xs text-amber-800">Automatic follow-up after decline or expiry.</p>}
          {row.attempts.length > 1 && <button type="button" onClick={() => onHistory(row.category)} className="block text-xs text-slate-600 underline">{row.attempts.length - 1} previous {row.attempts.length === 2 ? 'attempt' : 'attempts'}</button>}
          {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`text-xs ${feedback.type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{feedback.message}</p>}
        </div>
      </div>
      {reviewing && <div className="mx-4 mb-4 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 md:mx-5">
        <p className="text-xs text-slate-600">Current eligibility for this event. These results can differ from the recorded selection decision.</p>
        {loading && <p role="status" className="text-sm text-slate-500">Checking vendor eligibility…</p>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {!loading && !error && alternatives.length === 0 && <p className="text-sm text-slate-700">No eligible alternative is currently available.</p>}
        {alternatives.map(vendor => <div key={vendor.vendorId || vendor.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="font-medium text-slate-900">#{vendor.rank} {vendor.companyName}</p><p className="mt-1 text-xs text-slate-600">Match {percent(vendor.score)} · quality {percent(vendor.qualityScore)} · load {percent(vendor.workloadScore)} · rotation {percent(vendor.rotationScore)}</p>
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
