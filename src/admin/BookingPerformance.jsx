
import { useEffect, useRef, useState } from 'react';
import useApiResource from '../hooks/useApiResource';
import StatusBadge from '../components/StatusBadge';

function Evidence({ booking, onClose }) {
  const timeline = useApiResource('/history/inquiry/' + booking.inquiryId);
  const eventTimeline = useApiResource(booking.eventId ? '/history/event/' + booking.eventId : null);
  const ownership = useApiResource('/inquiries/' + booking.inquiryId + '/coordinator');
  const panel = useRef(null);
  useEffect(() => { panel.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ block: 'nearest' }); }, []);
  const changes = [...timeline.data, ...eventTimeline.data].sort((a,b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  return <section ref={panel} tabIndex={-1} className="surface space-y-4 border-l-4 border-indigo-500 p-5" aria-label="Booking review evidence" aria-live="polite">
    <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Inquiry #{booking.inquiryId}{booking.eventId && ' · Event #' + booking.eventId}</p><h3 className="mt-1 text-lg font-semibold">{booking.client}</h3></div><button className="text-sm underline" onClick={onClose}>Close details</button></div>
    <p className="text-sm"><strong>Current owner</strong> · {booking.coordinator}</p>
    <p className="text-sm"><strong>Next action</strong> · {booking.nextAction}</p>
    <div className="rounded-lg bg-indigo-50 p-4 text-sm text-indigo-950">
      <p className="font-semibold">Questions for the review</p>
      <p className="mt-2">What is the next step for {booking.nextAction.toLowerCase()}, and when will it happen?</p>
      {booking.waitingOn === 'Client' && <p className="mt-1">When was the client last contacted, and what response is expected?</p>}
      {booking.reviewReason && <p className="mt-2 font-medium">Reason this record was highlighted · {booking.reviewReason}</p>}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div><h4 className="text-sm font-semibold">Recorded stage changes</h4>
        {timeline.loading || eventTimeline.loading ? <p className="mt-2 text-sm">Loading history…</p> : timeline.error || eventTimeline.error ? <p role="alert" className="mt-2 text-sm text-rose-800">{timeline.error || eventTimeline.error}</p> :
          <ul className="mt-2 max-h-52 space-y-3 overflow-auto text-sm">{changes.map(item => <li key={item.id} className="border-l-2 border-slate-200 pl-3">
            <StatusBadge status={item.toStatus} /><p className="mt-1 text-xs text-slate-500">{new Date(item.occurredAt).toLocaleString()} · {item.performedByUsername || 'System'}</p>
          </li>)}{!changes.length && <li className="text-slate-500">No stage changes were recorded.</li>}</ul>}
      </div>
      <div><h4 className="text-sm font-semibold">Coordinator assignment history</h4>
        {ownership.loading ? <p className="mt-2 text-sm">Loading ownership…</p> : ownership.error ? <p role="alert" className="mt-2 text-sm text-rose-800">{ownership.error}</p> :
          <ul className="mt-2 max-h-52 space-y-3 overflow-auto text-sm">{(ownership.data.history || []).map(item => <li key={item.id}>
            <p className="font-medium">{item.previousCoordinatorName ? item.previousCoordinatorName + ' → ' : ''}{item.coordinatorName}</p>
            <p className="text-xs text-slate-500">{new Date(item.changedAt).toLocaleString()} · {item.reason}</p>
          </li>)}{!ownership.data.history?.length && <li className="text-slate-500">No assignment history was recorded.</li>}</ul>}
      </div>
    </div>
  </section>;
}

export default function BookingPerformance() {
  const [days, setDays] = useState(90);
  const [reviewDays, setReviewDays] = useState(7);
  const [owner, setOwner] = useState('ALL');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const resource = useApiResource('/admin/dashboard/booking-performance?days=' + days + '&reviewDays=' + reviewDays);
  const report = resource.data?.bookings ? resource.data : null;
  const bookings = report?.bookings || [];
  const paid = bookings.filter(row => row.paidBooking).length;
  const reviews = bookings.filter(row => row.review).length;
  const missingAge = bookings.filter(row => row.daysInStage == null).length;
  const rows = bookings.filter(row => (owner === 'ALL' || String(row.coordinatorId ?? 'UNASSIGNED') === owner) && (!reviewOnly || row.review));
  useEffect(() => { setOwner('ALL'); setSelected(null); }, [days, reviewDays]);
  const previous = report?.previousInquiries ?? 0;

  return <div className="space-y-5">
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div>
        <h2 className="text-xl font-semibold text-slate-900">How is booking business progressing?</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Follow inquiries from arrival to a paid booking. Review where work is waiting and open the records behind each coordinator's workload.</p>
      </div><button className="btn-outline" disabled={resource.loading} onClick={resource.reload}>Refresh business view</button></div>
      <div className="mt-5 flex flex-wrap gap-4">
        <label className="text-sm font-medium">Inquiries received<select className="ml-2 rounded-lg border border-slate-300 p-2" value={days} onChange={event => setDays(Number(event.target.value))}>{[30,90,180].map(value => <option key={value} value={value}>Last {value} days</option>)}</select></label>
        <label className="text-sm font-medium">Review waiting stages after<select className="ml-2 rounded-lg border border-slate-300 p-2" value={reviewDays} onChange={event => setReviewDays(Number(event.target.value))}>{[3,7,14].map(value => <option key={value} value={value}>{value} days</option>)}</select></label>
      </div>
      {report && <p className="mt-4 text-xs leading-relaxed text-slate-500">Inquiries received {report.from} through {report.through}, with their outcomes as of today. Paid bookings have verified payment records and may include later cancellations. Current owners receive the workload attribution, including transferred inquiries. The waiting threshold is a review aid.</p>}
    </section>
    {resource.loading && <p role="status">Loading booking performance…</p>}
    {resource.error && <p role="alert" className="surface p-5 text-rose-800">{resource.error}</p>}
    {report && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Inquiries received', bookings.length, previous + ' in the preceding ' + days + ' days'],
          ['Paid bookings', paid, bookings.length ? (100 * paid / bookings.length).toFixed(1) + '% of inquiries received in this period' : 'No inquiries in this period'],
          ['Need a review', reviews, 'Unassigned work, waiting stages, sourcing issues, or past dates'],
          ['Declined / cancelled', bookings.filter(row => row.rejected || row.cancelled).length, 'Outcomes within these inquiries'],
        ].map(([label, value, note]) => <div key={label} className="surface p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{note}</p></div>)}
      </div>
      <section className="surface overflow-hidden">
        <div className="section-heading"><div><h2>Coordinator review</h2><p>Select a coordinator to inspect their records. Waiting on a client or vendor remains visible beside staff actions.</p></div></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Current owner','Inquiries','Active','Paid','Staff action','Client action','Vendor response','Review'].map(label => <th className="whitespace-nowrap px-4 py-3" key={label}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{report.coordinators.map(person => <tr key={person.id ?? 'UNASSIGNED'} className={owner === String(person.id ?? 'UNASSIGNED') ? 'bg-indigo-50' : ''}>
            <th className="px-4 py-4 font-medium"><button className="text-indigo-700 underline" onClick={() => { setOwner(String(person.id ?? 'UNASSIGNED')); setSelected(null); }}>{person.name}</button></th>
            {[person.inquiries,person.active,person.paidBookings,person.waitingForCoordinator,person.waitingForClient,person.waitingForVendor,person.review].map((value,index) => <td className="px-4 py-4 tabular-nums" key={index}>{value}</td>)}
          </tr>)}</tbody>
        </table></div>
        {!report.coordinators.length && <p className="p-5 text-sm text-slate-500">No inquiries were received in this period.</p>}
      </section>
      <section className="surface p-5">
        <h2 className="font-semibold">Which event types are bringing inquiries?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{report.demand.map(segment => <div key={segment.eventType} className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium capitalize">{segment.eventType.replaceAll('_',' ')}</p>
          <p className="mt-2 text-sm text-slate-600">{segment.inquiries} inquiries · {segment.paidBookings} paid bookings</p>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: (100 * segment.paidBookings / segment.inquiries) + '%' }} /></div>
        </div>)}</div>
      </section>
      <section className="surface overflow-hidden">
        <div className="section-heading"><div><h2>Records behind the figures</h2><p>Days measure time at the current recorded stage. Contract and payment steps share the accepted-proposal stage.</p></div></div>
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3 text-sm">
          <label>Owner<select className="ml-2 rounded-lg border border-slate-300 p-2" value={owner} onChange={event => { setOwner(event.target.value); setSelected(null); }}><option value="ALL">All coordinators</option>{report.coordinators.map(person => <option key={person.id ?? 'UNASSIGNED'} value={person.id ?? 'UNASSIGNED'}>{person.name}</option>)}</select></label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={reviewOnly} onChange={event => setReviewOnly(event.target.checked)} />Review highlighted records only</label>
          <span className="text-xs text-slate-500">{rows.length} records</span>
        </div>
        {missingAge > 0 && <p className="px-5 pt-3 text-xs text-amber-800">{missingAge} records have no known stage entry date. Their age is shown as unavailable.</p>}
        <div className="max-h-[32rem] overflow-auto"><table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600"><tr>{['Booking / inquiry','Stage','Days in stage','Next action','Current owner'].map(label => <th className="px-4 py-3" key={label}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.inquiryId} className={row.review ? 'bg-amber-50/40' : ''}>
            <th className="px-4 py-4 font-medium"><button className="text-left text-indigo-700 underline" onClick={() => setSelected(row)}>#{row.inquiryId} · {row.client}</button><p className="mt-1 text-xs font-normal text-slate-500">{row.eventDate} · {row.type}</p></th>
            <td className="px-4 py-4"><StatusBadge status={row.status} />{row.reviewReason && <p className="mt-2 max-w-48 text-xs text-amber-900">{row.reviewReason}</p>}</td>
            <td className="px-4 py-4 tabular-nums">{row.daysInStage ?? 'Unavailable'}</td>
            <td className="px-4 py-4"><p>{row.nextAction}</p><p className="mt-1 text-xs text-slate-500">{row.waitingOn}</p></td>
            <td className="px-4 py-4">{row.coordinator}</td>
          </tr>)}</tbody>
        </table></div>
        {!rows.length && <p className="p-5 text-sm text-slate-500">No records match these filters.</p>}
      </section>
      {selected && <Evidence key={selected.inquiryId} booking={selected} onClose={() => setSelected(null)} />}
    </>}
  </div>;
}
