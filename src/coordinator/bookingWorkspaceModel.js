export function proposalTerms(inquiry) {
  try {
    const value = typeof inquiry?.proposal === 'string' ? JSON.parse(inquiry.proposal) : inquiry?.proposal;
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}

export function bookingProgress(inquiry, contract) {
  const accepted = ['PROPOSAL_ACCEPTED', 'EVENT_CREATED'].includes(inquiry.status);
  const signed = contract?.state !== 'TERMS_CHANGED' && Boolean(contract?.clientSignedAt && contract?.coordinatorSignedAt);
  const booked = contract?.state === 'BOOKED';
  const receipt = contract?.state !== 'TERMS_CHANGED' && Boolean(contract?.receiptUploadedAt && !contract?.rejectionReason);
  const stopped = ['PROPOSAL_REJECTED', 'CANCELLED', 'CLOSED'].includes(inquiry.status);
  const stages = [
    { id: 'request', label: 'Request received', detail: 'Requirements recorded', done: true },
    { id: 'proposal', label: 'Proposal agreed', detail: accepted ? 'Accepted by the client' : inquiry.proposal ? 'Waiting for client decision' : 'Prepare the offer', done: accepted },
    { id: 'agreement', label: 'Contract signed', detail: signed ? 'Both signatures recorded' : contract?.clientSignedAt ? 'AICC signature needed' : contract?.coordinatorSignedAt ? 'Client signature needed' : 'Client and AICC signatures', done: signed },
    { id: 'payment', label: 'Payment reviewed', detail: booked ? 'Receipt verified' : receipt ? 'Receipt ready to review' : contract?.rejectionReason ? 'Replacement receipt needed' : 'Payment receipt needed', done: booked },
    { id: 'booked', label: 'Venue booked', detail: booked ? 'Continue event preparation' : 'After receipt verification', done: booked },
  ];
  const current = stopped ? -1 : stages.findIndex(stage => !stage.done);
  return stages.map((stage, index) => ({ ...stage, state: stage.done ? 'complete' : index === current ? 'current' : 'upcoming' }));
}

export function inquiryNextAction(inquiry, contract, readOnly, now = Date.now()) {
  if (inquiry.event?.id) return {
    title: 'Continue in the event workspace', detail: 'The event record holds vendor commitments, preparation tasks and event issues.',
    action: 'Open event workspace', href: `/coordinator/events/${inquiry.event.id}`, target: 'event', tone: 'success',
  };
  if (readOnly) return { title: `${inquiry.coordinator?.name || 'Another coordinator'} is handling this request`,
    detail: 'You can review the request and proposal history. Changes belong to the handling coordinator.', action: 'View request details', target: 'request', tone: 'quiet' };
  if (['PROPOSAL_REJECTED', 'CANCELLED', 'CLOSED'].includes(inquiry.status)) return {
    title: inquiry.status === 'PROPOSAL_REJECTED' ? 'The client declined this proposal' : 'This request has ended',
    detail: 'The recorded proposal and decisions remain available for review.', action: 'View history', target: 'history', tone: 'quiet',
  };
  if (!inquiry.coordinator) return { title: 'Choose who will handle this request', detail: 'Claim the inquiry to take responsibility for its proposal and booking follow-up.', action: 'Claim this work', target: 'ownership', tone: 'action' };
  if (inquiry.status === 'INQUIRY_SUBMITTED') return { title: 'Prepare the client’s proposal', detail: 'Review the dates, seating capacity and service needs, then send the venue, price and terms together.', action: 'Prepare proposal', target: 'proposal', tone: 'action' };
  if (inquiry.status === 'PROPOSAL_SENT') return { title: 'Waiting for the client’s decision', detail: 'The client can accept, ask for changes or decline. You can revise the proposal when negotiation is needed.', action: 'Review proposal', target: 'proposal', tone: 'quiet' };
  if (contract?.availabilityWarning || contract?.state === 'TERMS_CHANGED') return { title: 'Resolve the booking terms before proceeding', detail: contract.availabilityWarning || 'The contract differs from the current proposal. Review the terms with the client.', action: 'Review contract', target: 'agreement', tone: 'warning' };
  if (contract?.paymentDueAt && contract.state !== 'BOOKED' && Date.parse(contract.paymentDueAt) <= now) return {
    title: 'The seven-day venue hold has ended', detail: 'These dates are no longer protected. Check availability and contact the client before continuing.', action: 'Review booking status', target: 'agreement', tone: 'warning',
  };
  switch (contract?.state) {
    case 'AWAITING_SIGNATURES': return { title: contract.coordinatorSignedAt ? 'Waiting for the client’s signature' : 'Review and sign the contract', detail: 'Both signatures are needed before the seven-day payment hold begins.', action: 'Review contract', target: 'agreement', tone: contract.coordinatorSignedAt ? 'quiet' : 'action' };
    case 'AWAITING_RECEIPT': return { title: 'Waiting for the payment receipt', detail: 'The client must upload proof of payment. The venue becomes booked after you review and verify it.', action: 'View payment deadline', target: 'agreement', tone: 'quiet' };
    case 'RECEIPT_REJECTED': return { title: 'Waiting for a replacement receipt', detail: `Correction requested: ${contract.rejectionReason || 'Ask the client to review the payment evidence.'}`, action: 'View receipt review', target: 'agreement', tone: 'warning' };
    case 'AWAITING_REVIEW': return { title: 'Payment receipt is ready for your review', detail: 'Download the receipt and check it against the agreed total. Verification books the venue and begins vendor coordination.', action: 'Review payment receipt', target: 'agreement', tone: 'action' };
    case 'BOOKED': return { title: 'Payment verified and venue booked', detail: 'Open the linked event to continue with vendors and preparation.', action: 'Refresh request', target: 'refresh', tone: 'success' };
    default: return { title: 'Review the contract and payment status', detail: 'The proposal has been accepted. Check both signatures and the latest payment status before proceeding.', action: 'Open contract', target: 'agreement', tone: 'quiet' };
  }
}

export function holdDeadline(contract, now = Date.now()) {
  if (!contract?.paymentDueAt || contract.state === 'BOOKED') return null;
  const remaining = Date.parse(contract.paymentDueAt) - now;
  if (!Number.isFinite(remaining)) return null;
  if (remaining <= 0) return { value: 'Hold expired', detail: 'Availability must be checked again', tone: 'warning' };
  const hours = Math.ceil(remaining / 3600000);
  return { value: hours > 48 ? `${Math.ceil(hours / 24)} days remaining` : `${hours} ${hours === 1 ? 'hour' : 'hours'} remaining`,
    detail: contract.paymentHoldActive ? 'Protected contract window' : 'Deadline recorded · no active hold', tone: contract.paymentHoldActive ? 'held' : 'warning' };
}
