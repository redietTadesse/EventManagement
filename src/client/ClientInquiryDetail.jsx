import AvailabilityWaitingList from '../components/AvailabilityWaitingList';
import InquiryBusinessDetails from '../components/InquiryBusinessDetails';
import ProposalReview from '../components/ProposalReview';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AuditTimeline from '../components/AuditTimeline';
import StatusBadge from '../components/StatusBadge';
import BookingAgreement from '../components/BookingAgreement';
import EventTimeline from '../components/EventTimeline';
import { EditPreferences, PreferenceSummary } from '../components/InquiryPreferences';
import { useApp } from '../context/AppContext';
import api from '../api/axios';

const requestProgress = {
  INQUIRY_SUBMITTED: ['Request received', 'The coordinator will review your dates and requirements before sending a proposal.'],
  PROPOSAL_SENT: ['Your response is needed', 'Review the proposal below, then accept it, request changes, or decline it.'],
  PROPOSAL_ACCEPTED: ['Proposal accepted', 'The contract below shows what still needs to happen before the venue can be booked.'],
  PROPOSAL_REJECTED: ['Proposal declined', 'This request has ended. You can submit a new inquiry if your plans change.'],
  CLOSED: ['Request closed', 'This request has ended.'],
  EVENT_CREATED: ['Event created', 'The coordinator is preparing the event. Check your event details for the latest information.'],
  AWAITING_VENDORS: ['Waiting for vendor confirmations', 'The coordinator is waiting for the required services to be confirmed.'],
  NEEDS_COORDINATOR: ['The coordinator is resolving an issue', 'Check your event details for the latest information.'],
  CONFIRMED: ['Event confirmed', 'Open your event for the current venue, dates, and services.'],
  COMPLETED: ['Event completed', 'Your event details are available in My Events.'],
  CANCELLED: ['Event cancelled', 'This event has been cancelled.'],
};



