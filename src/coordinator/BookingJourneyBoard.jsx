import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';
import StatusBadge from '../components/StatusBadge';
import { bookingJourney } from './bookingJourneyModel';
import { holdDeadline, inquiryNextAction, proposalTerms } from './bookingWorkspaceModel';
import { formatEventRange, serviceLabel } from './eventDetailModel';

function DecisionPanel({ row, stage, currentUserId, onClaim, onConflict }) {
  const mine = currentUserId != null && String(row.coordinator?.id) === String(currentUserId);
  const readOnly = Boolean(row.coordinator && !mine);
  const needsAgreement = mine && stage.id === 'contract';
  const agreement = useApiResource(needsAgreement ? `/inquiries/${row.id}/booking-agreement` : null);
  const contract = needsAgreement && !agreement.error && agreement.data?.state ? agreement.data : null;
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const next = inquiryNextAction(row, contract, readOnly);
  const terms = contract?.terms ?? proposalTerms(row);
  const guests = terms.attendees ?? terms.expectedAttendees ?? row.expectedAttendees;
  const setup = terms.tableSetup || row.tableSetup;
  const amount = terms.totalEtb ?? terms.price;
  const deadline = holdDeadline(contract);
  const hasEvent = Boolean(row.event?.id);
  const claimable = !hasEvent && next.target === 'ownership' && ['inquiry', 'proposal', 'contract'].includes(stage.id);
  const target = ['proposal','agreement','history','request'].includes(next.target) ? '?section=' + next.target : '';
  const href = hasEvent ? row.href : row.href + target;
  const title = hasEvent || stage.id === 'unknown' ? stage.action : next.title;
  const detail = hasEvent || stage.id === 'unknown' ? stage.description : next.detail;

  async function claim() {
    setSaving(true);
    setFailure('');
    try {
      const { data } = await api.post(`/inquiries/${row.id}/coordinator/claim`);
      onClaim(row.id, data.coordinator);
    } catch (err) {
      if (err.response?.status === 409) onConflict(row.name);
      else setFailure(err.response?.data?.message || 'Could not claim this request. Please try again.');
    } finally { setSaving(false); }
  }

  return <article className="booking-brief" aria-label="Selected booking">
    <header><div><p>{row.clientName || 'Client request'}</p><h3>{row.name}</h3></div><StatusBadge status={row.currentStatus}/></header>
    <section className="brief-decision">
      <h4>{needsAgreement && agreement.loading ? 'Checking the contract…' : title}</h4>
      <p>{needsAgreement && agreement.error ? 'Contract details could not be loaded.' : detail}</p>
      {agreement.error && needsAgreement && <button type="button" onClick={agreement.reload}>Retry contract check</button>}
      {claimable ? <button type="button" disabled={saving || currentUserId == null} onClick={claim}>{saving ? 'Claiming…' : 'Claim this work'}<ArrowRightIcon/></button> :
        <Link to={href}>{hasEvent || stage.id === 'unknown' || next.target === 'refresh' ? 'Open full record' : next.action}<ArrowRightIcon/></Link>}
      {failure && <p role="alert">{failure}</p>}
    </section>
    <dl className="brief-facts">
      <div><dt>{terms.eventDate ? 'Proposal dates' : 'Requested dates'}</dt><dd>{formatEventRange(terms.eventDate || row.eventDate, terms.eventDate ? terms.endDate : row.endDate)}</dd></div>
      <div><dt>Guests and seating</dt><dd>{guests != null ? Number(guests).toLocaleString() + ' guests' : 'Attendance pending'}{setup && ' · ' + serviceLabel(setup.toLowerCase())}</dd></div>
      <div><dt>{terms.venue ? 'Proposed venue' : 'Preferred venue'}</dt><dd>{terms.venue || row.preferredVenueName || 'No preference recorded'}</dd></div>
      <div><dt>Proposal value</dt><dd>{amount != null ? 'ETB ' + Number(amount).toLocaleString() : 'To be agreed'}</dd></div>
    </dl>
    {contract?.terms?.bookedFrom && <p className="brief-window"><strong>Full venue window</strong> {formatEventRange(contract.terms.bookedFrom, contract.terms.bookedThrough)}</p>}
    {deadline && <p className="brief-window"><strong>{deadline.value}</strong> · {deadline.detail}</p>}
    <footer><span><UserCircleIcon/>{row.coordinator?.name || 'Unassigned'}</span><Link to={row.href}>View {row.name}</Link></footer>
  </article>;
}

