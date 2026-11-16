const definitions = [
  {id:'inquiry',label:'New requests',dot:'bg-sky-500',statuses:['INQUIRY_SUBMITTED'],waiting:'Coordinator review',action:'Pick up the request',description:'Check the client’s dates, seating setup, attendance and service needs, then prepare a proposal.'},
  {id:'proposal',label:'With the client',dot:'bg-amber-500',statuses:['PROPOSAL_SENT'],waiting:'Proposal decision or revision',action:'Follow up on the proposal',description:'Open the request to review the latest version, respond to requested changes, or check the client’s decision.'},
  {id:'contract',label:'Contract & payment',dot:'bg-violet-500',statuses:['PROPOSAL_ACCEPTED'],waiting:'Signatures or payment review',action:'Check the booking agreement',description:'The proposal is accepted. Open the contract to see signatures, the payment hold deadline, and any receipt needing review.'},
  {id:'vendors',label:'Service commitments',dot:'bg-indigo-500',statuses:['EVENT_CREATED','AWAITING_VENDORS','NEEDS_COORDINATOR'],waiting:'Vendor replies or coordinator action',action:'Review offers and replacements',description:'Check pending offers, their response deadlines, and services that need coordinator help. Earlier attempts stay in the history.'},
  {id:'confirmed',label:'Confirmed events',dot:'bg-emerald-500',statuses:['CONFIRMED'],waiting:'Preparation and delivery',action:'Check the remaining preparation',description:'The required vendor commitments are in place. Checklist tasks and reported issues may still need work before the event.'},
  {id:'finished',label:'Completed / ended',dot:'bg-slate-400',statuses:['COMPLETED','CLOSED','CANCELLED','PROPOSAL_REJECTED'],waiting:'Outcome and history',action:'Review how the work ended',description:'Open the record to distinguish completed events, cancellations and declined proposals, and inspect their history.'},
];
export function bookingJourney(inquiries = [], scope = 'mine', userId) {
  const unique=new Map();
  for(const inquiry of inquiries) {
    if(scope==='mine' && inquiry.coordinator && String(inquiry.coordinator.id)!==String(userId))continue;
    const currentStatus=inquiry.event?.status || inquiry.status;
    unique.set(String(inquiry.id),{...inquiry,currentStatus,name:inquiry.eventName||inquiry.event?.name||inquiry.eventType||'Event request',
      href:inquiry.event?.id?`/coordinator/events/${inquiry.event.id}${['AWAITING_VENDORS','NEEDS_COORDINATOR','EVENT_CREATED'].includes(currentStatus)?'?tab=vendors':''}`:`/coordinator/inquiries/${inquiry.id}`});
  }
  const rows=[...unique.values()].sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'')||Number(b.id)-Number(a.id));
  const stages=definitions.map(stage=>({...stage,rows:rows.filter(row=>stage.statuses.includes(row.currentStatus))}));
  const unknown=rows.filter(row=>!definitions.some(stage=>stage.statuses.includes(row.currentStatus)));
  if(unknown.length)stages.push({id:'unknown',label:'Needs review',dot:'bg-rose-500',waiting:'Status unavailable',action:'Check these records',description:'Their current status is missing or unrecognized. Open the records before deciding the next step.',rows:unknown});
  return {total:rows.length,stages};
}
