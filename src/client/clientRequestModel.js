const ended=new Set(['CANCELLED','CLOSED','COMPLETED','PROPOSAL_REJECTED']);
export function clientRequest(inquiry) {
  const status=inquiry.event?.status||inquiry.status;
  const terminal=ended.has(status);
  const accepted=inquiry.status==='PROPOSAL_ACCEPTED'||Boolean(inquiry.event);
  const proposed=Boolean(inquiry.proposal)||accepted||['PROPOSAL_SENT','PROPOSAL_REJECTED'].includes(status);
  const steps=[{label:'Request sent',done:true},{label:'Proposal received',done:proposed},
    {label:'Proposal accepted',done:accepted},{label:'Event created',done:Boolean(inquiry.event)}];
  let action='Open request', note='Your coordinator will review your requirements and prepare a proposal.';
  if(status==='PROPOSAL_SENT'){action='Review proposal';note='Open the latest proposal to accept it, request changes, or check messages from your coordinator.';}
  if(status==='PROPOSAL_ACCEPTED'){action='Open contract & payment';note='Check signatures, the venue hold deadline, and the payment receipt in your booking agreement.';}
  if(inquiry.event){action='Open event';note=status==='CONFIRMED'?'Your event is confirmed. Check the details and remaining preparation.':'Follow venue, vendor and preparation updates in your event.';}
  if(status==='NEEDS_COORDINATOR')note='Your coordinator is working on a service that still needs arranging.';
  if(status==='AWAITING_VENDORS')note='The event is waiting for vendor responses. You can follow the updates.';
  if(terminal){action='View outcome';note='The outcome and earlier decisions are available in this record.';}
  return {status,terminal,steps,action,note,href:inquiry.event?.id?`/client/events/${inquiry.event.id}`:`/client/inquiries/${inquiry.id}`};
}
