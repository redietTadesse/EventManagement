import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchMyAssignment, respondToAssignment } = useApp();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyAssignment(id);
      setAssignment(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const handleAccept = async () => {
    setSubmitting(true);
    setError('');
    try {
      await respondToAssignment(id, 'ACCEPTED', null);
      await load();
    } catch (err) {
      const raw = err.response?.data;
      setError((raw && (raw.message || raw.code)) || 'Failed to accept assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError('Please provide a reason for declining.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await respondToAssignment(id, 'DECLINED', declineReason);
      await load();
      setDeclineMode(false);
    } catch (err) {
      const raw = err.response?.data;
      setError((raw && (raw.message || raw.code)) || 'Failed to decline assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Assignment">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  if (error && !assignment) {
    return (
      <Layout title="Assignment">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
        <button onClick={() => navigate('/vendor/assignments')} className="mt-4 text-indigo-600 text-sm">
          ← Back to assignments
        </button>
      </Layout>
    );
  }

  const isPending = assignment?.status === 'PENDING';

  return (
    <Layout title="Assignment">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{assignment?.eventName}</h1>
          <StatusBadge status={assignment.status} />
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Event details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{assignment?.eventDate}</p>
            </div>
            <div>
              <p className="text-gray-500">Venue</p>
              <p className="font-medium">{assignment?.eventVenue || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Client</p>
              <p className="font-medium">{assignment?.eventClientName || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Expected attendees</p>
              <p className="font-medium">{assignment?.expectedAttendees ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Your service</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium">{assignment?.serviceCategory?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-gray-500">Assigned at</p>
              <p className="font-medium">
                {assignment?.assignedAt ? new Date(assignment.assignedAt).toLocaleString() : '—'}
              </p>
            </div>
            {assignment?.respondedAt && (
              <div>
                <p className="text-gray-500">Responded at</p>
                <p className="font-medium">{new Date(assignment.respondedAt).toLocaleString()}</p>
              </div>
            )}
            {assignment?.declineReason && (
              <div className="col-span-2">
                <p className="text-gray-500">Decline reason</p>
                <p className="font-medium">{assignment.declineReason}</p>
              </div>
            )}
          </div>
        </div>

        {isPending && !declineMode && (
          <div className="bg-white rounded-xl shadow p-6 flex gap-3">
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Processing…' : 'Accept assignment'}
            </button>
            <button
              onClick={() => setDeclineMode(true)}
              disabled={submitting}
              className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {isPending && declineMode && (
          <div className="bg-white rounded-xl shadow p-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Reason for declining
            </label>
            <textarea
              rows="3"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Fully booked on this date, equipment unavailable, etc."
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setDeclineMode(false); setDeclineReason(''); }}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Declining…' : 'Confirm decline'}
              </button>
            </div>
          </div>
        )}

        {!isPending && (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500 text-sm">
            This assignment is <strong>{assignment?.status?.toLowerCase()}</strong>. No further action required.
            <div className="mt-3">
              <Link to="/vendor/assignments" className="text-indigo-600 hover:underline">
                Back to all assignments →
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}