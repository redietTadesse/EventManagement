import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import EventPlanForm from '../components/EventPlanForm';
import ClientPlanBrief from './ClientPlanBrief';
import { useApp } from '../context/AppContext';
import useApiResource from '../hooks/useApiResource';
import { formatEventDate } from '../coordinator/eventDetailModel';
import { statusLabel } from '../utils/status';

const closed = ['CANCELLED','CLOSED','COMPLETED','PROPOSAL_REJECTED'];

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { state: { currentUser } } = useApp();
  const inquiries = useApiResource(currentUser?.id ? '/inquiries/client/' + currentUser.id : null);
  const events = useApiResource('/events');
  const [selection, setSelection] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [limit, setLimit] = useState(8);
  const mine = inquiries.data.filter(i => String(i.clientId) === String(currentUser?.id));
  const eventById = new Map(events.data.map(e => [String(e.id), e]));
  const eventByInquiry = new Map(events.data.filter(e => e.inquiryId != null).map(e => [String(e.inquiryId), e]));
  const plans = mine.map(inquiry => ({ key: 'i-' + inquiry.id, inquiry,
    event: eventByInquiry.get(String(inquiry.id)) || eventById.get(String(inquiry.event?.id)) || inquiry.event }));
  const linked = new Set(plans.filter(p => p.event).map(p => String(p.event.id)));
  for (const event of events.data) if (!linked.has(String(event.id))) plans.push({ key: 'e-' + event.id, inquiry: {}, event });
  const status = p => p.event?.status || p.inquiry.status;
  const updated = p => p.event?.updatedAt || p.inquiry.updatedAt || p.event?.createdAt || p.inquiry.createdAt || '';
  plans.sort((a,b) => updated(b).localeCompare(updated(a)) || (b.inquiry.id || b.event.id) - (a.inquiry.id || a.event.id));
  const list = plans.filter(p => closed.includes(status(p)) === showHistory);
  const selected = list.find(p => p.key === selection) || list[0];
  const loading = inquiries.loading || events.loading;
  const failed = inquiries.error || events.error;
  const firstVisit = !loading && !failed && !plans.length;
  return <Layout title="My event plans"><div className="space-y-6">
    <header className="desk-mast"><div><p>Client workspace</p><h1>My event plans</h1><span>{currentUser?.fullName || currentUser?.username}</span></div>
      <div className="mast-actions"><Link className="btn-outline" to="/client/venues">Explore venues</Link><Link className="btn-primary" to="/client/new-inquiry"><PlusIcon/>Plan an event</Link></div></header>
    {failed && <p role="alert" className="desk-notice">Some of your plans could not be loaded. <button onClick={() => { inquiries.reload(); events.reload(); }}>Try again</button></p>}
    {loading ? <p role="status" className="desk-notice">Loading your plans…</p> : !firstVisit && <section className="plan-library" aria-label="Your plans">
      <div className="plan-shelf"><div className="desk-switch">{[[false,'Active'],[true,'Past']].map(([past,label]) => <button key={label} aria-pressed={showHistory === past} onClick={() => {setShowHistory(past);setLimit(8);}}>{label} <span>{plans.filter(p => closed.includes(status(p)) === past).length}</span></button>)}</div>
        <ul>{list.slice(0, limit).map(p => <li key={p.key}><button className="shelf-item" aria-pressed={selected?.key === p.key} onClick={() => setSelection(p.key)}>
          <span>{statusLabel(status(p))}</span><strong>{p.event?.name || p.inquiry.eventName || p.inquiry.eventType}</strong><small><CalendarDaysIcon/>{formatEventDate(p.event?.eventDate || p.inquiry.eventDate)}</small>
        </button></li>)}</ul>{list.length > limit && <button className="lane-more" onClick={() => setLimit(limit + 8)}>Show more plans</button>}
      </div>
      {selected ? <ClientPlanBrief key={selected.key} inquiry={selected.inquiry} event={selected.event}/> : <div className="plan-blank"><h2>{failed ? 'Your plan list is incomplete' : showHistory ? 'No past plans yet' : 'No active plans'}</h2><Link className="btn-outline" to="/client/inquiries">See my inquiries</Link></div>}
    </section>}
    <details className="desk-sheet planner-disclosure" open={firstVisit || undefined}><summary>Find a venue for a new event</summary>
      <EventPlanForm plan={{eventType:'meeting'}} dateRequired className="planner-fields" onSearch={query => navigate('/client/venues?' + query)}><button className="btn-primary" type="submit">Check venues <ArrowRightIcon/></button></EventPlanForm>
    </details>
  </div></Layout>;
}
