import { Link } from 'react-router-dom';
import { ArrowRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import StatusBadge from '../components/StatusBadge';
import useApiResource from '../hooks/useApiResource';
import { formatEventRange } from '../coordinator/eventDetailModel';
import { proposalTerms } from '../coordinator/bookingWorkspaceModel';

const agreementSteps = {
  AWAITING_RECEIPT: ['Upload your payment receipt', 'Open the agreement for the payment terms and receipt upload.'],
  RECEIPT_REJECTED: ['Replace your receipt', 'Your coordinator returned the receipt. Check the reason before uploading another copy.'],
  AWAITING_REVIEW: ['Your receipt is with AICC', 'Your coordinator will check your payment and record the booking.'],
  TERMS_CHANGED: ['Review the revised terms', 'Contact your coordinator before continuing with payment.'],
  BOOKED: ['Your venue has been booked', 'Open the booking for the latest event details.'],
};

function nextStep(status, contract, event) {
  if (contract?.availabilityWarning) return ['Check the room with your coordinator', contract.availabilityWarning];
  if (contract?.paymentDueAt && contract.state !== 'BOOKED' && Date.parse(contract.paymentDueAt) <= Date.now()) {
    return ['Your payment hold has ended', 'Contact your coordinator to check the room before making a payment.'];
  }
  if (contract?.state === 'AWAITING_SIGNATURES') return contract.clientSignedAt
    ? ['Waiting for AICC to sign', 'You have signed the agreement. Both signatures are needed for the payment hold.']
    : ['Review and sign your agreement', 'Check the room, dates and agreed total before signing.'];
  if (agreementSteps[contract?.state]) return agreementSteps[contract.state];
  if (event) {
    if (status === 'COMPLETED') return ['Your event is complete', 'Review the services delivered and rate eligible vendor assignments.'];
    if (['CLOSED','CANCELLED'].includes(status)) return ['This event has ended', 'Your event details are available for reference.'];
    if (status === 'CONFIRMED') return ['Your event is confirmed', 'Open the event to see your service arrangements.'];
    return ['AICC is preparing your event', 'Follow vendor replies and service arrangements in your event details.'];
  }
  if (status === 'PROPOSAL_SENT') return ['Your proposal is ready', 'Review the venue, price and services. You can accept or ask for changes.'];
  if (status === 'PROPOSAL_ACCEPTED') return ['Check your booking agreement', 'The agreement records both signatures, the payment deadline and receipt review.'];
  if (status === 'INQUIRY_SUBMITTED') return ['Your request is with AICC', 'Your coordinator will review your requirements before sending a proposal.'];
  return ['Review your request', 'Open the request for its recorded decisions and history.'];
}

export default function ClientPlanBrief({ inquiry, event }) {
  const status = event?.status || inquiry.status;
  const accepted = !event && status === 'PROPOSAL_ACCEPTED';
  const agreement = useApiResource(accepted ? `/inquiries/${inquiry.id}/booking-agreement` : null);
  const contract = accepted && agreement.data?.state ? agreement.data : null;
  const [title, note] = nextStep(status, contract, event);
  const proposal = proposalTerms(inquiry);
  const terms = contract?.terms;
  const date = event?.eventDate || terms?.eventDate || proposal.eventDate || inquiry.eventDate;
  const end = event?.endDate || terms?.endDate || proposal.endDate || inquiry.endDate;
  const closed = ['CANCELLED','CLOSED','COMPLETED','PROPOSAL_REJECTED'].includes(status);
  const step = event ? 3 : accepted ? 2 : status === 'PROPOSAL_SENT' ? 1 : 0;
  return <article className="plan-brief">
    <header><StatusBadge status={status}/><h2>{event?.name || terms?.eventName || proposal.eventName || inquiry.eventName || inquiry.eventType}</h2>
      <p>{formatEventRange(date, end)} · {event?.venue || terms?.venue || proposal.venue || 'Venue to be agreed'}</p></header>
    {!closed && <ol className="plan-track" aria-label="Booking progress">{['Request','Proposal','Agreement','Event'].map((label,i) =>
      <li key={label} className={i <= step ? 'reached' : ''} aria-current={step === i ? 'step' : undefined}>{label}</li>)}</ol>}
    <div className="plan-next" aria-live="polite"><h3>{title}</h3><p>{note}</p>
      {accepted && agreement.loading && <p role="status">Checking agreement…</p>}
      {accepted && agreement.error && <p role="alert">Agreement status unavailable. <button onClick={agreement.reload}>Retry</button></p>}
      {contract?.paymentDueAt && contract.state !== 'BOOKED' && <p className="payment-line"><ClockIcon/>{contract.paymentHoldActive && Date.parse(contract.paymentDueAt) > Date.now() ? 'Payment hold until' : 'Payment deadline'} {new Date(contract.paymentDueAt).toLocaleString()}</p>}
      <Link className="btn-primary" to={event ? '/client/events/' + event.id : '/client/inquiries/' + inquiry.id + (accepted ? '#client-agreement' : status === 'PROPOSAL_SENT' ? '#client-proposal' : '')}>
        {event ? 'Open event' : accepted ? 'Open agreement' : status === 'PROPOSAL_SENT' ? 'Review proposal' : 'Open request'}<ArrowRightIcon/></Link></div>
    <footer><span>Coordinator <strong>{inquiry.coordinator?.name || event?.coordinator?.name || 'Awaiting assignment'}</strong></span>
      {terms?.totalEtb != null && <span>Agreed total <strong>ETB {terms.totalEtb.toLocaleString()}</strong></span>}</footer>
  </article>;
}
