import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, CalendarDaysIcon, UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { bookingJourney } from './bookingJourneyModel';
import { formatEventRange } from './eventDetailModel';
import StatusBadge from '../components/StatusBadge';

const bookingStages = ['inquiry', 'proposal', 'contract'];
const eventStages = ['vendors', 'confirmed', 'finished', 'unknown'];

function StageColumn({ stage, search }) {
  const [limit, setLimit] = useState(5);
  const rows = stage.rows.filter(row => [row.name, row.clientName, row.coordinator?.name, row.id]
    .some(value => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  return <section className={'desk-lane lane-' + stage.id} aria-label={stage.label}>
    <header><h3>{stage.label}</h3><span aria-label={rows.length + ' records'}>{rows.length}</span></header>
    <ul>{rows.slice(0, limit).map(row => <li key={row.id}><Link to={row.href} className="desk-record">
      <span className="record-client">{row.clientName || 'Client request'} <ArrowUpRightIcon aria-hidden="true"/></span>
      <strong>{row.name}</strong><span className="record-date"><CalendarDaysIcon aria-hidden="true"/>{formatEventRange(row.eventDate, row.endDate)}</span>
      {['vendors','finished','unknown'].includes(stage.id) && <StatusBadge status={row.currentStatus}/>}
      <span className="record-owner"><UserCircleIcon aria-hidden="true"/>{row.coordinator?.name || 'Available to claim'}</span>
    </Link></li>)}</ul>
    {!rows.length && <p className="lane-empty">{search ? 'No matches at this stage' : 'No requests at this stage'}</p>}
    {rows.length > limit && <button className="lane-more" onClick={() => setLimit(limit + 5)}>Show more ({rows.length - limit})</button>}
  </section>;
}

export default function BookingJourneyBoard({ inquiries, currentUserId, loaded, error }) {
  const [scope, setScope] = useState('mine');
  const [group, setGroup] = useState('bookings');
  const [search, setSearch] = useState('');
  const report = useMemo(() => bookingJourney(inquiries, scope, currentUserId), [inquiries, scope, currentUserId]);
  const stageIds = group === 'bookings' ? bookingStages : eventStages;
  return <section className="desk-sheet" aria-label="Booking board">
    <header className="desk-heading"><div><h2>Booking board</h2><p>Open a request to see the decision, the dates and who owns the next step.</p></div>
      <label>Show work for<select value={scope} onChange={e => setScope(e.target.value)}><option value="mine">Me and unclaimed requests</option><option value="all">All coordinators</option></select></label></header>
    <div className="board-controls"><div className="desk-switch" aria-label="Booking stages">{[['bookings','Before booking',bookingStages],['events','Events & outcomes',eventStages]].map(([key,label,ids]) =>
      <button type="button" key={key} aria-pressed={group === key} onClick={() => setGroup(key)}>{label} {loaded && <span>{report.stages.filter(s => ids.includes(s.id)).reduce((sum,s) => sum+s.rows.length,0)}</span>}</button>)}</div>
      <label className="desk-search"><MagnifyingGlassIcon aria-hidden="true"/><span className="sr-only">Find a booking on the board</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find event, client or owner"/></label></div>
    {error && <p role="alert" className="desk-notice">{loaded ? 'Showing the last loaded requests.' : 'The requests could not be loaded.'} Refresh the workspace to try again.</p>}
    {loaded ? <div className="desk-lanes">{report.stages.filter(s => stageIds.includes(s.id)).map(stage =>
      <StageColumn key={stage.id + scope} stage={stage} search={search}/>)}</div>
      : !error && <p role="status" className="desk-notice">Loading the booking board…</p>}
  </section>;
}