export default function ClientInquiryDetail() {
  const { id } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { fetchInquiryById, acceptProposal, rejectProposal } = useApp();
  const [inquiry, setInquiry] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [changeMode, setChangeMode] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [responseNotice, setResponseNotice] = useState('');

  const loadInquiry = useCallback(async () => {
    try {
      const data = await fetchInquiryById(id);
      setInquiry(data);

      const timelineRes = await api.get(`/inquiries/${id}/timeline`);
      setTimeline(timelineRes.data);

      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inquiry details');
    } finally {
      setLoading(false);
    }
  }, [fetchInquiryById, id]);

  useEffect(() => {
    loadInquiry();
  }, [loadInquiry]);
  useEffect(() => {
    if (loading || String(inquiry?.id) !== id || !['#client-agreement', '#client-proposal'].includes(hash)) return;
    const section = document.getElementById(hash.slice(1));
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: 'start' });
  }, [hash, id, loading, inquiry?.id]);

  const decideProposal = async (decision) => {
    setSaving(true);
    setError('');
    setResponseNotice('');
    try {
      const updated = decision === 'accept'
        ? await acceptProposal(id, {proposalVersion: inquiry.proposalVersion})
        : decision === 'changes'
          ? await rejectProposal(id, changeReason)
          : await rejectProposal(id);
      setInquiry(updated);
      api.get(`/inquiries/${id}/timeline`).then(response => setTimeline(response.data))
        .catch(() => setError('Your response was saved, but progress could not be refreshed. Refresh this page to try again.'));
      if (decision === 'changes') {
        setChangeMode(false);
        setChangeReason('');
        setResponseNotice('Your change request was sent to the coordinator.');
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${decision} proposal`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Layout title="Inquiry Details"><div className="py-10 text-center text-gray-500">Loading...</div></Layout>;
  }

  if (!inquiry) {
    return (
      <Layout title="Inquiry Details">
        <div className="rounded-lg bg-red-100 p-4 text-red-700">{error || 'Inquiry not found'}</div>
        <button onClick={() => navigate('/client/inquiries')} className="mt-4 text-sm text-indigo-600">Back to inquiries</button>
      </Layout>
    );
  }

  const proposal = inquiry.proposal;
  // Parse proposal if it's a string
  let parsedProposal = proposal;
  if (typeof proposal === 'string') {
    try { parsedProposal = JSON.parse(proposal); }
    catch { parsedProposal = null; }
  }
  const event = inquiry.event;
  const status = event?.status || inquiry.status;
  const canRespond = status === 'PROPOSAL_SENT' && parsedProposal;
  const hasAgreement = ['PROPOSAL_ACCEPTED', 'EVENT_CREATED'].includes(inquiry.status) || Boolean(event);
  const [progressTitle, progressDescription] = status === 'PROPOSAL_SENT' && !parsedProposal
    ? ['Proposal details unavailable', 'Ask the coordinator to review this proposal before you respond.']
    : requestProgress[status] || ['Request status', 'Check the details below for the latest information.'];

  return (
    <Layout title="Inquiry Details">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/client/inquiries" className="text-sm text-indigo-600 hover:text-indigo-700">← My inquiries</Link>
            <h1 className="mt-2 text-2xl font-semibold text-gray-800">{inquiry.eventName || 'Your event request'}</h1>
          </div>
          <StatusBadge status={status} />
        </div>

        <section aria-labelledby="request-progress" className="overflow-hidden rounded-2xl border border-brand-border bg-brand-ink text-white">
          <div className="flex flex-wrap items-start justify-between gap-5 p-5 sm:p-7">
            <div className="max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-peach">Your booking</p>
              <h2 id="request-progress" className="mt-2 font-serif text-3xl">{progressTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50">{progressDescription}</p>
            </div>
            {timeline && <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3">
              <p className="text-xs text-emerald-100">Venue reservation</p>
              <p className="mt-1 text-sm font-semibold">{timeline.venueHeld ? 'Venue booked' : 'Venue not booked'}</p>
              {timeline.venueHeld && timeline.venueName && <p className="mt-1 text-xs text-emerald-100">{timeline.venueName}</p>}
            </div>}
            <div className="flex w-full flex-wrap gap-2">
              {canRespond && <a href="#client-proposal" className="btn-outline">Review proposal</a>}
              {hasAgreement && !timeline?.venueHeld && !['CANCELLED', 'CLOSED', 'COMPLETED'].includes(status) &&
                <a href="#client-agreement" className="btn-outline">View agreement and payment</a>}
              {event?.id && <Link to={`/client/events/${event.id}`} className="btn-outline">View event details</Link>}
            </div>
          </div>
          {timeline && <EventTimeline timeline={timeline} status={status}
            proposalAccepted={inquiry.status === 'PROPOSAL_ACCEPTED' || inquiry.status === 'EVENT_CREATED' || Boolean(event?.id)} />}
        </section>

        {responseNotice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{responseNotice}</p>}
        {error && <div role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>}
        {hasAgreement && <div id="client-agreement" tabIndex={-1} className="scroll-mt-24">
          <BookingAgreement key={`booking-${inquiry.id}`} inquiryId={inquiry.id} />
        </div>}
        {parsedProposal ? (
          <section id="client-proposal" tabIndex={-1} className="scroll-mt-24">
            <ProposalReview key={`${inquiry.id}-${inquiry.proposalVersion}`} inquiry={inquiry} client>
            {canRespond ? (
              <div className="flex flex-col gap-3">
                {!changeMode ? (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => decideProposal('accept')}
                        disabled={saving}
                        className="btn-primary flex-1"
                      >
                        {saving ? 'Saving…' : 'Accept this proposal'}
                      </button>
                      <button
                        onClick={() => setChangeMode(true)}
                        disabled={saving}
                        className="btn-outline flex-1"
                      >
                        Request changes
                      </button>
                    </div>
                    <button
                      onClick={() => decideProposal('reject')}
                      disabled={saving}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Decline this proposal
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Request a Change</h2>
                    <p className="text-sm text-gray-500 mb-4">
                      Tell the coordinator which vendor or detail you would like to change.
                    </p>
                    <textarea
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      aria-label="Changes you would like"
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-xl border-gray-200 p-3 text-sm focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g., Please swap the catering vendor for a different one"
                    />
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => decideProposal('changes')}
                        disabled={saving || !changeReason.trim()}
                        className="flex-1 bg-rose-600 text-white px-4 py-3 rounded-xl font-semibold disabled:opacity-50"
                      >
                        {saving ? 'Sending...' : 'Send Change Request'}
                      </button>
                      <button
                        onClick={() => { setChangeMode(false); setChangeReason(''); }}
                        disabled={saving}
                        className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
            </ProposalReview>
          </section>
        ) : null}
        {['INQUIRY_SUBMITTED', 'PROPOSAL_SENT'].includes(status) && (
          <EditPreferences key={`preferences-${inquiry.id}`} inquiry={inquiry} onSaved={setInquiry} />
        )}
        <details open={!parsedProposal} className="surface p-5 sm:p-6">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">Request details <span className="ml-2 font-normal text-slate-500">Dates, requirements and your coordinator</span></summary>
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div><p className="text-gray-500">Event date</p><p className="font-medium">{inquiry.eventDate || '—'}</p></div>
              <div><p className="text-gray-500">Attendees</p><p className="font-medium">{inquiry.expectedAttendees ?? '—'}</p></div>
              <div><p className="text-gray-500">Handled by</p><p className="font-medium">{inquiry.coordinator?.name || 'Coordinator assignment pending'}</p></div>
              <div><p className="text-gray-500">Requested services</p><p className="font-medium">{inquiry.requestedCategories?.join(', ') || '—'}</p></div>
            </div>
            {!parsedProposal && <PreferenceSummary inquiry={inquiry} />}
            <InquiryBusinessDetails inquiry={inquiry} client />
            {inquiry.tableSetup && <p className="text-sm"><strong>Table and seating setup:</strong> {inquiry.tableSetup.replaceAll('_', ' ').toLowerCase()}</p>}
            {inquiry.requirements && <div className="text-sm"><p className="text-gray-500">Requirements</p><p className="mt-1 whitespace-pre-wrap text-gray-800">{inquiry.requirements}</p></div>}
          </div>
        </details>
        {!inquiry.event && !['EVENT_CREATED', 'PROPOSAL_REJECTED', 'COMPLETED', 'CANCELLED', 'CLOSED'].includes(inquiry.status) && <AvailabilityWaitingList key={`waiting-${inquiry.id}`} inquiry={inquiry} />}
        <AuditTimeline key={`history-${inquiry.id}`} referenceType="INQUIRY" referenceId={inquiry.id}
          refreshKey={inquiry.updatedAt || inquiry.status} title="Inquiry history" expandedByDefault={false} />
      </div>
    </Layout>
  );
}
