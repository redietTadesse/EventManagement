import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import StatusBadge from '../components/StatusBadge';
import useApiResource from '../hooks/useApiResource';
import { calendarDateKey } from '../hooks/useVenueAvailabilityCalendar';
import { formatEventRange } from './eventDetailModel';
import { proposalOverlaps } from './proposalOverlapModel';

export default function ProposalOverlaps({ inquiries, loaded, error, refresh }) {
  const venues = useApiResource('/venues');
  const today = calendarDateKey(new Date());
  const { pairs, skipped } = useMemo(() => proposalOverlaps(inquiries, venues.data, today), [inquiries, venues.data, today]);
  const [roomId, setRoomId] = useState('');
  const [limit, setLimit] = useState(8);
  const visible = pairs.filter(({ first }) => !roomId || String(first.room.id) === roomId);
  const rooms = [...new Map(pairs.map(({ first }) => [first.room.id, first.room])).values()];
  const unavailable = error || venues.error;
  return <section className="desk-sheet">
    <header className="desk-heading"><div><h2>Competing proposals</h2><p>Sent or accepted proposals for the same room with overlapping booking days. Setup and takedown are included.</p></div>
      {rooms.length > 0 && <label>Venue<select value={roomId} onChange={e => { setRoomId(e.target.value); setLimit(8); }}><option value="">All venues</option>{rooms.map(room => <option value={room.id} key={room.id}>{room.name}</option>)}</select></label>}
    </header>
    {unavailable ? <p role="alert" className="desk-notice">The comparison could not be completed. <button onClick={() => { refresh(); venues.reload(); }}>Try again</button></p>
      : !loaded || venues.loading ? <p className="desk-notice" role="status">Checking proposed dates…</p>
      : <><p className="desk-notice" role="status">{visible.length ? `${visible.length} overlapping ${visible.length === 1 ? 'pair' : 'pairs'}. Check the venue schedule for holds and confirmed bookings.` : 'No matching date overlaps found.'}
        {skipped > 0 && ` ${skipped} proposal(s) could not be compared because room or date information is missing.`}</p>
      {visible.slice(0, limit).map(({ first, second, from, through }) => <article key={first.inquiry.id + '-' + second.inquiry.id} className="overlap-pair">
        <header><BuildingOffice2Icon aria-hidden="true"/><div><h3>{first.room.name}</h3><p>Shared dates · {formatEventRange(from, through)}</p></div>
          <Link to={'/coordinator/venue-schedule?inquiry=' + first.inquiry.id + '&compare=' + second.inquiry.id}>Check schedule <ArrowUpRightIcon/></Link></header>
        <div className="overlap-records">{[first, second].map(({ inquiry, from: start, through: end }) => <Link key={inquiry.id} to={'/coordinator/inquiries/' + inquiry.id}>
          <StatusBadge status={inquiry.status}/><strong>{inquiry.eventName || inquiry.eventType}</strong><span>{inquiry.clientName} · {inquiry.coordinator?.name || 'Unclaimed'}</span><span>Full window · {formatEventRange(start, end)}</span>
        </Link>)}</div>
      </article>)}
      {visible.length > limit && <button className="btn-outline m-4" onClick={() => setLimit(limit + 8)}>Show more overlaps</button>}</>}
  </section>;
}
