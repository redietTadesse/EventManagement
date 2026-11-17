
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import api from '../api/axios';
import { calendarDateKey } from '../hooks/useVenueAvailabilityCalendar';
import { scheduleDays, shiftDay, venueDay } from './venueScheduleModel';

const colors = {
  free: 'bg-white text-slate-400 hover:bg-emerald-50',
  inactive: 'bg-slate-100 text-slate-400',
  setup: 'bg-sky-100 text-sky-900 hover:bg-sky-200',
  event: 'bg-indigo-600 text-white hover:bg-indigo-700',
  takedown: 'bg-violet-100 text-violet-900 hover:bg-violet-200',
  booked: 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200',
  hold: 'bg-amber-100 text-amber-900 hover:bg-amber-200',
  blocked: 'bg-slate-700 text-white hover:bg-slate-800',
};
const dateLabel = date => new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function VenueSchedule() {
  const [start, setStart] = useState(calendarDateKey(new Date()));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(null);
  const [inquiryId, setInquiryId] = useState('');
  const [fit, setFit] = useState(null);
  const [fitError, setFitError] = useState('');
  const [fitLoading, setFitLoading] = useState(false);
  const days = scheduleDays(start);

  useEffect(() => {
    const controller = new AbortController();
    const get = path => api.get(path, { signal: controller.signal }).then(result => result.data);
    setError('');
    setData(null);
    setSelected(null);
    Promise.all([get('/venues'), get('/events'), get('/inquiries')]).then(async ([venues, events, inquiries]) => {
      const rows = await Promise.all(venues.map(async venue => {
        const results = await Promise.allSettled([get('/venues/' + venue.id + '/bookings'), get('/venues/' + venue.id + '/unavailable-dates')]);
        return { venue, bookings: results[0].value || [], blocked: results[1].value || [],
          failed: results.some(result => result.status === 'rejected') };
      }));
      if (!controller.signal.aborted) setData({ rows, events, inquiries });
    }).catch(() => {
      if (!controller.signal.aborted) setError('The venue schedule could not be loaded. Refresh to retry.');
    });
    return () => controller.abort();
  }, [revision]);

  const inquiry = data?.inquiries.find(item => String(item.id) === inquiryId);
  useEffect(() => {
    const controller = new AbortController();
    setFit(null);
    setFitError('');
    setFitLoading(false);
    if (!inquiry) return () => controller.abort();
    setStart(inquiry.eventDate);
    setFitLoading(true);
    const query = new URLSearchParams({ date: inquiry.eventDate, endDate: inquiry.endDate || inquiry.eventDate,
      attendees: inquiry.expectedAttendees, eventType: inquiry.eventType });
    api.get('/venues/availability/reasons?' + query, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setFit(result.data);
    }).catch(() => {
      if (!controller.signal.aborted) setFitError('Inquiry availability could not be verified. Try selecting the inquiry again.');
    }).finally(() => { if (!controller.signal.aborted) setFitLoading(false); });
    return () => controller.abort();
  }, [inquiry]);

  const rows = data?.rows || [];
  const active = rows.filter(row => row.venue.active);
  const known = active.filter(row => !row.failed);
  const occupied = known.reduce((sum, row) => sum + days.filter(day =>
    ['setup', 'event', 'takedown', 'booked'].includes(venueDay(row.venue, day, row.bookings, row.blocked, data.events).kind)).length, 0);
  const complete = known.length === active.length && Boolean(data);
  const utilization = complete && active.length ? Math.round(100 * occupied / (active.length * days.length)) : null;

  return <Layout title="Venue Schedule">
    <div className="space-y-6">
      <PageHeader eyebrow="Venue operations" title="Every space. Every booking day."
        subtitle="Review setup, event days, takedown, holds, and blocked dates across AICC."
        action={<button className="btn-outline" onClick={() => setRevision(value => value + 1)}>Refresh schedule</button>} />
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Active spaces', data ? active.length : '—'], ['Booked space-days', complete ? occupied : '—'],
          ['Booked utilisation · 14 days', utilization == null ? '—' : utilization + '%']].map(([label, value]) =>
          <div key={label} className="surface p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p></div>)}
      </div>
      <section className="surface space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm font-medium">Start date<input type="date" required value={start} onChange={event => { if (event.target.value) { setStart(event.target.value); setSelected(null); } }} className="mt-1 block rounded-lg border border-slate-300 p-2" /></label>
            <button className="btn-outline" onClick={() => setStart(shiftDay(start, -14))}>Previous</button>
            <button className="btn-outline" onClick={() => setStart(calendarDateKey(new Date()))}>Today</button>
            <button className="btn-outline" onClick={() => setStart(shiftDay(start, 14))}>Next</button>
          </div>
          <label className="text-sm font-medium">Check an inquiry
            <select className="mt-1 block max-w-xs rounded-lg border border-slate-300 p-2" value={inquiryId} onChange={event => setInquiryId(event.target.value)}>
              <option value="">Choose an inquiry</option>
              {data?.inquiries.filter(item => ['INQUIRY_SUBMITTED', 'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED'].includes(item.status)).map(item =>
                <option key={item.id} value={item.id}>#{item.id} · {item.clientName} · {item.eventDate}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">{[['free', 'Open date'], ['setup', 'Setup'], ['event', 'Event'], ['takedown', 'Takedown'], ['booked', 'Booked'], ['hold', 'Live hold'], ['blocked', 'Blocked']].map(([kind, label]) =>
          <span key={kind} className="inline-flex items-center gap-1.5"><span className={'h-3 w-3 rounded ' + colors[kind]} />{label}</span>)}</div>
        <p className="text-xs text-slate-500">Booked utilisation counts reservation days, including setup and takedown, across active spaces. Open cells describe individual dates. Inquiry checks include the full booking window and attendance.</p>
      </section>
      {error && <p role="alert" className="surface p-5 text-rose-800">{error}</p>}
      {!data && !error && <p role="status">Loading venue commitments…</p>}
      {fitLoading && <p role="status">Checking full booking windows and capacity…</p>}
      {fitError && <p role="alert" className="text-rose-800">{fitError}</p>}
      {inquiry && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
        Checking {inquiry.eventType} for {inquiry.expectedAttendees} attendees, {dateLabel(inquiry.eventDate)}{inquiry.endDate && ' – ' + dateLabel(inquiry.endDate)}.
        {' '}<Link className="font-semibold underline" to={'/coordinator/inquiries/' + inquiry.id}>Open inquiry</Link>
      </div>}
      {data && <section aria-label="Venue booking schedule" className="surface overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 1380 }}>
          <caption className="sr-only">Venue commitments from {start} to {days.at(-1)}. Select a date to inspect its details.</caption>
          <thead><tr><th className="sticky left-0 z-20 w-60 bg-slate-900 p-4 text-sm text-white">Space · {dateLabel(start)} – {dateLabel(days.at(-1))}</th>
            {days.map(day => <th key={day} className="bg-slate-900 px-1 py-3 text-center text-xs text-white"><span className="block text-slate-400">{new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>{dateLabel(day)}</th>)}</tr></thead>
          <tbody>{rows.map(row => {
            const availability = fit?.find(item => item.venueId === row.venue.id);
            return <tr key={row.venue.id}>
              <th scope="row" className="sticky left-0 z-10 border-b border-slate-200 bg-white p-4">
                <Link to={'/coordinator/venues/' + row.venue.id} className="text-sm font-semibold hover:underline">{row.venue.name}</Link>
                <p className="mt-1 text-xs font-normal text-slate-500">{row.venue.capacity ?? 'Unknown'} capacity · {row.venue.active ? 'Active' : 'Inactive'}</p>
                {availability && <p className={'mt-2 text-xs font-medium ' + (availability.available ? 'text-emerald-700' : 'text-rose-700')}>{availability.available ? 'Fits this inquiry' : availability.reasons.join(' ')}</p>}
              </th>
              {days.map(day => {
                const cell = row.failed ? { kind: 'inactive', label: 'Unknown' } : venueDay(row.venue, day, row.bookings, row.blocked, data.events);
                const chosen = selected?.venue.id === row.venue.id && selected?.date === day;
                return <td key={day} className="border-b border-slate-200 p-0.5"><button type="button" disabled={row.failed}
                  aria-label={row.venue.name + ', ' + day + ', ' + cell.label} aria-pressed={chosen}
                  className={'h-24 w-full overflow-hidden rounded-md px-1 text-center text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ' + colors[cell.kind] + (chosen ? ' ring-2 ring-amber-500' : '')}
                  onClick={() => setSelected({ ...cell, venue: row.venue, date: day })}>
                  <span className="block font-semibold">{cell.label}</span>
                  <span className="mt-1 block truncate text-[10px]">{cell.booking?.eventName || cell.event?.name || ''}</span>
                </button></td>;
              })}
            </tr>;
          })}</tbody>
        </table>
        {!rows.length && <p className="p-6 text-sm text-slate-500">No venue records are registered.</p>}
      </section>}
      {rows.some(row => row.failed) && <p role="alert" className="text-sm text-rose-800">Some venue commitments could not be verified. Their rows show Unknown. Refresh to retry.</p>}
      {selected && <section aria-live="polite" className="surface space-y-3 border-l-4 border-indigo-600 p-6">
        <div className="flex justify-between gap-4"><h2 className="text-lg font-semibold">{selected.venue.name} · {dateLabel(selected.date)}</h2><button className="text-sm underline" onClick={() => setSelected(null)}>Close details</button></div>
        <p className="text-sm">{selected.label}{selected.reason && ' · ' + selected.reason}</p>
        {(selected.booking?.eventName || selected.event?.name) && <p className="font-semibold">{selected.booking?.eventName || selected.event?.name}</p>}
        {selected.event && <><StatusBadge status={selected.event.status} /><p className="text-sm text-slate-600">Handled by {selected.event.coordinator?.name || 'Unassigned'} · Event dates {selected.event.eventDate} – {selected.event.endDate || selected.event.eventDate}</p></>}
        {selected.booking?.heldBy && <p className="text-sm">Held by {selected.booking.heldBy} until {selected.booking.expiresAt}</p>}
        {selected.kind === 'free' && <p className="text-sm text-slate-600">No reservation or date block is recorded for this day. Select an inquiry to check its full booking window.</p>}
        <div className="flex flex-wrap gap-3">
          {(selected.event?.id || selected.booking?.eventId) && <Link className="btn-primary" to={'/coordinator/events/' + (selected.event?.id || selected.booking.eventId)}>Open event and review date changes</Link>}
          {selected.event?.inquiryId && <Link className="btn-outline" to={'/coordinator/inquiries/' + selected.event.inquiryId}>Open inquiry</Link>}
        </div>
      </section>}
    </div>
  </Layout>;
}
