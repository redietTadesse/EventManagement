import { useState } from 'react';
import { ArrowRightIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import StatusBadge from './StatusBadge';
import { parseSelection, serviceLabel } from '../coordinator/eventDetailModel';

export default function ServiceCommitmentBoard({ rows, known, status, onReview, onHistory, onRefresh }) {
  const [category, setCategory] = useState(null);
  const selected = rows.find(row => row.category === category) || rows.find(row => row.state === 'exhausted') || rows[0];
  const closed = ['CANCELLED', 'COMPLETED', 'CLOSED'].includes(status);
  const { snapshot, selected: candidate } = parseSelection(selected?.current);
  const stateLabel = row => row.current?.status === 'CANCELLED' ? 'Cancelled' : row.state === 'resolved' ? 'Committed' : row.state === 'pending' ? 'Awaiting reply' : closed ? 'No active commitment' : 'Needs attention';
  return <section className="commitment-board" aria-labelledby="commitments-title">
    <div className="commitment-heading"><div><p className="eyebrow">Service commitments</p><h2 id="commitments-title">How is each service being arranged?</h2><p>Select a service to follow its offers and the recorded decision.</p></div><span className="commitment-count">{known ? `${rows.filter(row => row.state === 'resolved').length}/${rows.length} covered` : 'Unverified'}</span></div>
    {!known ? <div className="p-6 text-sm text-amber-900" role="status">Service commitments could not be verified. <button type="button" onClick={onRefresh} className="font-semibold underline">Refresh event data</button></div>
      : !selected ? <p className="p-6 text-sm text-slate-600">No external vendor services are required for this event.</p>
        : <div className="commitment-layout">
          <div className="commitment-services" aria-label="Choose a service">{rows.map(row => {
            const Icon = row.state === 'resolved' ? CheckCircleIcon : row.state === 'pending' ? ClockIcon : ExclamationTriangleIcon;
            return <button type="button" key={row.category} aria-pressed={selected.category === row.category} aria-controls="selected-service-commitment" onClick={() => setCategory(row.category)} className={`commitment-service ${selected.category === row.category ? 'is-selected' : ''}`}>
              <Icon className={`h-5 w-5 shrink-0 ${row.state === 'resolved' ? 'text-emerald-700' : row.state === 'pending' ? 'text-amber-700' : 'text-slate-500'}`} aria-hidden="true" />
              <span><strong>{serviceLabel(row.category)}</strong><small>{stateLabel(row)}</small></span><ArrowRightIcon className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />
            </button>;
          })}</div>
          <div id="selected-service-commitment" className="commitment-detail" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{serviceLabel(selected.category)}</p><h3>{selected.current?.vendorName || 'A vendor is still needed'}</h3></div>{selected.current && <StatusBadge status={selected.current.status} />}</div>
            <p className="commitment-explanation">{selected.state === 'resolved' ? 'This vendor accepted the service commitment. Earlier offers remain in the record.' : selected.state === 'pending' ? `${selected.backupLabel ? selected.backupLabel + '. ' : ''}The offer is waiting for the vendor’s response. It is not an accepted commitment yet.` : closed ? 'Review the preserved offer history for this event.' : `${serviceLabel(selected.category)} needs review because ${selected.reason}.`}</p>
            {selected.current?.status === 'PENDING' && selected.current.expiresAt && <p className="commitment-deadline">Response deadline <time dateTime={selected.current.expiresAt}>{new Date(selected.current.expiresAt).toLocaleString()}</time></p>}
            <ol className="commitment-attempts" aria-label={`${serviceLabel(selected.category)} offer sequence`}>{selected.attempts.map((attempt, index) => <li key={attempt.id}>
              <span className={`attempt-dot ${['ACCEPTED', 'COMPLETED'].includes(attempt.status) ? 'is-accepted' : attempt.status === 'PENDING' ? 'is-pending' : ''}`} aria-hidden="true">{index + 1}</span>
              <div className="attempt-card"><div className="flex flex-wrap justify-between gap-2"><p>{attempt.vendorName || 'Open assignment'}</p><StatusBadge status={attempt.status} /></div>
                <span className="attempt-caption">{index === 0 ? 'Initial offer' : ['COORDINATOR_MANUAL', 'COORDINATOR_FORCED', 'POOL_CLAIM'].includes(attempt.selectionReason) ? 'Coordinator or vendor action' : 'Replacement offer'}{index === selected.attempts.length - 1 ? ' · Latest' : ''}</span>
                {attempt.declineReason && <p className="mt-2 text-xs text-slate-600">{attempt.declineReason}</p>}
              </div>
            </li>)}</ol>
            {snapshot && <details className="commitment-evidence"><summary>Why was this vendor selected?</summary><p className="mt-3 text-sm text-slate-700">{snapshot.reasoning || 'The recorded decision includes the candidate checks below.'}</p>
              {candidate && <p className="mt-2 text-xs text-slate-600">{candidate.rank != null && `Recorded rank ${candidate.rank}. `}{candidate.score != null && `Recorded score ${candidate.score}%. `}Review the full history for candidate comparisons and exclusions.</p>}
              <button type="button" className="mt-3 text-sm font-semibold text-emerald-800 underline" onClick={() => onHistory(selected.category)}>Open recorded ranking and exclusions</button>
            </details>}
            <div className="commitment-actions">{!closed && <button type="button" className="btn-primary" onClick={() => onReview(selected.category)}>{selected.state === 'exhausted' ? 'Review eligible alternatives' : 'Review this service'}<ArrowRightIcon className="h-4 w-4" /></button>}<button type="button" className="text-sm font-semibold text-emerald-800 hover:underline" onClick={() => onHistory(selected.category)}>View full offer history</button></div>
          </div>
        </div>}
  </section>;
}
