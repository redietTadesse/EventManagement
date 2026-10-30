import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function EventReadinessWidget({ eventId, refreshKey = 0 }) {
  const [readiness, setReadiness] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return undefined;
    let cancelled = false;
    api.get(`/events/${eventId}/readiness`)
      .then(response => {
        if (!cancelled) {
          setReadiness(response.data);
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Event readiness could not be loaded.');
      });
    return () => { cancelled = true; };
  }, [eventId, refreshKey]);

  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!readiness) return <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400">Loading event readiness…</div>;

  const percentage = Math.max(0, Math.min(100, readiness.readinessPercentage || 0));
  const barColor = percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Event readiness">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Event readiness</h2>
          <p className="text-sm text-slate-500">Venue, vendor confirmations, and checklist progress</p>
        </div>
        <span className="text-3xl font-bold text-slate-800">{percentage}%</span>
      </div>
      <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500">Venue</p>
          <p className={`mt-1 font-semibold ${readiness.venueConfirmed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {readiness.venueConfirmed ? 'Confirmed' : 'Not confirmed'}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500">Vendors</p>
          <p className="mt-1 font-semibold text-slate-800">
            {readiness.confirmedVendors}/{readiness.totalRequiredVendors} confirmed
            <span className="ml-2 text-xs font-normal text-amber-700">{readiness.pendingVendors} pending</span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500">Checklist</p>
          <p className="mt-1 font-semibold text-slate-800">
            {readiness.completedChecklistItems}/{readiness.totalChecklistItems} complete
          </p>
        </div>
      </div>
    </section>
  );
}
