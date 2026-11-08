import useApiResource from '../hooks/useApiResource';

export function VenueAvailabilityReasons({ venues }) {
  if (venues.length === 0) {
    return <p className="text-sm text-slate-700">No venues are registered.</p>;
  }
  const unavailable = venues.filter((venue) => !venue.available);
  if (unavailable.length === 0) return null;
  return (
    <details open={unavailable.length === venues.length} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-slate-900">Why venues are unavailable</summary>
      <ul className="mt-2 space-y-2">
        {unavailable.map((venue) => (
          <li key={venue.venueId}>
            <p className="font-medium text-slate-800">{venue.name}</p>
            <ul className="list-disc pl-5 text-slate-700">
              {venue.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function VenueDayExplanation({ date, attendees, onClose }) {
  const params = new URLSearchParams({ date });
  if (attendees) params.set('attendees', attendees);
  const { data, loading, error, reload } = useApiResource(`/venues/availability/reasons?${params}`);

  return (
    <section className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
      <div className="flex justify-between gap-2">
        <h3 className="font-semibold">Venue availability on {date}</h3>
        <button type="button" onClick={onClose} className="text-indigo-700 underline">Close</button>
      </div>
      {loading && <p role="status">Checking venues…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={reload} className="underline">Retry</button></p>}
      {!loading && !error && <>
        {data.some((venue) => venue.available) && <p>A suitable venue is currently available.</p>}
        <VenueAvailabilityReasons venues={data} />
      </>}
    </section>
  );
}
