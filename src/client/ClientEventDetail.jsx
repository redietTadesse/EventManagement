import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

export default function ClientEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchInquiryById, fetchAssignmentsForEvent } = useApp();

  const [event, setEvent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      try {
        // Load inquiry first to get event info
        const inquiryData = await fetchInquiryById(id);
        setEvent(inquiryData);
        
        // If event exists, load assignments
        if (inquiryData.event) {
          const assignmentsData = await fetchAssignmentsForEvent(inquiryData.event.id);
          setAssignments(assignmentsData || []);
        }
        
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    };
    
    loadEvent();
  }, [id, fetchInquiryById, fetchAssignmentsForEvent]);

  if (loading) {
    return (
      <Layout title="Event Detail">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  if (error && !event) {
    return (
      <Layout title="Event Detail">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
        <button onClick={() => navigate('/client/events')} className="mt-4 text-indigo-600 text-sm">
          ← Back to events
        </button>
      </Layout>
    );
  }

  const eventData = event?.event || {};
  const assignmentsByCategory = assignments.reduce((acc, assignment) => {
    const category = assignment.serviceCategory || 'Unknown';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(assignment);
    return acc;
  }, {});

  const acceptedAssignments = assignments.filter(a => a.status === 'ACCEPTED');
  const completedAssignments = assignments.filter(a => a.status === 'COMPLETED');
  const pendingAssignments = assignments.filter(a => a.status === 'PENDING');

  return (
    <Layout title="Event Detail">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {eventData.name || event?.eventType}
          </h1>
          {eventData.status && <StatusBadge status={eventData.status} />}
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}

        {/* Event Details */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Event Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{event?.eventDate}</p>
            </div>
            <div>
              <p className="text-gray-500">Venue</p>
              <p className="font-medium">{eventData.venue || event?.venue || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Expected Attendees</p>
              <p className="font-medium">{event?.expectedAttendees ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-medium">{eventData.status || event?.status || '—'}</p>
            </div>
          </div>
          {event?.requirements && (
            <div>
              <p className="text-gray-500">Requirements</p>
              <p className="font-medium mt-1">{event.requirements}</p>
            </div>
          )}
        </div>

        {/* Assignment Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingAssignments.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{acceptedAssignments.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-blue-600">{completedAssignments.length}</p>
          </div>
        </div>

        {/* Vendor Assignments by Category */}
        {assignments.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-800">Vendor Assignments</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {Object.entries(assignmentsByCategory).map(([category, categoryAssignments]) => (
                <div key={category} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800">{category}</h4>
                    <span className="text-sm text-gray-500">
                      {categoryAssignments.length} assignment(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {categoryAssignments.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={assignment.status} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {assignment.vendorName || 'Unassigned'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {assignment.status} 
                              {assignment.respondedAt && ` · ${new Date(assignment.respondedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignments.length === 0 && eventData.status === 'EVENT_CREATED' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Vendors are being assigned to this event. Check back later to see vendor assignments.
            </p>
          </div>
        )}

        {/* Proposal Information */}
        {event?.proposal && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Proposal Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Venue</p>
                <p className="font-medium">{event.proposal.venue}</p>
              </div>
              <div>
                <p className="text-gray-500">Price</p>
                <p className="font-medium">${event.proposal.price}</p>
              </div>
            </div>
            {event.proposal.terms && (
              <div>
                <p className="text-gray-500">Terms</p>
                <p className="font-medium mt-1">{event.proposal.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}