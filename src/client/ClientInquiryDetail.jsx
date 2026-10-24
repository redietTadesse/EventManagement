import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

export default function ClientInquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchInquiryById, acceptProposal, rejectProposal } = useApp();
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [changeMode, setChangeMode] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  const loadInquiry = useCallback(async () => {
    try {
      setInquiry(await fetchInquiryById(id));
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
    try {
      const updated = decision === 'accept'
        ? await acceptProposal(id)
        : await rejectProposal(id, changeReason || '');
      setInquiry(updated);
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
  const canRespond = inquiry.status === 'PROPOSAL_SENT' && proposal;

  // Parse proposal if it's a string
  const parsedProposal = typeof proposal === 'string' ? JSON.parse(proposal) : proposal;

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
        vendors: vendors.map((v, i) => ({
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
          <StatusBadge status={inquiry.status} />
        </div>

        {error && <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>}

        <section className="space-y-4 rounded-xl bg-white p-6 shadow">
          <h2 className="font-semibold text-gray-800">Inquiry details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div><p className="text-gray-500">Event date</p><p className="font-medium">{inquiry.eventDate || '—'}</p></div>
            <div><p className="text-gray-500">Attendees</p><p className="font-medium">{inquiry.expectedAttendees ?? '—'}</p></div>
            <div><p className="text-gray-500">Requested services</p><p className="font-medium">{inquiry.requestedCategories?.join(', ') || '—'}</p></div>
          </div>
          {inquiry.requirements && <div className="text-sm"><p className="text-gray-500">Requirements</p><p className="mt-1 text-gray-800">{inquiry.requirements}</p></div>}
        </section>

        {parsedProposal ? (
          <section className="space-y-5 rounded-xl border border-indigo-100 bg-white p-6 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Your proposal</h2>
                {parsedProposal.sentDate && <p className="mt-1 text-sm text-gray-500">Sent {new Date(parsedProposal.sentDate).toLocaleDateString()}</p>}
              </div>
              {parsedProposal.pricingTier && <span className="rounded-md bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">{parsedProposal.pricingTier}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Venue</p><p className="font-medium text-gray-900">{parsedProposal.venue || '—'}</p></div>
              <div><p className="text-gray-500">Price</p><p className="font-medium text-gray-900">{parsedProposal.price != null ? `$${Number(parsedProposal.price).toLocaleString()}` : '—'}</p></div>
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
                  Accepting this proposal confirms these vendors.
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
                      rows={3}
                      className="w-full rounded-xl border-gray-200 p-3 text-sm focus:ring-2 focus:ring-brand-500"
                      placeholder="e.g., Please swap the catering vendor for a different one"
                    />
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => decideProposal('reject')}
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
            ) : (
              <p className="border-t border-gray-100 pt-4 text-sm text-gray-600">
                {inquiry.status === 'PROPOSAL_ACCEPTED' ? 'You accepted this proposal.' : `Proposal status: ${inquiry.status.replaceAll('_', ' ').toLowerCase()}.`}
              </p>
            )}
          </section>
        ) : (
          <section className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow">
            No proposal has been sent for this inquiry yet.
          </section>
        )}
      </div>
    </Layout>
  );
}