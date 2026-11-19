import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function AvailabilityWaitingList({ inquiry }) {
  const path = `/inquiries/${inquiry.id}/availability-watch`;
  const [watch, setWatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setWatch(null); setError('');
    api.get(path, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setWatch(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the waiting-list status.'); });
    return () => controller.abort();
  }, [path, revision]);
  async function change(join) {
    setBusy(true); setError('');
    try { const response = join ? await api.post(path) : await api.delete(path); setWatch(response.data); }
    catch (err) { setError(err.response?.data?.message || 'Could not update your waiting-list request.'); }
    finally { setBusy(false); }
  }
  const query = new URLSearchParams({ date: inquiry.eventDate, endDate: inquiry.endDate || inquiry.eventDate,
    attendees: inquiry.expectedAttendees, eventType: inquiry.eventType, tableSetup: inquiry.tableSetup || 'UNDECIDED' });
  return <section className="surface space-y-3 p-5 sm:p-6" aria-label="Availability waiting list">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Let me know if a venue becomes available</h2><button type="button" disabled={busy} onClick={() => setRevision(value => value+1)} className="text-xs font-semibold text-emerald-800 underline">Refresh status</button></div>
    <p className="text-sm leading-relaxed text-slate-600">If no suitable venue is available, join the waiting list for this inquiry’s dates, attendance and seating. We check regularly and notify you and your assigned coordinator when a venue fits. A notification gives no reservation or booking priority.</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!watch && !error && <p role="status" className="text-sm text-slate-500">Checking your waiting-list status…</p>}
    {watch && <div aria-live="polite" className="space-y-3">
      {watch.status === 'WAITING' ? <><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">You’re on the waiting list. No venue has been reserved. We’ll send an in-app notice and attempt an email when a match is found.</p><button type="button" className="btn-outline" disabled={busy} onClick={() => change(false)}>Leave waiting list</button></>
        : watch.status === 'NOTIFIED' ? <><p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">We found an option: <strong>{watch.matchedVenueName}</strong>. Availability may have changed since the notice. Contact your coordinator and check venues before proceeding.</p><Link className="btn-primary" to={`/client/venues?${query}`}>Check current venue options</Link><button type="button" disabled={busy} className="btn-outline" onClick={() => change(true)}>Check and rejoin if needed</button></>
          : watch.status === 'CLOSED' ? <p className="text-sm text-slate-600">This waiting-list request has ended because the inquiry was booked, closed or its date passed.</p>
            : <button type="button" className="btn-primary" disabled={busy} onClick={() => change(true)}>{busy ? 'Saving…' : 'Join availability waiting list'}</button>}
    </div>}
  </section>;
}
