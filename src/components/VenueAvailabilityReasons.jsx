import useApiResource from '../hooks/useApiResource';

export function VenueAvailabilityReasons({ venues, dateLabel }) {
  const available = venues.filter(venue => venue.available);
  const unavailable = venues.filter(venue => !venue.available);
  const hasMatches = available.length > 0;
  const title = venues.length === 0 ? 'No venues are configured'
    : hasMatches ? `${available.length} suitable ${available.length === 1 ? 'venue' : 'venues'} available`
    : 'No suitable venue for this selection';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <div className={`border-b border-slate-200 px-4 py-3 ${hasMatches ? 'bg-emerald-50' : 'bg-slate-50'}`}>
        {dateLabel && <p className="text-xs font-medium text-slate-600">{dateLabel}</p>}
        <p role="status" className={`font-semibold ${hasMatches ? 'text-emerald-900' : 'text-slate-900'}`}>{title}</p>
        {venues.length > 0 && <p className="mt-1 text-xs text-slate-600">
          {available.length} available · {unavailable.length} excluded · {venues.length} checked
        </p>}
      </div>
      {hasMatches && <div className="px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-slate-600">Available venues</p>
        <ul className="flex flex-wrap gap-2" aria-label="Available venues">
          {available.map(venue => <li key={venue.venueId}
            className="rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-900">{venue.name}</li>)}
        </ul>
      </div>}
      {unavailable.length > 0 && (
        <details open={!hasMatches} className={`px-4 py-3 ${hasMatches ? 'border-t border-slate-200' : ''}`}>
          <summary className="cursor-pointer font-medium text-slate-800">Why {unavailable.length} {unavailable.length === 1 ? 'venue was' : 'venues were'} excluded</summary>
          <ul className="mt-2 divide-y divide-slate-100">
            {unavailable.map(venue => (
              <li key={venue.venueId} className="py-2">
                <p className="font-medium text-slate-800">{venue.name}</p>
                <ul className="mt-1 space-y-1 text-xs leading-relaxed text-slate-600">
                  {venue.reasons.map(reason => <li key={reason}>{reason}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function VenueDayExplanation({ date, attendees, eventType, onClose }) {
  const params = new URLSearchParams({ date });
  if (attendees) params.set('attendees', attendees);
  if (eventType) params.set('eventType', eventType);
  const { data, loading, error, reload } = useApiResource(`/venues/availability/reasons?${params}`);

  return (
    <section className="space-y-2" aria-label={`Venue availability on ${date}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <h3 className="font-semibold">Availability check</h3>
        <button type="button" onClick={onClose} className="text-indigo-700 underline">Close</button>
      </div>
      {loading && <p role="status" className="text-sm text-slate-600">Checking venues…</p>}
      {error && <p role="alert" className="text-sm text-rose-800">{error} <button type="button" onClick={reload} className="underline">Retry</button></p>}
      {!loading && !error && <VenueAvailabilityReasons venues={data}
        dateLabel={attendees ? `${date} · ${attendees} attendees` : date} />}
    </section>
  );
}
