import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import PipelineLadder from '../components/PipelineLadder';
import AuditTimeline from '../components/AuditTimeline';
import VendorTrailDrawer from '../components/VendorTrailDrawer';

import { useApp } from '../context/AppContext';
import api from '../api/axios';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchAssignmentsForEvent, forceAssign, fetchEventHistory, fetchChecklist } = useApp();

  const [event, setEvent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [trail, setTrail] = useState(null);
  const [openTrailCategory, setOpenTrailCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceAssignModal, setForceAssignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [checklistExpanded, setChecklistExpanded] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      try {
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

        // Load checklist
        try {
          const checklistData = await fetchChecklist(assignmentsData[0]?.eventId || id);
          setChecklist(checklistData || []);
        } catch (err) {
          // Checklist might not exist, that's ok
          setChecklist([]);
        }


        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, fetchAssignmentsForEvent, fetchChecklist]);

  const handleForceAssign = async (assignmentId, vendorId, category) => {

    try {
      await forceAssign(assignmentId || selectedAssignment?.id, vendorId, category);
      setForceAssignModal(false);
      setSelectedAssignment(null);
      setSelectedVendor('');
      await reloadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to force assign vendor');
    }
  };


  // Group assignments by service category
  const assignmentsByCategory = assignments.reduce((acc, assignment) => {
    const category = assignment.serviceCategory || 'Unknown';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(assignment);
    return acc;
  }, {});

  // Check for unfilled categories
  const unfilledCategories = Object.keys(assignmentsByCategory).filter(category => {
    const categoryAssignments = assignmentsByCategory[category];
    return !categoryAssignments.some(a => a.status === 'ACCEPTED' || a.status === 'COMPLETED');
  });

  const acceptedCount = assignments.filter(a => a.status === 'ACCEPTED' || a.status === 'COMPLETED').length;
  const totalCategories = Object.keys(assignmentsByCategory).length;

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
        <div className="bg-rose-100 text-rose-700 p-4 rounded-lg">{error}</div>
        <button onClick={() => navigate('/coordinator/events')} className="mt-4 text-indigo-600 text-sm">
          ← Back to events
        </button>
      </Layout>
    );
  }

  return (
    <Layout title="Event Detail">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Event Header Card */}
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                  <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 self-start">
                    ← Back
                  </button>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800">{event?.name}</h1>
                  {event?.status && <StatusBadge status={event.status} size="lg" showIcon />}
                </div>
                <p className="text-sm text-gray-600">
                  {acceptedCount} vendors confirmed. {unfilledCategories.length} category{unfilledCategories.length !== 1 ? 'ies' : ''} needs attention.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="text-sm text-gray-600 hover:text-gray-700 px-3 py-2 border border-gray-300 rounded-lg">
                  Edit venue
                </button>
                <button className="text-sm text-rose-600 hover:text-rose-700 px-3 py-2 border border-rose-300 rounded-lg">
                  Cancel event
                </button>
                {event?.status === 'CONFIRMED' && (
                  <button className="text-sm text-emerald-600 hover:text-emerald-700 px-3 py-2 border border-emerald-300 rounded-lg">
                    Complete event
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 text-sm border-t border-gray-100 pt-4">
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

          {error && <div className="bg-rose-100 text-rose-700 p-3 rounded-lg">{error}</div>}

          {/* Pipeline Visualization */}
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Vendor Pipeline</h3>
            <div className="space-y-4">
              {Object.entries(assignmentsByCategory).map(([category, categoryAssignments]) => (
                <PipelineLadder
                  key={category}
                  category={category}
                  assignments={categoryAssignments}
                  alternativeVendors={[]} // Would fetch from alternatives endpoint
                  onForceAssign={handleForceAssign}
                />
              ))}
            </div>
          </div>

          {/* Checklist Section */}
          {checklist.length > 0 && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <button
                onClick={() => setChecklistExpanded(!checklistExpanded)}
                className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50"
              >
                <h3 className="font-medium text-gray-800">Event Checklist</h3>
                <span className="text-sm text-gray-500">
                  {checklist.filter(c => c.isComplete).length} of {checklist.length} complete
                </span>
              </button>
              {checklistExpanded && (
                <div className="p-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(checklist.filter(c => c.isComplete).length / checklist.length) * 100}%`
                      }}
                    />
                  </div>
                  <ul className="space-y-2">
                    {checklist.map(item => (
                      <li key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.isComplete}
                          onChange={() => {/* Toggle complete */}}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className={`text-sm ${item.isComplete ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.itemName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Audit Trail */}
          <AuditTimeline referenceType="EVENT" referenceId={id} expandedByDefault={true} />

        </div>

        {/* Right Sidebar - Assignments Needing Action */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Needs Attention</h3>
            {unfilledCategories.length === 0 ? (
              <p className="text-sm text-gray-500">All categories filled</p>
            ) : (
              <div className="space-y-3">
                {unfilledCategories.map(category => {
                  const categoryAssignments = assignmentsByCategory[category];
                  const openAssignment = categoryAssignments.find(a => a.status === 'OPEN');
                  const declinedCount = categoryAssignments.filter(a => a.status === 'DECLINED').length;

                  return (
                    <div key={category} className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                      <p className="font-medium text-rose-800 text-sm">{category}</p>
                      <p className="text-xs text-rose-600 mt-1">
                        {declinedCount > 0 ? `${declinedCount} vendors declined. ` : ''}
                        {openAssignment ? 'Assignment opened, no claim.' : 'Needs assignment.'}
                      </p>
                      <button
                        onClick={() => {
                          const assignment = categoryAssignments.find(a => a.status === 'OPEN') || categoryAssignments[0];
                          setSelectedAssignment(assignment);
                          setForceAssignModal(true);
                        }}
                        className="mt-2 text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded font-medium"
                      >
                        Assign
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignment Status Summary */}
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Status Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Open</span>
                <span className="text-sm font-bold text-orange-600">
                  {assignments.filter(a => a.status === 'OPEN').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-sm font-bold text-amber-600">
                  {assignments.filter(a => a.status === 'PENDING').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Accepted</span>
                <span className="text-sm font-bold text-emerald-600">
                  {assignments.filter(a => a.status === 'ACCEPTED').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Declined</span>
                <span className="text-sm font-bold text-rose-600">
                  {assignments.filter(a => a.status === 'DECLINED').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VendorTrailDrawer
        isOpen={openTrailCategory != null}
        onClose={() => setOpenTrailCategory(null)}
        eventId={id}
      />

      {/* Force Assign Modal */}
      {forceAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                  {assignments.filter(a => a.status === 'OPEN' || a.status === 'DECLINED').map(assignment => (
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
                  onClick={() => handleForceAssign(null, selectedVendor, selectedAssignment?.serviceCategory)}
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