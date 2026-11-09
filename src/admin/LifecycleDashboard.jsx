import { useState } from 'react';
import useApiResource from '../hooks/useApiResource';
import { formatDate, snakeToTitleCase } from '../utils/helpers';

const stages = [
  { title: 'New inquiries', source: 'inquiries', statuses: ['INQUIRY_SUBMITTED'], color: 'bg-sky-500',
    detail: 'Review requirements and prepare a proposal.' },
  { title: 'Proposal sent', source: 'inquiries', statuses: ['PROPOSAL_SENT'], color: 'bg-amber-500',
    detail: 'The client has yet to respond. Check older proposals for follow-up.' },
  { title: 'Contract and payment', source: 'inquiries', statuses: ['PROPOSAL_ACCEPTED'], color: 'bg-violet-500',
    detail: 'The proposal is accepted. Check signatures, receipt submission, and payment review.' },
  { title: 'Event preparation', source: 'events', statuses: ['EVENT_CREATED', 'AWAITING_VENDORS'], color: 'bg-blue-600',
    detail: 'Track vendor responses and preparation tasks.' },
  { title: 'Needs attention', source: 'events', statuses: ['NEEDS_COORDINATOR'], color: 'bg-rose-500',
    detail: 'A coordinator needs to resolve a blocker before the event can progress.' },
  { title: 'Confirmed', source: 'events', statuses: ['CONFIRMED'], color: 'bg-emerald-600',
    detail: 'Confirmed events are scheduled for delivery.' },
  { title: 'Completed', source: 'events', statuses: ['COMPLETED'], color: 'bg-teal-700',
    detail: 'These events have finished.' },
  { title: 'Closed or cancelled', source: 'both', statuses: ['PROPOSAL_REJECTED', 'CLOSED', 'CANCELLED'], color: 'bg-slate-500',
    detail: 'These requests or events ended without further work.' },
];

export default function LifecycleDashboard() {
  const { data, loading, error, reload } = useApiResource('/admin/dashboard/lifecycle');
  const [selected, setSelected] = useState(1);
  const proposals = useApiResource(selected === 1 && data.inquiries?.PROPOSAL_SENT > 0
    ? '/inquiries/status/PROPOSAL_SENT' : null);
  const followUps = proposals.data.filter(inquiry => !inquiry.event)
    .sort((a, b) => (a.updatedAt || '9999').localeCompare(b.updatedAt || '9999')).slice(0, 5);
  const counts = stages.map(({ source, statuses }) => statuses.reduce((sum, status) => sum
    + (source !== 'events' ? data.inquiries?.[status] ?? 0 : 0)
    + (source !== 'inquiries' ? data.events?.[status] ?? 0 : 0), 0));
  const total = counts.reduce((sum, count) => sum + count, 0);

  return <section className="surface overflow-hidden" aria-labelledby="lifecycle-title" aria-busy={loading}>
    <div className="section-heading">
      <div><h2 id="lifecycle-title">Event lifecycle</h2>
        <p>Current stage across all inquiries and events. Select a stage to see what to check.</p></div>
      <button className="btn-outline" type="button" onClick={() => { reload(); proposals.reload(); }} disabled={loading}>Refresh lifecycle</button>
    </div>
    {loading ? <p role="status" className="p-6 text-sm text-slate-600">Loading lifecycle counts…</p>
      : error ? <p role="alert" className="p-6 text-sm text-rose-800">{error}</p>
      : <div className="space-y-4 p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stages.map((stage, index) => <button type="button" key={stage.title}
            aria-pressed={selected === index} aria-controls="lifecycle-stage-detail"
            onClick={() => setSelected(index)}
            className={`rounded-xl border p-4 text-left hover:bg-slate-50 ${selected === index ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200'}`}>
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stage.color}`} aria-hidden="true" />{stage.title}
            </span>
            <span className="mt-2 block text-2xl font-semibold tabular-nums text-slate-900">{counts[index]}</span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span className={`block h-full rounded-full ${stage.color}`} style={{ width: total ? `${counts[index] / total * 100}%` : '0%' }} />
            </span>
          </button>)}
        </div>
        <div id="lifecycle-stage-detail" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700" aria-live="polite">
          <p className="font-semibold">{stages[selected].title} · {counts[selected]}</p>
          <p className="mt-1">{stages[selected].detail}</p>
          {selected === 1 && <>
            <p className="mt-2 font-medium text-amber-800">{data.proposalsWithoutUpdateForThreeDays} pending proposals have had no update for more than 3 days.</p>
            {counts[selected] > 0 && (proposals.loading ? <p className="mt-3">Loading pending proposals…</p>
              : proposals.error ? <p className="mt-3 text-rose-700">{proposals.error}</p>
              : followUps.length > 0 && <div className="mt-4">
                <h3 className="font-semibold text-slate-900">Pending proposals, least recently updated</h3>
                <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-3">
                  {followUps.map(inquiry => <li key={inquiry.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
                    <span className="font-medium">#{inquiry.id} · {snakeToTitleCase(inquiry.eventType) || 'Event inquiry'}</span>
                    <span className="text-xs text-slate-600">{inquiry.coordinator?.name || 'Unassigned'} · {inquiry.updatedAt ? `Updated ${formatDate(inquiry.updatedAt)}` : 'Update date unavailable'}</span>
                  </li>)}
                </ul>
              </div>)}
          </>}
        </div>
      </div>}
  </section>;
}
