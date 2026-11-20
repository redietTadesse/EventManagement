import { useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Dialog } from '@headlessui/react';
import { DocumentTextIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { RoomDiagram } from '../components/SeatingPreview';
import { SEATING } from '../utils/proposalBuilder';
import { estimateTables, tableDistribution, roundTableSizes } from '../utils/tablePlan';
import { proposalLabel as serviceLabel } from '../utils/proposalReview';
import { formatEventDate, formatEventRange } from './eventDetailModel';

function bookedRanges(dates) {
  const ranges = [];
  for (const day of dates) {
    const previous = ranges.at(-1);
    if (previous && Date.parse(day) - Date.parse(previous.end) === 86400000) previous.end = day;
    else ranges.push({start:day, end:day});
  }
  return ranges.map(range => formatEventRange(range.start,range.end)).join(', ');
}

function Sheet({ event, reservation, venueKnown, services, vendorsKnown, tasks, tasksKnown, generated }) {
  const layout = SEATING.find(([key]) => key === event.tableSetup);
  const places = event.requestedTableLayout === event.tableSetup && roundTableSizes[event.tableSetup]?.includes(event.requestedGuestsPerTable)
    ? event.requestedGuestsPerTable : null;
  const estimate = estimateTables(event.expectedAttendees, places);
  const remaining = tasks.filter(task => !task.isComplete).sort((a,b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  return <article className="setup-record" aria-label="Event setup sheet">
    <header><small>AICC · Event #{event.id}</small><h2>{event.name}</h2><p>{serviceLabel(event.status)} · Prepared {generated.toLocaleString()}</p></header>
    <dl className="setup-facts">{[['Event dates',formatEventRange(event.date,event.endDate)],['Venue',event.venue || 'To be assigned'],
      ['Guests',event.expectedAttendees?.toLocaleString() || 'To be confirmed'],['Coordinator',event.coordinator?.name || 'To be assigned']].map(([label,value]) =>
      <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <section><h3>Room setup</h3><div className="sheet-layout">
      {layout && <RoomDiagram layout={layout[0]} seatsPerTable={places ?? undefined} />}
      <div><strong>{layout?.[1] || 'Layout to be confirmed'}</strong>
        {estimate && <p>{tableDistribution(estimate)} · estimated from the client’s preference of up to {places} guests per table.</p>}
        {layout && <small>Illustrative layout</small>}
        <h4>Confirmed reservation dates</h4><p>{!venueKnown ? 'Reservation data unavailable. Verify before setup.' : bookedRanges(reservation.bookedDates) || 'No confirmed dates recorded.'}</p>
        {venueKnown && reservation.bookedDates.length > 0 && !reservation.complete && <p>Some event days still need a reservation.</p>}
      </div></div></section>
    <section><h3>Service commitments</h3>{!vendorsKnown ? <p>Vendor commitments could not be verified.</p> : !services.length ? <p>No external services required.</p> :
      <ul>{services.map(row => <li key={row.category}><strong>{serviceLabel(row.category)}</strong>
        <span>{row.state === 'resolved' ? `${row.current.vendorName || 'Vendor name unavailable'} · ${serviceLabel(row.current.status)}` : row.state === 'pending' ? 'Awaiting vendor response' : 'No confirmed vendor'}</span>
        {row.state === 'resolved' && row.current.serviceOrder && <p>{row.current.serviceOrder}</p>}</li>)}</ul>}</section>
    <section><h3>Outstanding preparation</h3>{!tasksKnown ? <p>Preparation tasks could not be verified.</p> : !remaining.length ? <p>{tasks.length ? 'All recorded tasks are complete.' : 'No tasks recorded.'}</p> :
      <ul>{remaining.map(task => <li key={task.id}><strong>{task.itemName}</strong><span>{task.ownerRole ? serviceLabel(task.ownerRole) : 'Owner unassigned'} · {task.dueDate ? formatEventDate(task.dueDate) : 'No due date'}</span></li>)}</ul>}</section>
  </article>;
}

export default function EventSetupSheet(props) {
  const [opened, setOpened] = useState(null);
  const [printCopy, setPrintCopy] = useState(null);
  useEffect(() => {
    const clear = () => setPrintCopy(null);
    window.addEventListener('afterprint', clear);
    return () => window.removeEventListener('afterprint', clear);
  }, []);
  const print = () => {
    flushSync(() => setPrintCopy({ ...props, generated:new Date() }));
    window.print();
  };
  return <><button type="button" className="sheet-launch" onClick={() => setOpened(new Date())}><DocumentTextIcon aria-hidden="true" />Event setup sheet</button>
    <Dialog open={Boolean(opened)} onClose={() => setOpened(null)} className="relative z-[90]">
      <div className="composer-dialog-backdrop" aria-hidden="true" /><div className="composer-dialog-scroll"><Dialog.Panel className="setup-dialog">
        <div className="setup-tools"><Dialog.Title>Event setup sheet</Dialog.Title><button type="button" onClick={print}><PrinterIcon aria-hidden="true"/>Print sheet</button>
          <button type="button" aria-label="Close setup sheet" onClick={() => setOpened(null)}><XMarkIcon aria-hidden="true"/></button></div>
        {opened && <Sheet {...props} generated={opened}/>}
      </Dialog.Panel></div>
    </Dialog>
    {printCopy && createPortal(<div className="setup-print"><Sheet {...printCopy}/></div>, document.body)}
  </>;
}
