import { formatEventRange, serviceLabel } from '../coordinator/eventDetailModel';

export default function AgreementRecord({ contract }) {
  const { terms } = contract;
  const facts = [
    ['Client', terms.client], ['Venue', terms.venue],
    ['Event dates', formatEventRange(terms.eventDate, terms.endDate)],
    [contract.state === 'BOOKED' ? 'Original booking window' : 'Proposed booking window', formatEventRange(terms.bookedFrom, terms.bookedThrough)],
    ['Attendance', terms.attendees?.toLocaleString()], ['Seating setup', terms.tableSetup && serviceLabel(terms.tableSetup.toLowerCase())],
    ['Services', terms.services?.length ? terms.services.map(serviceLabel).join(', ') : 'No services selected'],
  ];
  const signers = [
    ['Client', contract.clientSignature, contract.clientSignedAt],
    ['AICC coordinator', contract.coordinatorSignature, contract.coordinatorSignedAt],
  ];
  return <article className="agreement-record" aria-label="Agreement terms and signatures">
    <header><div><p>Addis International Convention Center</p><h3>Event booking agreement</h3><span>{terms.proposalNumber}</span></div>
      <div className="agreement-value"><span>Agreed total</span><strong>ETB {terms.totalEtb?.toLocaleString() ?? '—'}</strong></div></header>
    <h4>{terms.eventName || terms.eventType}</h4>
    {contract.state === 'TERMS_CHANGED' && <p role="status">These terms have changed. Review the current proposal with the coordinator.</p>}
    <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'To be agreed'}</dd></div>)}</dl>
    {terms.proposalTerms && <section className="agreement-terms"><h4>Agreed terms</h4><p>{terms.proposalTerms}</p></section>}
    <section className="agreement-signatures" aria-label="Recorded signatures">{signers.map(([role, name, time]) => <div key={role}>
      <h4>{role} signature</h4><strong>{name || 'Awaiting signature'}</strong>
      {time && <time dateTime={time}>{new Intl.DateTimeFormat('en-GB', { dateStyle:'medium', timeStyle:'short', timeZone:'Africa/Addis_Ababa' }).format(new Date(time))} · Addis Ababa</time>}
    </div>)}</section>
  </article>;
}
