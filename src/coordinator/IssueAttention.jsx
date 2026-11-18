import { Link } from 'react-router-dom';
import useApiResource from '../hooks/useApiResource';

export default function IssueAttention() {
  const { data, loading, error, reload } = useApiResource('/issues');
  const incidents = useApiResource('/incidents/pending');

  const pending = incidents.data || [];
  const commentFlags = pending.filter(r => r.source === 'COMMENT_FLAG');
  const clientReports = pending.filter(r => r.source === 'CLIENT_REPORT');
  const coordReports = pending.filter(r => r.source === 'COORDINATOR_REPORT');

  return (
    <div className="space-y-4">
      {/* Existing: Unresolved event issues */}
      <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label="Unresolved event issues">
        <div className="flex justify-between gap-3">
          <h2 className="font-semibold">Unresolved event issues{!loading && !error && ` (${data.length})`}</h2>
          <button onClick={reload} className="text-sm text-indigo-700">Refresh issues</button>
        </div>
        {loading && <p className="mt-3 text-sm text-slate-500">Loading issues…</p>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="mt-3 text-sm text-slate-500">No unresolved issues.</p>}
        <ul className="mt-3 max-h-96 divide-y overflow-auto">
          {data.map((issue) => (
            <li key={issue.id} className="py-3">
              <Link to={`/coordinator/events/${issue.eventId}?tab=issues`} className="font-medium text-indigo-700 hover:underline">{issue.title}</Link>
              <p className="text-sm text-slate-600">{issue.eventName} · {issue.responsible.name} · {issue.priority.toLowerCase()} · Due {issue.dueDate || 'Not set'}</p>
              {issue.overdue && <p className="text-sm font-semibold text-rose-700">Overdue</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* NEW: Pending incident reports (highlights comment flags) */}
      <section
        className={`rounded-xl border p-5 ${
          pending.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
        }`}
        aria-label="Pending incident reports"
      >
        <div className="flex justify-between gap-3">
          <h2 className="font-semibold">
            {pending.length > 0 && <span className="mr-1">⚠</span>}
            Pending incident reports
            {!incidents.loading && !incidents.error && ` (${pending.length})`}
          </h2>
          <button onClick={incidents.reload} className="text-sm text-indigo-700">Refresh</button>
        </div>

        {incidents.loading && <p className="mt-3 text-sm text-slate-500">Loading reports…</p>}
        {incidents.error && <p role="alert" className="mt-3 text-sm text-rose-700">{incidents.error}</p>}

        {!incidents.loading && !incidents.error && pending.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No pending reports. All caught up.</p>
        )}

        {!incidents.loading && !incidents.error && pending.length > 0 && (
          <>
            <p className="mt-2 text-sm text-slate-700">
              {commentFlags.length > 0 && (
                <span className="font-semibold text-amber-800">
                  {commentFlags.length} auto-flagged from comment{commentFlags.length === 1 ? '' : 's'}
                </span>
              )}
              {commentFlags.length > 0 && clientReports.length > 0 && ' · '}
              {clientReports.length > 0 && (
                <span className="font-medium text-rose-800">
                  {clientReports.length} client no-show report{clientReports.length === 1 ? '' : 's'}
                </span>
              )}
              {(commentFlags.length > 0 || clientReports.length > 0) && coordReports.length > 0 && ' · '}
              {coordReports.length > 0 && (
                <span className="font-medium text-slate-700">
                  {coordReports.length} coordinator report{coordReports.length === 1 ? '' : 's'}
                </span>
              )}
            </p>

            <ul className="mt-3 max-h-72 divide-y overflow-auto">
              {pending.slice(0, 5).map(r => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.source === 'COMMENT_FLAG' && (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
                        ⚠ Comment flag
                      </span>
                    )}
                    {r.source === 'CLIENT_REPORT' && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                        Client report
                      </span>
                    )}
                    <span className="font-medium text-slate-800">{r.vendorName}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {r.eventName} · {r.incidentType?.replaceAll('_', ' ').toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>

            <Link
              to="/coordinator/incident-reviews"
              className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline"
            >
              Review all {pending.length} →
            </Link>
          </>
        )}
      </section>
    </div>
  );
}