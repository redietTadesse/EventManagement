import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS = {
  av: 'AV Equipment',
  catering: 'Catering',
  security: 'Security',
  cleaning: 'Cleaning',
  photography: 'Photography',
  music: 'Music',
};

export default function ClientInquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, acceptProposal, rejectProposal } =  useAuth();
  const { inquiries } = state;

  const [inquiry, setInquiry] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const found = inquiries.find((i) => i.id === parseInt(id));
    if (found) {
      setInquiry(found);
      // Pre-select the categories the coordinator proposed
      setSelectedCategories(found.categories || found.requestedCategories || []);
    }
  }, [id, inquiries]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAccept = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one service category');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await acceptProposal(inquiry.id, {
        categories: selectedCategories, // Client's final choice
      });
      navigate('/client/dashboard');
    } catch (err) {
      const raw = err.response?.data;
      const msg = raw && typeof raw === 'object' ? (raw.message || raw.error) : raw;
      setError(typeof msg === 'string' ? msg : 'Failed to accept proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError('');
    try {
      await rejectProposal(inquiry.id, rejectReason);
      navigate('/client/dashboard');
    } catch (err) {
      const raw = err.response?.data;
      const msg = raw && typeof raw === 'object' ? (raw.message || raw.error) : raw;
      setError(typeof msg === 'string' ? msg : 'Failed to reject proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (!inquiry) {
    return (
      <Layout title="Inquiry Detail">
        <div className="text-center py-10 text-gray-500">Inquiry not found</div>
      </Layout>
    );
  }

  const proposal = inquiry.proposal;
  const canRespond = inquiry.status === 'PROPOSAL_SENT';

  return (
    <Layout title="Inquiry Detail">
      <button
        onClick={() => navigate('/client/dashboard')}
        className="text-sm text-indigo-600 hover:text-indigo-700 mb-4"
      >
        ← Back to Dashboard
      </button>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inquiry summary */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Inquiry #{inquiry.id}
            </h3>
            <StatusBadge status={inquiry.status} />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Event Type</p>
              <p className="font-medium capitalize">{inquiry.eventType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Event Date</p>
              <p className="font-medium">{inquiry.eventDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expected Attendees</p>
              <p className="font-medium">{inquiry.expectedAttendees}</p>
            </div>
            {inquiry.requirements && (
              <div>
                <p className="text-sm text-gray-500">Requirements</p>
                <p className="text-gray-700">{inquiry.requirements}</p>
              </div>
            )}
          </div>
        </div>

        {/* Proposal details */}
        {proposal && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Proposal from AICC
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Venue</p>
                <p className="font-medium">{proposal.venue}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium">
                  ETB {Number(proposal.price).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Terms</p>
                <p className="text-gray-700">{proposal.terms}</p>
              </div>

              {/* ===== CLIENT PICKS FINAL CATEGORIES ===== */}
              {canRespond && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Which services do you want included?
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    The coordinator suggested the checked ones. You can
                    uncheck anything you don't need.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {(inquiry.requestedCategories || []).map((cat) => (
                      <label
                        key={cat}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="rounded border-gray-300"
                        />
                        <span>{CATEGORY_LABELS[cat] || cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {canRespond && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleAccept}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? 'Accepting...' : 'Accept Proposal'}
          </button>
          <button
            onClick={() => setShowReject(!showReject)}
            className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2.5 rounded-lg font-medium"
          >
            Reject Proposal
          </button>
        </div>
      )}

      {showReject && canRespond && (
        <div className="mt-4 bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for rejection (optional)
          </label>
          <textarea
            rows="3"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="e.g., Price is too high..."
          />
          <button
            onClick={handleReject}
            disabled={submitting}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      )}
    </Layout>
  );
}