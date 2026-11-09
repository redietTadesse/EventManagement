import { Link } from 'react-router-dom';
import useApiResource from '../hooks/useApiResource';

export default function IssueAttention() {
  const { data, loading, error, reload } = useApiResource('/issues');
  return <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label="Unresolved event issues">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">Unresolved event issues{!loading && !error && ` (${data.length})`}</h2><button onClick={reload} className="text-sm text-indigo-700">Refresh issues</button></div>
    {loading && <p className="mt-3 text-sm text-slate-500">Loading issues…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    {!loading && !error && data.length === 0 && <p className="mt-3 text-sm text-slate-500">No unresolved issues.</p>}
    <ul className="mt-3 max-h-96 divide-y overflow-auto">{data.map((issue) => <li key={issue.id} className="py-3">
      <Link to={`/coordinator/events/${issue.eventId}?tab=issues`} className="font-medium text-indigo-700 hover:underline">{issue.title}</Link>
      <p className="text-sm text-slate-600">{issue.eventName} · {issue.responsible.name} · {issue.priority.toLowerCase()} · Due {issue.dueDate || 'Not set'}</p>
      {issue.overdue && <p className="text-sm font-semibold text-rose-700">Overdue</p>}
    </li>)}</ul>
  </section>;
}
