import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';
import { formatEventRange } from '../coordinator/eventDetailModel';

export default function AlternativeBookingPlans({ plan, inquiryId, onChoose }) {
  const [flexibility, setFlexibility] = useState('0');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  const criteria = [plan.date, plan.endDate, plan.attendees, plan.eventType, plan.tableSetup, inquiryId, flexibility].join('|');
  useEffect(() => {
    pending.current?.abort(); setResult(null); setError(''); setBusy(false);
    return () => pending.current?.abort();
  }, [criteria]);
  async function search() {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/booking-options', {
        date: plan.date, endDate: plan.endDate || plan.date, attendees: Number(plan.attendees),
        eventType: plan.eventType, tableSetup: plan.tableSetup || 'UNDECIDED',
        flexibleDays: Number(flexibility), ...(inquiryId ? { inquiryId: Number(inquiryId) } : {}),
      }, { signal: controller.signal });
      if (!controller.signal.aborted) setResult(data);
    } catch (err) { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Booking alternatives could not be checked. Please try again.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function inquiryLink(option) {
    return '/client/new-inquiry?' + new URLSearchParams({ eventType: plan.eventType, date: option.eventDate,
      endDate: option.endDate, attendees: plan.attendees, tableSetup: option.tableSetup, preferredVenue: option.venueName });
  }
  return <section className="surface space-y-4 border-t-4 border-emerald-700 p-5 sm:p-6" aria-label="Find alternative booking plans">
    <div><p className="eyebrow">More ways to accommodate your event</p><h2 className="mt-2 text-xl font-semibold">Find a workable venue and date</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">We check seating capacity and the full venue window, including setup and takedown. Nearby dates are considered only if you allow them.</p></div>
    <div className="flex flex-wrap items-end gap-3"><label className="grid gap-2 text-sm font-medium">How flexible are the event dates?
      <select value={flexibility} onChange={event => setFlexibility(event.target.value)} className="rounded-lg border p-2.5"><option value="0">Requested dates only</option><option value="3">Up to 3 days earlier or later</option><option value="7">Up to 7 days earlier or later</option><option value="14">Up to 14 days earlier or later</option></select>
    </label><button type="button" className="btn-primary" disabled={busy || !plan.date || !plan.attendees || Number(plan.attendees) < 1} onClick={search}><MagnifyingGlassIcon className="h-4 w-4" />{busy ? 'Checking booking windows…' : 'Find booking options'}</button></div>
    {!plan.date && <p className="text-xs text-slate-500">Enter your dates and attendance above to search.</p>}
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {result && <div aria-live="polite" className="space-y-3"><p className="text-sm text-slate-600">{result.options.length} options found · {result.datesChecked} possible start dates checked</p>
      <div className="grid gap-3 md:grid-cols-2">{result.options.map(option => <article key={`${option.venueId}-${option.eventDate}`} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
        <span className="text-xs font-semibold text-emerald-800">{option.daysShift === 0 ? 'Your requested dates' : `${Math.abs(option.daysShift)} ${Math.abs(option.daysShift) === 1 ? 'day' : 'days'} ${option.daysShift < 0 ? 'earlier' : 'later'}`}</span><h3 className="mt-2 font-semibold">{option.venueName}</h3>
        <dl className="mt-3 space-y-2 text-sm text-slate-700"><div><dt className="text-xs text-slate-500">Event dates</dt><dd>{formatEventRange(option.eventDate, option.endDate)}</dd></div><div><dt className="text-xs text-slate-500">Full venue window</dt><dd>{formatEventRange(option.bookedFrom, option.bookedThrough)}</dd></div><div><dt className="text-xs text-slate-500">Seating capacity</dt><dd>{option.capacity} · {option.tableSetup === 'UNDECIDED' ? 'maximum; setup to be agreed' : option.tableSetup.toLowerCase().replaceAll('_', ' ')}</dd></div></dl>
        {onChoose ? <button type="button" className="btn-outline mt-4" onClick={() => onChoose(option)}>Use in this proposal <ArrowRightIcon className="h-4 w-4" /></button> : <Link to={inquiryLink(option)} className="btn-outline mt-4">Start inquiry with this option <ArrowRightIcon className="h-4 w-4" /></Link>}
      </article>)}</div>
      {!result.options.length && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950">No option meets these requirements within the dates you allowed. Keep your requirements and send an inquiry so AICC can follow up. You can then join its availability waiting list.</p>}
      <p className="text-xs leading-relaxed text-slate-500">{result.notice}</p>
    </div>}
  </section>;
}
