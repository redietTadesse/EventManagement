import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchAssignmentsForEvent, forceAssign } = useApp();

  const [event, setEvent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceAssignModal, setForceAssignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState('');

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      try {
        // Load event details and assignments
        const assignmentsData = await fetchAssignmentsForEvent(id);
        setAssignments(assignmentsData || []);
        
        // Extract event info from first assignment if available
        if (assignmentsData.length > 0) {
          setEvent({
            id: assignmentsData[0].eventId,
            name: assignmentsData[0].eventName,
            status: assignmentsData[0].eventStatus,
            date: assignmentsData[0].eventDate,
            venue: assignmentsData[0].eventVenue,
            clientName: assignmentsData[0].eventClientName,
            expectedAttendees: assignmentsData[0].expectedAttendees
          });
        }
        
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    };
    
    loadEvent();
  }, [id, fetchAssignmentsForEvent]);

  const handleForceAssign = async () => {
    if (!selectedAssignment || !selectedVendor) {
      setError('Please select both an assignment and a vendor');
      return;
    }
    
    try {
      await forceAssign(selectedAssignment.id, selectedVendor, selectedAssignment.serviceCategory);
      setForceAssignModal(false);
      setSelectedAssignment(null);
      setSelectedVendor('');
      // Reload assignments
      const assignmentsData = await fetchAssignmentsForEvent(id);
      setAssignments(assignmentsData || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to force assign vendor');
    }
  };

  const openAssignments = assignments.filter(a => a.status === 'OPEN');
  const pendingAssignments = assignments.filter(a => a.status === 'PENDING');
  const acceptedAssignments = assignments.filter(a => a.status === 'ACCEPTED');
  const completedAssignments = assignments.filter(a => a.status === 'COMPLETED');
  const declinedAssignments = assignments.filter(a => a.status === 'DECLINED');

  // Group assignments by service category
  const assignmentsByCategory = assignments.reduce((acc, assignment) => {
    const category = assignment.serviceCategory || 'Unknown';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(assignment);
    return acc;
  }, {});

  // Check for unfilled categories (categories with no ACCEPTED or COMPLETED assignments)
  const unfilledCategories = Object.keys(assignmentsByCategory).filter(category => {
    const categoryAssignments = assignmentsByCategory[category];
    return !categoryAssignments.some(a => a.status === 'ACCEPTED' || a.status === 'COMPLETED');
  });

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
        <button onClick={() => navigate('/coordinator/events')} className="mt-4 text-indigo-600 text-sm">
          ← Back to events
        </button>
      </Layout>
    );
  }

  return (
    <Layout title="Event Detail">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{event?.name}</h1>
          {event?.status && <StatusBadge status={event.status} />}
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}

        {/* Event Details */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Event Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{event?.date}</p>
            </div>
            <div>
              <p className="text-gray-500">Venue</p>
              <p className="font-medium">{event?.venue || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Client</p>
              <p className="font-medium">{event?.clientName || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Expected Attendees</p>
              <p className="font-medium">{event?.expectedAttendees ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Open Assignments Alert */}
        {openAssignments.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-yellow-800">Open Assignments Need Attention</h4>
                <p className="text-sm text-yellow-700">
                  {openAssignments.length} assignment(s) are open and need vendor assignment
                </p>
              </div>
              <button
                onClick={() => setForceAssignModal(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Force Assign
              </button>
            </div>
          </div>
        )}

        {/* Unfilled Categories */}
        {unfilledCategories.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h4 className="font-medium text-orange-800">Unfilled Service Categories</h4>
            <p className="text-sm text-orange-700 mt-1">
              The following categories need vendor assignment:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {unfilledCategories.map(category => (
                <span key={category} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Assignments by Category */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Assignments by Category</h3>
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
                            {assignment.status} {assignment.respondedAt && `· ${new Date(assignment.respondedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      {assignment.status === 'OPEN' && (
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setForceAssignModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          Force Assign
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignment Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Open</p>
            <p className="text-2xl font-bold text-orange-600">{openAssignments.length}</p>
          </div>
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
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Declined</p>
            <p className="text-2xl font-bold text-red-600">{declinedAssignments.length}</p>
          </div>
        </div>
      </div>

      {/* Force Assign Modal */}
      {forceAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Force Assign Vendor</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment
                </label>
                <select
                  value={selectedAssignment?.id || ''}
                  onChange={(e) => {
                    const assignment = assignments.find(a => a.id === parseInt(e.target.value));
                    setSelectedAssignment(assignment);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select assignment</option>
                  {assignments.filter(a => a.status === 'OPEN').map(assignment => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.serviceCategory} - {assignment.eventName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor ID
                </label>
                <input
                  type="number"
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter vendor ID"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setForceAssignModal(false);
                    setSelectedAssignment(null);
                    setSelectedVendor('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceAssign}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}