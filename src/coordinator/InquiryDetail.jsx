import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../store/AppContext';

export default function InquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp(); // Get mock data from Context
  const { inquiries = [] } = state;
  
  const [inquiry, setInquiry] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [proposal, setProposal] = useState({
    name: '',
    venue: '',
    venueId: '',
    venueDetails: '',
  });

  // Load inquiry from local state instead of API
  useEffect(() => {
    const found = inquiries.find(i => i.id === parseInt(id));
    if (found) {
      setInquiry(found);
    } else {
      setError('Inquiry not found in mock data');
    }
  }, [id, inquiries]);

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!proposal.name || !proposal.venue) {
      setError('Event name and venue are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // In a real app, this would call the API.
      // For now, we just navigate back to the dashboard.
      navigate('/coordinator/dashboard');
    } catch (err) {
      setError('Failed to convert');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !inquiry) {
    return (
      <Layout title="Inquiry Detail">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      </Layout>
    );
  }

  if (!inquiry) {
    return (
      <Layout title="Inquiry Detail">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  const canConvert = inquiry?.status === 'PROPOSAL_ACCEPTED';

  return (
    <Layout title="Inquiry Detail">
      <div className="mb-4">
        <button onClick={() => navigate('/coordinator/inquiries')} className="text-indigo-600 hover:text-indigo-700 text-sm">
          ← Back to Inquiries
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inquiry Details */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-gray-800">Inquiry #{inquiry.id}</h3>
            <StatusBadge status={inquiry.status} />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-medium">{inquiry.clientName}</p>
            </div>
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

        {/* Convert to Event */}
        {canConvert && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Event</h3>
            <form onSubmit={handleConvert} className="space-y-4">
              {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={proposal.name}
                  onChange={(e) => setProposal({ ...proposal, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={proposal.venue}
                  onChange={(e) => setProposal({ ...proposal, venue: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Details (JSON)</label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={proposal.venueDetails}
                  onChange={(e) => setProposal({ ...proposal, venueDetails: e.target.value })}
                  placeholder='{"capacity": 500, "features": ["Projector", "Sound System"]}'
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        )}

        {!canConvert && inquiry?.status !== 'PROPOSAL_ACCEPTED' && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-center py-6 text-gray-500">
              <p className="text-lg font-medium">Cannot Create Event</p>
              <p className="text-sm">This inquiry must be in <strong>PROPOSAL_ACCEPTED</strong> status.</p>
              <p className="text-sm mt-2">Current status: <StatusBadge status={inquiry?.status} /></p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}