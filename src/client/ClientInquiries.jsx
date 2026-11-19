import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CalendarDaysIcon, CheckIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import EventPageControls from '../components/EventPageControls';
import { eventPage } from '../utils/eventPages';
import { useApp } from '../context/AppContext';
import useApiResource from '../hooks/useApiResource';
import { clientRequest } from './clientRequestModel';

function displayDate(value) {
  if(!value)return 'Date to discuss';
  const date=new Date(value.slice(0,10)+'T00:00:00');
  return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(date);
}
function RequestCard({inquiry}) {
  const view=clientRequest(inquiry);
  return <article className={'flex flex-col overflow-hidden rounded-2xl border bg-white '+(view.terminal?'border-slate-200':'border-slate-200 shadow-sm')}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <p className="text-xs font-medium text-slate-500">Request #{inquiry.id} · {(inquiry.eventType||'Event').replaceAll('_',' ')}</p><StatusBadge status={view.status}/>
    </div>
    <div className="flex-1 space-y-5 p-5 sm:p-6">
      <div><h2 className="text-xl font-semibold tracking-tight text-slate-900"><Link className="hover:text-indigo-700" to={view.href}>{inquiry.eventName||inquiry.event?.name||'Your '+(inquiry.eventType||'event')+' request'}</Link></h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4 text-slate-400"/>{displayDate(inquiry.eventDate)}{inquiry.endDate&&inquiry.endDate!==inquiry.eventDate?' – '+displayDate(inquiry.endDate):''}</span><span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4 text-slate-400"/>{inquiry.expectedAttendees} guests</span></div>
        {inquiry.proposal?.venue&&<p className="mt-2 text-sm text-slate-500">Proposed venue · {inquiry.proposal.venue}</p>}
      </div>
      <ol aria-label="Request progress" className="grid grid-cols-4 gap-2">{view.steps.map((step,index)=><li key={step.label}>
        <div className={'mb-2 h-1 rounded-full '+(step.done?'bg-indigo-600':'bg-slate-200')}/>
        <p className={'flex items-start gap-1 text-[11px] leading-relaxed '+(step.done?'font-medium text-indigo-800':'text-slate-400')}><span className="shrink-0">{step.done?<CheckIcon className="mt-0.5 h-3 w-3"/>:'0'+(index+1)}</span>{step.label}</p>
      </li>)}</ol>
      <div className={'rounded-xl p-4 '+(view.status==='PROPOSAL_SENT'?'bg-amber-50':'bg-slate-50')}>
        <p className="text-xs font-semibold text-slate-800">{view.terminal?'Recorded outcome':view.status==='PROPOSAL_SENT'?'Proposal ready to review':'What happens next'}</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{view.note}</p>
      </div>
      {inquiry.unmetNeeds&&!view.terminal&&!inquiry.event&&<p className="border-l-2 border-amber-400 pl-3 text-xs leading-relaxed text-amber-900">Your original request needs alternatives. The coordinator can discuss the venue or services with you.</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6"><p className="text-xs text-slate-500">{inquiry.coordinator?.name?'Handled by '+inquiry.coordinator.name:'Waiting for a coordinator to pick up your request'}</p><Link to={view.href} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">{view.action}<ArrowRightIcon className="h-4 w-4"/></Link></div>
  </article>;
}
export default function ClientInquiries() {
  const {state:{currentUser}}=useApp();
  const {data:inquiries,loading,error,reload}=useApiResource(currentUser?.id?`/inquiries/client/${currentUser.id}`:null);
  const [filter,setFilter]=useState('active');const [pageNumber,setPageNumber]=useState(1);
  useEffect(()=>setPageNumber(1),[filter]);
  const mine=inquiries.filter(row=>String(row.clientId)===String(currentUser?.id));
  const groups={all:mine,active:mine.filter(row=>!clientRequest(row).terminal),review:mine.filter(row=>clientRequest(row).status==='PROPOSAL_SENT'),ended:mine.filter(row=>clientRequest(row).terminal)};
  const page=eventPage(groups[filter],pageNumber);
  return <Layout title="My event plans"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Your AICC workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Your event plans</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Follow each request, review your proposal, and see the next step toward your event.</p></div><Link to="/client/new-inquiry" className="btn-primary"><PlusIcon className="h-4 w-4"/>Plan an event</Link></header>
    <section className="grid gap-4 rounded-2xl bg-[#173b3b] p-5 text-white sm:grid-cols-[1.3fr_1fr] sm:p-6" aria-label="How your booking progresses">
      <div><p className="text-sm font-semibold text-[#efd392]">One request, every step in one place</p><p className="mt-2 text-sm leading-relaxed text-emerald-50/85">Your coordinator prepares a proposal. Once you agree, open the contract and payment section to see what is needed to reserve the venue.</p></div><div className="border-t border-white/15 pt-4 text-xs leading-relaxed text-emerald-50/85 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><p><strong className="text-white">Accepted proposal</strong> · Tentative</p><p className="mt-2"><strong className="text-white">Both signatures</strong> · Seven-day venue hold</p><p className="mt-2"><strong className="text-white">Receipt checked</strong> · Venue booking recorded</p></div>
    </section>
    {error?<div role="alert" className="rounded-xl bg-rose-50 p-5 text-sm text-rose-800">{error} <button onClick={reload} className="ml-2 underline">Try again</button></div>:loading?<p role="status" className="surface p-8 text-center text-sm text-slate-500">Loading your event plans…</p>:<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" aria-label="Filter requests">{[['active','In progress'],['review','Proposals to review'],['ended','Completed / ended'],['all','All requests']].map(([key,label])=><button type="button" key={key} onClick={()=>setFilter(key)} aria-pressed={filter===key} className={'rounded-full border px-3.5 py-2 text-sm '+(filter===key?'border-indigo-600 bg-indigo-600 font-semibold text-white':'border-slate-200 bg-white text-slate-600')}>{label}<span className="ml-2 tabular-nums opacity-75">{groups[key].length}</span></button>)}</div><button onClick={reload} className="text-sm font-medium text-indigo-700 hover:underline">Refresh requests</button></div>
      {page.rows.length?<div className="grid items-stretch gap-5 xl:grid-cols-2">{page.rows.map(row=><RequestCard key={row.id} inquiry={row}/>)}</div>:<div className="surface p-10 text-center"><CalendarDaysIcon className="mx-auto h-8 w-8 text-slate-400"/><h2 className="mt-3 font-semibold text-slate-800">{mine.length?'No requests in this view':'Your next event starts here'}</h2><p className="mt-2 text-sm text-slate-500">{mine.length?'Choose another filter to see your requests.':'Tell us your dates, seating setup, attendance and services. A coordinator will help with the arrangements.'}</p>{!mine.length&&<Link to="/client/new-inquiry" className="btn-primary mt-5">Start an event request</Link>}</div>}
      {page.total>15&&<EventPageControls page={page} onChange={setPageNumber} noun="requests"/>}
    </>}
  </div></Layout>;
}
