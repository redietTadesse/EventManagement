import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import AuditTimeline from '../components/AuditTimeline';
import StatusBadge from '../components/StatusBadge';
import RichProposalForm from '../components/RichProposalForm';
import BookingAgreement from '../components/BookingAgreement';
import BookingProgress from '../components/BookingProgress';
import ConversionPreviewModal from '../components/ConversionPreviewModal';
import CoordinatorOwnership from '../components/CoordinatorOwnership';
import ProposalReview from '../components/ProposalReview';
import InquiryEditForm from './InquiryEditForm';
import { useApp } from '../context/AppContext';
import { formatEventRange, serviceLabel } from './eventDetailModel';
import { holdDeadline, inquiryNextAction, proposalTerms } from './bookingWorkspaceModel';

const sections = [['request', 'Client requirements'], ['proposal', 'Proposal & versions'], ['agreement', 'Contract & payment'], ['history', 'Activity']];

export default function InquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, fetchInquiryById, downloadInquiryQuote, previewConversion } = useApp();
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contract, setContract] = useState(null);
  const [contractRevision, setContractRevision] = useState(0);
  const [section, setSection] = useState('request');
  const [editingProposal, setEditingProposal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(false);
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const tabs = useRef({});
  const ownership = useRef(null);
  const [now, setNow] = useState(Date.now());

  const loadInquiry = useCallback(async () => {
    setLoading(true);
    try { setInquiry(await fetchInquiryById(id)); setContract(null); setContractRevision(value => value + 1); setError(''); }
    catch (err) { setError(err.response?.data?.message || 'Could not load this request.'); }
    finally { setLoading(false); }
  }, [id, fetchInquiryById]);
  useEffect(() => { setInquiry(null); setEditingProposal(false); setEditingRequest(false); loadInquiry(); }, [loadInquiry]);
  useEffect(() => { setSection(inquiry?.status === 'PROPOSAL_ACCEPTED' ? 'agreement' : inquiry?.proposal ? 'proposal' : 'request'); }, [id, inquiry?.status]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);

  async function downloadQuote() {
    setBusy('quote'); setError('');
    try {
      const pdf = await downloadInquiryQuote(id);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a'); link.href = url; link.download = 'quote.pdf'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.response?.data?.message || 'Could not download the quotation.'); }
    finally { setBusy(''); }
  }
  async function openPreview() {
    setBusy('preview'); setError('');
    try { setPreview(await previewConversion(id)); }
    catch (err) { setError(err.response?.data?.message || 'Could not check venue and vendor options.'); }
    finally { setBusy(''); }
  }
  function selectSection(value) { setSection(value); tabs.current[value]?.focus(); }
  function goTo(target) {
    if (target === 'ownership') { ownership.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); ownership.current?.focus(); }
    else if (target === 'refresh') loadInquiry();
    else selectSection(['payment', 'booked'].includes(target) ? 'agreement' : target);
  }

  if (!inquiry) return <Layout title="Booking workspace"><p role={error ? 'alert' : 'status'} className="surface p-8">{error || 'Loading the booking workspace…'}{error && <button type="button" onClick={loadInquiry} className="ml-3 underline">Retry</button>}</p></Layout>;
  const proposal = proposalTerms(inquiry);
  const readOnly = Boolean(inquiry.coordinator && String(inquiry.coordinator.id) !== String(state.currentUser?.id));
  const accepted = inquiry.status === 'PROPOSAL_ACCEPTED';
  const hasEvent = Boolean(inquiry.event?.id) || inquiry.status === 'EVENT_CREATED';
  const closed = ['COMPLETED', 'CANCELLED', 'CLOSED', 'PROPOSAL_REJECTED'].includes(inquiry.event?.status || inquiry.status);
  const canPrepare = !readOnly && inquiry.status === 'INQUIRY_SUBMITTED';
  const canRevise = !readOnly && ['PROPOSAL_SENT', 'PROPOSAL_ACCEPTED'].includes(inquiry.status);
  const next = inquiryNextAction(inquiry, contract, readOnly, now);
  const deadline = holdDeadline(contract, now);
  const terms = contract?.terms;
  const price = terms?.totalEtb ?? proposal.price;

  return <Layout title="Booking workspace"><div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/coordinator/inquiries" className="text-sm font-medium text-emerald-800">← All inquiries</Link><div className="flex gap-2"><button type="button" className="btn-outline" disabled={loading} onClick={loadInquiry}>{loading ? 'Refreshing…' : 'Refresh request'}</button>{inquiry.proposal && <button type="button" onClick={downloadQuote} disabled={Boolean(busy)} className="btn-outline"><ArrowDownTrayIcon className="h-4 w-4" />{busy === 'quote' ? 'Preparing…' : 'Quotation PDF'}</button>}</div></div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    <header className="booking-case-header">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="case-eyebrow">Booking workspace · Inquiry #{inquiry.id}</p><StatusBadge status={inquiry.status} /></div>
      <h1>{inquiry.eventName || proposal.eventName || `${serviceLabel(inquiry.eventType)} event request`}</h1>
      <p className="case-subtitle">{inquiry.clientName} <span aria-hidden="true">·</span> Handled by {inquiry.coordinator?.name || 'a coordinator to be assigned'}</p>
      <dl className="case-facts"><div><dt>Event dates</dt><dd>{formatEventRange(inquiry.eventDate, inquiry.endDate)}</dd></div><div><dt>Proposed venue</dt><dd>{proposal.venue || 'To be agreed'}</dd></div><div><dt>Attendance & seating</dt><dd>{inquiry.expectedAttendees} guests · {serviceLabel(inquiry.tableSetup || 'undecided')}</dd></div><div><dt>Proposal value</dt><dd>{price != null ? `ETB ${Number(price).toLocaleString()}` : 'To be agreed'}</dd></div></dl>
    </header>
    <BookingProgress inquiry={inquiry} contract={contract} onStep={goTo} />
    <section className={`booking-next-action tone-${next.tone}`} aria-label="Next booking action" aria-live="polite"><div><p className="eyebrow">What happens next</p><h2>{next.title}</h2><p>{next.detail}</p></div>{next.href ? <Link className="btn-primary" to={next.href}>{next.action}<ArrowRightIcon className="h-4 w-4" /></Link> : <button type="button" className="btn-primary" onClick={() => goTo(next.target)}>{next.action}<ArrowRightIcon className="h-4 w-4" /></button>}</section>
    <div className="booking-workspace-grid"><div className="min-w-0">
      <div className="case-tabs" role="tablist" aria-label="Booking workspace sections">{sections.map(([value, label], index) => <button type="button" key={value} ref={node => { tabs.current[value] = node; }} id={`booking-tab-${value}`} role="tab" aria-selected={section === value} aria-controls={`booking-panel-${value}`} tabIndex={section === value ? 0 : -1} onClick={() => selectSection(value)} onKeyDown={event => {
        const position = event.key === 'ArrowRight' ? (index + 1) % sections.length : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length : event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : null;
        if (position != null) { event.preventDefault(); selectSection(sections[position][0]); }
      }}>{label}</button>)}</div>
      <section role="tabpanel" id="booking-panel-request" aria-labelledby="booking-tab-request" hidden={section !== 'request'} className="case-panel">
        <p className="eyebrow">The client’s brief</p><h2>Requirements for this event</h2>
        <dl className="case-detail-list"><div><dt>Event type</dt><dd>{serviceLabel(inquiry.eventType)}</dd></div><div><dt>Requested services</dt><dd>{inquiry.requestedCategories?.length ? inquiry.requestedCategories.map(serviceLabel).join(', ') : 'No services selected'}</dd></div><div><dt>Additional requirements</dt><dd className="whitespace-pre-wrap">{inquiry.requirements || 'No additional requirements recorded.'}</dd></div></dl>
        {inquiry.unmetNeeds && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><strong>Follow-up needed:</strong> {inquiry.unmetNeeds}</p>}
        {canPrepare && (editingRequest ? <InquiryEditForm key={id} inquiry={inquiry} onSaved={saved => { setInquiry(saved); setEditingRequest(false); }} onCancel={() => setEditingRequest(false)} /> : <button type="button" className="btn-outline mt-5" onClick={() => setEditingRequest(true)}>Edit requirements</button>)}
      </section>
      <section role="tabpanel" id="booking-panel-proposal" aria-labelledby="booking-tab-proposal" hidden={section !== 'proposal'}>
        {section === 'proposal' && ((canPrepare || editingProposal) ? <div className="case-panel"><p className="eyebrow">Venue, services & terms</p><h2>{editingProposal ? 'Revise the proposal' : 'Prepare the proposal'}</h2><RichProposalForm inquiry={inquiry} editMode={editingProposal} onSuccess={() => { setEditingProposal(false); loadInquiry(); }} onCancel={() => { setEditingProposal(false); selectSection('request'); }} /></div> : inquiry.proposal ? <ProposalReview key={`${inquiry.id}-${inquiry.proposalVersion}`} inquiry={inquiry}>
          {canRevise && <button type="button" className="btn-outline" onClick={() => setEditingProposal(true)}>Revise proposal</button>}
        </ProposalReview> : <div className="case-panel"><p className="text-sm text-slate-600">A proposal has not been sent yet.</p></div>)}
      </section>
      <section role="tabpanel" id="booking-panel-agreement" aria-labelledby="booking-tab-agreement" hidden={section !== 'agreement'}>
        {!readOnly && (accepted || hasEvent) ? <BookingAgreement key={`${id}-${contractRevision}`} inquiryId={inquiry.id} onStatusChange={setContract} onBooked={event => navigate(`/coordinator/events/${event.id}`)} /> : <div className="case-panel"><h2>Contract and payment</h2><p className="mt-3 text-sm text-slate-600">{readOnly ? 'The handling coordinator and client can access this contract.' : 'The client must accept the proposal before contract signing and payment review can begin.'}</p></div>}
      </section>
      <section role="tabpanel" id="booking-panel-history" aria-labelledby="booking-tab-history" hidden={section !== 'history'} className="space-y-5">
        {section === 'history' && <AuditTimeline referenceType="INQUIRY" referenceId={inquiry.id} refreshKey={inquiry.updatedAt || inquiry.status} title="Decisions and activity" expandedByDefault />}
      </section>
    </div><aside className="case-sidebar">
      <div ref={ownership} tabIndex={-1} className="scroll-mt-6 rounded-xl outline-offset-4"><CoordinatorOwnership key={id} inquiryId={id} closed={closed} onChanged={coordinator => setInquiry(previous => ({ ...previous, coordinator }))} /></div>
      <section className={`case-deadline ${deadline?.tone === 'warning' ? 'is-warning' : ''}`}><ClockIcon className="h-5 w-5" aria-hidden="true" /><p className="eyebrow">{deadline ? 'Payment deadline' : 'Reservation status'}</p><h2>{deadline?.value || (contract?.state === 'BOOKED' ? 'Booking recorded' : accepted ? 'Tentative request' : 'No reservation yet')}</h2><p>{deadline?.detail || (contract?.state === 'BOOKED' ? 'Continue in the event workspace for commitments and preparation.' : 'Proposal acceptance is tentative. Both signatures create a seven-day hold; receipt verification records the booking.')}</p>{contract?.paymentDueAt && <time dateTime={contract.paymentDueAt}>{new Date(contract.paymentDueAt).toLocaleString()}</time>}{terms?.bookedFrom && <div className="case-window"><span>Full venue window</span><strong>{formatEventRange(terms.bookedFrom, terms.bookedThrough)}</strong><small>Includes required setup and takedown days.</small></div>}</section>
      {accepted && <button type="button" className="btn-outline w-full" onClick={openPreview} disabled={Boolean(busy)}>{busy === 'preview' ? 'Checking options…' : 'Check venue & vendor options'}</button>}
      {readOnly && <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">This request is handled by another coordinator. An administrator can record a handover if needed.</p>}
    </aside></div>
    {preview && <ConversionPreviewModal preview={preview} onCancel={() => setPreview(null)} />}
  </div></Layout>;
}
