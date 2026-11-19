import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import StatusBadge from '../components/StatusBadge';
import { bookingJourney } from './bookingJourneyModel';

export default function BookingJourneyBoard({ inquiries, currentUserId, loaded, error }) {
  const [scope, setScope] = useState('mine');
  const [stage, setStage] = useState('proposal');
  const report = useMemo(() => bookingJourney(inquiries, scope, currentUserId), [inquiries, scope, currentUserId]);
  const selected = report.stages.find(item => item.id === stage) || report.stages[0];
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-labelledby="booking-journey-title">
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-6">
      <div><p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-700">From request to delivery</p>
        <h2 id="booking-journey-title" className="mt-1 text-xl font-semibold text-slate-900">Where is the work waiting?</h2>
        <p className="mt-1 text-sm text-slate-500">Select a step to see the requests behind the numbers.</p></div>
      <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Work shown">
        {[['mine','My work + unclaimed'],['all','All coordinators']].map(([value,label]) => <button type="button" key={value} aria-pressed={scope===value} onClick={()=>setScope(value)} className={'rounded-md px-3 py-2 text-xs font-semibold '+(scope===value?'bg-white text-slate-900 shadow-sm':'text-slate-600')}>{label}</button>)}
      </div>
    </div>
    {!loaded ? <p role="status" className="border-t px-6 py-8 text-sm text-slate-500">{error?'Booking progress could not be loaded. Refresh the dashboard to try again.':'Checking booking progress…'}</p> : <>
      {error&&<p role="alert" className="px-6 pb-3 text-sm text-amber-800">Showing the last loaded requests. Refresh did not finish.</p>}
      <div className="grid grid-cols-2 border-y border-slate-200 bg-slate-50 sm:grid-cols-3 xl:grid-cols-6">
        {report.stages.map((item,index)=><button type="button" key={item.id} aria-pressed={selected.id===item.id} aria-controls="journey-records" onClick={()=>setStage(item.id)} className={'group relative border-b border-r border-slate-200 p-4 text-left transition hover:bg-white sm:p-5 '+(selected.id===item.id?'bg-white ring-2 ring-inset ring-indigo-500':'')}>
          <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500"><span>0{index+1}</span><span aria-hidden="true" className={'h-2 w-2 rounded-full '+item.dot}/></span>
          <span className="mt-3 block text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{item.rows.length}</span>
          <span className="mt-1 block text-sm font-semibold text-slate-800">{item.label}</span>
          <span className="mt-2 block text-xs leading-relaxed text-slate-500">{item.waiting}</span>
          <span className="journey-bar" aria-hidden="true"><span className={item.dot} style={{width:`${report.total ? item.rows.length/report.total*100 : 0}%`}}/></span>
          <span className="mt-2 block text-[10px] text-slate-500">{report.total ? Math.round(item.rows.length/report.total*100) : 0}% of requests</span>
        </button>)}
      </div>
      <div id="journey-records" className="grid lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)]">
        <div className="border-b border-slate-200 bg-[#f5f8f7] p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"><ClockIcon className="h-3.5 w-3.5"/>{selected.label}</span>
          <h3 className="mt-4 font-semibold text-slate-900">{selected.action}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{selected.description}</p>
          <p className="mt-5 text-xs text-slate-500">{report.total} total requests in this view. Each request appears once, using its linked event’s latest status.</p>
        </div>
        <div className="min-w-0 p-5 sm:p-6" aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-800">{selected.rows.length} {selected.rows.length===1?'record':'records'}</h3><Link className="text-xs font-semibold text-indigo-700 hover:underline" to="/coordinator/inquiries">Open inquiry list →</Link></div>
          {selected.rows.length ? <ul className="divide-y divide-slate-100">{selected.rows.slice(0,4).map(row=><li key={row.id}>
            <Link to={row.href} className="group flex items-center justify-between gap-3 rounded-lg py-3 hover:bg-slate-50">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{row.name}</p><p className="mt-1 text-xs text-slate-500">Inquiry #{row.id} · {row.clientName} · {row.eventDate || 'Date not set'}</p><p className="mt-1 text-xs text-slate-500">{row.coordinator?.name || 'Unclaimed — a coordinator can pick it up'}</p></div>
              <div className="flex shrink-0 items-center gap-3"><StatusBadge status={row.currentStatus}/><ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:text-indigo-700"/></div>
            </Link></li>)}</ul> : <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 p-5"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600"/><p className="text-sm text-slate-600">No records at this step in the selected view.</p></div>}
          {selected.rows.length>4&&<p className="mt-3 text-xs text-slate-500">Showing the four most recently updated. Open the inquiry list for the rest.</p>}
        </div>
      </div>
    </>}
    <div className="grid gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-600 sm:grid-cols-3 sm:px-6">
      <p><strong className="text-slate-800">Accepted proposal</strong><br/>Tentative; other clients may still inquire.</p>
      <p><strong className="text-slate-800">Both signatures</strong><br/>Dates protected for seven days.</p>
      <p><strong className="text-slate-800">Receipt checked</strong><br/>Venue booked; vendor offers begin.</p>
    </div>
  </section>;
}
