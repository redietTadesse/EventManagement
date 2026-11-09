import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AuditTimeline from '../components/AuditTimeline';
import StatusBadge from '../components/StatusBadge';
import BookingAgreement from '../components/BookingAgreement';
import EventTimeline from '../components/EventTimeline';
import useApiResource from '../hooks/useApiResource';
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

function VendorPreferences({ inquiry, onSaved }) {
  const path = `/inquiries/${inquiry.id}`;
  const { data, loading, error, reload } = useApiResource(`${path}/recommended-vendors`);
  const [selected, setSelected] = useState(inquiry.preferredVendorIds ?? []);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const categories = (data.categories ?? []).filter(({ options }) => options.length);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setSaveError('');
    try {
      const response = await api.post(`${path}/vendor-preference`, { vendorIds: selected });
      onSaved(response.data);
      setNotice('Vendor preferences saved.');
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Could not save vendor preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold">Vendor preferences</summary>
      <p className="my-2 text-sm text-slate-600">Select vendors you would prefer for your event.</p>
      {loading && <p>Loading vendor options…</p>}
      {error && <p role="alert">{error} <button onClick={reload} className="underline">Retry</button></p>}
      {!loading && !error && categories.length === 0 && <p>No vendor options are currently available.</p>}
      {categories.length > 0 && (
        <form onSubmit={save} className="space-y-3">
          {categories.map(({ category, options }) => (
            <fieldset key={category} disabled={saving}>
              <legend className="font-medium capitalize">{category.replace(/_/g, ' ')}</legend>
              {options.map(({ vendorId, companyName }) => (
                <label key={vendorId} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" checked={selected.includes(vendorId)} onChange={(event) => {
                    const checked = event.target.checked;
                    setNotice('');
                    setSelected((ids) => checked ? [...ids, vendorId] : ids.filter((id) => id !== vendorId));
                  }} />
                  {companyName}
                </label>
              ))}
            </fieldset>
          ))}
          <button type="submit" disabled={saving || selected.length === 0} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
          {notice && <p role="status">{notice}</p>}
          {saveError && <p role="alert" className="text-rose-700">{saveError}</p>}
        </form>
      )}
    </details>
  );
}