export default function BookingJourneyBoard({ inquiries, currentUserId, loaded, error, onClaim, onConflict }) {
  const [scope, setScope] = useState('mine');
  const [chosenStage, setChosenStage] = useState('');
  const [chosenId, setChosenId] = useState(null);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(15);
  const report = useMemo(() => bookingJourney(inquiries, scope, currentUserId), [inquiries, scope, currentUserId]);
  const query = search.trim().toLowerCase();
  const stages = report.stages.map(stage => ({ ...stage, rows: stage.rows.filter(row =>
    [row.name, row.clientName, row.coordinator?.name, row.id].some(value => String(value ?? '').toLowerCase().includes(query))) }));
  const stage = stages.find(item => item.id === chosenStage) || stages.find(item => item.rows.length) || stages[0];
  const row = stage.rows.slice(0, limit).find(item => item.id === chosenId) || stage.rows[0];
  function resetSelection() { setChosenStage(''); setChosenId(null); setLimit(15); }

  return <section className="desk-sheet booking-desk" aria-label="Booking board">
    <header className="desk-heading"><div><h2>Booking desk</h2><p>Choose a stage to see who is waiting and what you can do next.</p></div>
      <label>Show work for<select value={scope} onChange={e => { setScope(e.target.value); resetSelection(); }}><option value="mine">Me and unclaimed requests</option><option value="all">All coordinators</option></select></label></header>
    {error && <p role="alert" className="desk-notice">{loaded ? 'Showing the last loaded requests.' : 'The requests could not be loaded.'} Refresh the workspace to try again.</p>}
    {loaded ? <>
      <div className="booking-stages" role="group" aria-label="Filter by booking stage">{stages.map(item =>
        <button type="button" key={item.id} className={'lane-' + item.id} aria-pressed={stage.id === item.id} onClick={() => { setChosenStage(item.id); setChosenId(null); setLimit(15); }}>
          <strong>{item.rows.length}</strong><span>{item.label}</span>
        </button>)}</div>
      <div className="booking-split"><div className="booking-index">
        <label className="desk-search"><MagnifyingGlassIcon aria-hidden="true"/><span className="sr-only">Search all stages</span><input type="search" value={search} onChange={e => {setSearch(e.target.value); resetSelection();}} placeholder="Search all stages"/></label>
        {row && <label className="booking-mobile-picker">Selected request<select value={row.id} onChange={event => {
          const index = stage.rows.findIndex(item => String(item.id) === event.target.value);
          if (index >= 0) { setLimit(Math.max(limit, index + 1)); setChosenId(stage.rows[index].id); }
        }}>{stage.rows.map(item => <option key={item.id} value={item.id}>{item.name} · {item.clientName || 'Client request'}</option>)}</select></label>}
        <ul>{stage.rows.slice(0, limit).map(item => <li key={item.id}><button type="button" aria-pressed={row?.id === item.id} onClick={() => setChosenId(item.id)}>
          <strong>{item.name}</strong><small>{item.clientName || 'Client request'}</small></button></li>)}</ul>
        {stage.rows.length > limit && <button className="lane-more" type="button" onClick={() => setLimit(limit + 15)}>Show more requests</button>}
      </div>{row ? <DecisionPanel key={row.id} row={row} stage={stage} currentUserId={currentUserId} onClaim={onClaim} onConflict={onConflict}/> :
        <div className="booking-empty"><h3>{query ? 'No matches at this stage' : 'No requests at this stage'}</h3><p>{query ? 'Try another name or clear your search.' : 'Select another stage to review its bookings.'}</p>{query && <button className="lane-more" onClick={() => {setSearch(''); resetSelection();}}>Clear search</button>}</div>}</div>
    </> : !error && <p role="status" className="desk-notice">Loading the booking desk…</p>}
  </section>;
}
