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
        : await rejectProposal(id, '');
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

        {proposal ? (
          <section className="space-y-5 rounded-xl border border-indigo-100 bg-white p-6 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Your proposal</h2>
                {proposal.sentDate && <p className="mt-1 text-sm text-gray-500">Sent {new Date(proposal.sentDate).toLocaleDateString()}</p>}
              </div>
              {proposal.pricingTier && <span className="rounded-md bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">{proposal.pricingTier}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Venue</p><p className="font-medium text-gray-900">{proposal.venue || '—'}</p></div>
              <div><p className="text-gray-500">Price</p><p className="font-medium text-gray-900">{proposal.price != null ? `$${Number(proposal.price).toLocaleString()}` : '—'}</p></div>
            </div>
            {proposal.terms && <div className="text-sm"><p className="text-gray-500">Terms</p><p className="mt-1 whitespace-pre-wrap text-gray-800">{proposal.terms}</p></div>}
            {proposal.categories?.length > 0 && <div className="text-sm"><p className="text-gray-500">Included services</p><p className="mt-1 text-gray-800">{proposal.categories.join(', ')}</p></div>}
            {proposal.vendorShortlist && Object.keys(proposal.vendorShortlist).length > 0 && (
              <div className="text-sm">
                <p className="text-gray-500">Suggested vendors</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(proposal.vendorShortlist).map(([category, vendors]) => (
                    <p key={category} className="text-gray-800"><span className="font-medium">{category}:</span> {vendors.join(', ')}</p>
                  ))}
                </div>
              </div>
            )}
            {canRespond ? (
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                <button disabled={saving} onClick={() => decideProposal('accept')} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Accept proposal'}
                </button>
                <button disabled={saving} onClick={() => decideProposal('reject')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Reject
                </button>
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