export default function ClientInquiryDetail() {
  const { id } = useParams();
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

  const decideProposal = async (decision) => {
    setSaving(true);
    setError('');
    setResponseNotice('');
    try {
      const updated = decision === 'accept'
        ? await acceptProposal(id)
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
  const [progressTitle, progressDescription] = status === 'PROPOSAL_SENT' && !parsedProposal
    ? ['Proposal details unavailable', 'Ask the coordinator to review this proposal before you respond.']
    : requestProgress[status] || ['Request status', 'Check the details below for the latest information.'];

  // Parse the enriched shortlist - handle both new array format and old map format
  let shortlist = [];
  if (parsedProposal?.vendorShortlist) {
    if (Array.isArray(parsedProposal.vendorShortlist)) {
      // New enriched format: Array of category objects
      shortlist = parsedProposal.vendorShortlist;
    } else if (typeof parsedProposal.vendorShortlist === 'object') {
      // Old format: Map of category -> array of vendor names
      // Convert to new format for display
      shortlist = Object.entries(parsedProposal.vendorShortlist).map(([category, vendors]) => ({
        category,
        vendors: (Array.isArray(vendors) ? vendors : []).map((v, i) => ({
          id: i, // placeholder ID
          companyName: v,
          rating: null,
          description: 'No description available'
        }))
      }));
    }
  }

  return (
    <Layout title="Inquiry Details">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/client/inquiries" className="text-sm text-indigo-600 hover:text-indigo-700">← My inquiries</Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-800">{inquiry.eventType}</h1>
          </div>
          <StatusBadge status={status} />
        </div>

        <section aria-labelledby="request-progress" className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
          <h2 id="request-progress" className="font-semibold text-gray-900">{progressTitle}</h2>
          <p className="mt-1 text-sm text-gray-700">{progressDescription}</p>
          {canRespond && <a href="#client-proposal" className="btn-primary mt-3">Review proposal</a>}
          {event?.id && (
            <Link to={`/client/events/${event.id}`} className="mt-3 inline-block text-sm font-semibold text-indigo-700 hover:underline">
              View event details →
            </Link>
          )}
        </section>

        {responseNotice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{responseNotice}</p>}
        {error && <div role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>}
        {timeline && <EventTimeline timeline={timeline} status={status}
          proposalAccepted={inquiry.status === 'PROPOSAL_ACCEPTED' || inquiry.status === 'EVENT_CREATED' || Boolean(event?.id)} />}
        {(['PROPOSAL_ACCEPTED', 'EVENT_CREATED'].includes(inquiry.status) || inquiry.event) &&
          <BookingAgreement key={`booking-${inquiry.id}`} inquiryId={inquiry.id} />}
        {['INQUIRY_SUBMITTED', 'PROPOSAL_SENT'].includes(status) && (
          <VendorPreferences key={`preferences-${inquiry.id}`} inquiry={inquiry} onSaved={setInquiry} />
        )}

        <section className="space-y-4 rounded-xl bg-white p-6 shadow">
          <h2 className="font-semibold text-gray-800">Inquiry details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div><p className="text-gray-500">Event date</p><p className="font-medium">{inquiry.eventDate || '—'}</p></div>
            <div><p className="text-gray-500">Attendees</p><p className="font-medium">{inquiry.expectedAttendees ?? '—'}</p></div>
            <div><p className="text-gray-500">Handled by</p><p className="font-medium">{inquiry.coordinator?.name || 'Coordinator assignment pending'}</p></div>
            <div><p className="text-gray-500">Requested services</p><p className="font-medium">{inquiry.requestedCategories?.join(', ') || '—'}</p></div>
          </div>
          {inquiry.requirements && <div className="text-sm"><p className="text-gray-500">Requirements</p><p className="mt-1 text-gray-800">{inquiry.requirements}</p></div>}
        </section>

        {parsedProposal ? (
          <section id="client-proposal" tabIndex={-1} className="surface scroll-mt-24 space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Your proposal</h2>
                {parsedProposal.sentDate && <p className="mt-1 text-sm text-gray-500">Sent {new Date(parsedProposal.sentDate).toLocaleDateString()}</p>}
              </div>
              {parsedProposal.pricingTier && <span className="rounded-md bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">{parsedProposal.pricingTier}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Venue</p><p className="font-medium text-gray-900">{parsedProposal.venue || '—'}</p></div>
              <div><p className="text-gray-500">Price</p><p className="font-medium text-gray-900">{parsedProposal.price != null ? `ETB ${Number(parsedProposal.price).toLocaleString()}` : '—'}</p></div>
            </div>
            {parsedProposal.terms && <div className="text-sm"><p className="text-gray-500">Terms</p><p className="mt-1 whitespace-pre-wrap text-gray-800">{parsedProposal.terms}</p></div>}
            {parsedProposal.categories?.length > 0 && <div className="text-sm"><p className="text-gray-500">Included services</p><p className="mt-1 text-gray-800">{parsedProposal.categories.join(', ')}</p></div>}

            {/* Vendor Shortlist — enriched with details */}
            {shortlist.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-800 mb-3">Suggested Vendors</p>
                <div className="space-y-3">
                  {shortlist.map((cat) => (
                    <div key={cat.category} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {cat.category.replace('_', ' ')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cat.vendors.map(v => (
                          <div key={v.id} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{v.companyName}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{v.description || 'No description'}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="text-sm font-bold text-amber-600">
                                {v.rating ? `★ ${v.rating.toFixed(1)}` : '★ N/A'}
                              </p>
                              <p className="text-[10px] text-gray-500 uppercase">Rating</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  These vendors are suggestions. Vendor offers are sent after the coordinator creates the event.
                </p>
              </div>
            )}
            {canRespond ? (
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 mt-4">
                {!changeMode ? (
                  <>
                    <div className="flex gap-3">
                      <button
                        onClick={() => decideProposal('accept')}
                        disabled={saving}
                        className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        {saving ? 'Saving...' : 'Accept Proposal'}
                      </button>
                      <button
                        onClick={() => setChangeMode(true)}
                        disabled={saving}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
                      >
                        Request Change
                      </button>
                    </div>
                    <button
                      onClick={() => decideProposal('reject')}
                      disabled={saving}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Reject entire proposal
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
          </section>
        ) : null}
        <AuditTimeline key={`history-${inquiry.id}`} referenceType="INQUIRY" referenceId={inquiry.id}
          refreshKey={inquiry.updatedAt || inquiry.status} title="Inquiry history" expandedByDefault={false} />
      </div>
    </Layout>
  );
}
