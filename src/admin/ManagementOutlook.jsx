import useApiResource from '../hooks/useApiResource';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../utils/helpers';

export default function ManagementOutlook() {
  const { data, loading, error, reload } = useApiResource('/admin/dashboard/outlook');

  return <section className="surface overflow-hidden" aria-labelledby="outlook-title" aria-busy={loading}>
    <div className="section-heading">
      <div><h2 id="outlook-title">Next 30 days</h2>
        <p>{data.from ? `${formatDate(data.from)} through ${formatDate(data.through)}` : 'Upcoming events and venue demand'}</p></div>
      <button type="button" className="btn-outline" disabled={loading} onClick={reload}>Refresh outlook</button>
    </div>
    {loading ? <p role="status" className="p-6 text-sm text-slate-600">Loading outlook…</p>
      : error ? <p role="alert" className="p-6 text-sm text-rose-800">{error}</p>
      : data.nextEvents && <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">Upcoming events</h3>
          <p className="mt-1 text-sm text-slate-600">{data.scheduled} scheduled · {data.confirmed} confirmed</p>
          {data.nextEvents.length ? <ul className="mt-4 divide-y divide-slate-100">
            {data.nextEvents.map(event => <li key={event.eventId} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><p className="text-sm font-medium">{event.eventName}</p>
                <p className="mt-1 text-xs text-slate-600">{formatDate(event.eventDate)} · {event.venue || 'Venue pending'}</p></div>
              <StatusBadge status={event.status} />
            </li>)}
          </ul> : <p className="mt-4 text-sm text-slate-500">No events start in this period.</p>}
          {data.scheduled > data.nextEvents.length && <p className="mt-2 text-xs text-slate-500">Showing the next {data.nextEvents.length} events.</p>}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">Reserved venue days</h3>
          <p className="mt-1 text-sm text-slate-600">Confirmed reservation days, including setup and takedown.</p>
          {data.venues.length ? <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-2">
            {data.venues.map(venue => <li key={venue.id}>
              <div className="flex justify-between gap-3 text-sm"><span>{venue.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{venue.reservedDays} of 30 days</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${venue.reservedDays / 30 * 100}%` }} />
              </div>
            </li>)}
          </ul> : <p className="mt-4 text-sm text-slate-500">No venues to report.</p>}
        </div>
      </div>}
  </section>;
}
