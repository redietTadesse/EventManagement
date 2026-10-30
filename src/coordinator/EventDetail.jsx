import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import PipelineLadder from '../components/PipelineLadder';
import AuditTimeline from '../components/AuditTimeline';
import VendorTrailDrawer from '../components/VendorTrailDrawer';
import ManualAssignModal from '../components/ManualAssignModal';
import VendorSuggestions from '../components/VendorSuggestions';
import EventReadinessWidget from '../components/EventReadinessWidget';
import ChangeDateModal from '../components/ChangeDateModal';

import { useApp } from '../context/AppContext';
import api from '../api/axios';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchAssignmentsForEvent, forceAssign, fetchEventHistory, fetchChecklist, toggleChecklistItem } = useApp();

  const [event, setEvent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [trail, setTrail] = useState(null);
  const [openTrailCategory, setOpenTrailCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceAssignModal, setForceAssignModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendors, setVendors] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [alternativesByCategory, setAlternativesByCategory] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategoryForSuggestions, setSelectedCategoryForSuggestions] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [readinessRefresh, setReadinessRefresh] = useState(0);

  useEffect(() => {
  api.get('/vendors').then(res => setVendors(res.data)).catch(() => {});
}, []);

useEffect(() => {
  if (!event?.date || assignments.length === 0) return;
  const byCat = assignments.reduce((acc, a) => {
    (acc[a.serviceCategory] = acc[a.serviceCategory] || []).push(a);
    return acc;
  }, {});
  const unfilled = Object.keys(byCat).filter(cat =>
    !byCat[cat].some(a => a.status === 'ACCEPTED' || a.status === 'COMPLETED')
  );
  unfilled.forEach(cat => {
    api.get('/vendors/alternatives', {
      params: { category: cat, date: event.date }
    })
      .then(res => {
        setAlternativesByCategory(prev => ({ ...prev, [cat]: res.data || [] }))
      })
      .catch(() => {});
  });
}, [assignments, event?.date]);

useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      try {
        const eventResponse = await api.get(`/events/${id}`);
        const eventRecord = eventResponse.data;
        const [assignmentsData, inquiryResponse] = await Promise.all([
          fetchAssignmentsForEvent(id),
          eventRecord.inquiryId ? api.get(`/inquiries/${eventRecord.inquiryId}`) : Promise.resolve({ data: {} }),
        ]);
        const currentAssignments = assignmentsData || [];
        const inquiry = inquiryResponse.data || {};
        setAssignments(currentAssignments);
        setEvent({
          id: eventRecord.id,
          inquiryId: eventRecord.inquiryId,
          name: eventRecord.name,
          status: eventRecord.status,
          date: inquiry.eventDate || currentAssignments[0]?.eventDate,
          endDate: inquiry.endDate,
          venue: eventRecord.venue,
          venueId: eventRecord.venueId,
          clientName: inquiry.clientName || currentAssignments[0]?.eventClientName,
          expectedAttendees: inquiry.expectedAttendees || currentAssignments[0]?.expectedAttendees,
        });

        // Load checklist
        try {
          const checklistData = await fetchChecklist(eventRecord.id || id);
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

  const reloadAll = async () => {
    const [eventResponse, assignmentsData] = await Promise.all([
      api.get(`/events/${id}`),
      fetchAssignmentsForEvent(id),
    ]);
    const eventRecord = eventResponse.data;
    const inquiryResponse = eventRecord.inquiryId ? await api.get(`/inquiries/${eventRecord.inquiryId}`) : { data: {} };
    const currentAssignments = assignmentsData || [];
    const inquiry = inquiryResponse.data || {};
    setAssignments(currentAssignments);
    setEvent({
      id: eventRecord.id,
      inquiryId: eventRecord.inquiryId,
      name: eventRecord.name,
      status: eventRecord.status,
      date: inquiry.eventDate || currentAssignments[0]?.eventDate,
      endDate: inquiry.endDate,
      venue: eventRecord.venue,
      venueId: eventRecord.venueId,
      clientName: inquiry.clientName || currentAssignments[0]?.eventClientName,
      expectedAttendees: inquiry.expectedAttendees || currentAssignments[0]?.expectedAttendees,
    });
    const checklistData = await fetchChecklist(id);
    setChecklist(checklistData || []);
  };

  return (
    <Layout title="Event Detail">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <EventReadinessWidget eventId={event?.id || id} refreshKey={readinessRefresh} />
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
                {!['CANCELLED', 'COMPLETED', 'CLOSED'].includes(event?.status) && (
                <button
                  onClick={() => setShowDateModal(true)}
                  className="text-sm text-indigo-700 hover:text-indigo-800 px-3 py-2 border border-indigo-300 rounded-lg"
                >
                  Change date
                </button>
                )}
<button
                          onClick={async () => {
                            if (!confirm('Cancel this event? This cannot be undone.')) return;
                            try {
                              await api.patch(`/events/${event.id}/status`, null, {
                                params: { status: 'CANCELLED' }
                              });
                              window.location.reload();
                            } catch (err) {
                              setError(err.response?.data?.message || 'Failed to cancel event');
                            }
                          }}
                          className="text-sm text-rose-600 hover:text-rose-700 px-3 py-2 border border-rose-300 rounded-lg"
                        >
                          Cancel event
                        </button>
                        {event?.status === 'CONFIRMED' && (
                          <button
                            onClick={async () => {
                              if (!confirm('Mark this event as COMPLETED?')) return;
                              try {
                                await api.patch(`/events/${event.id}/status`, null, {
                                  params: { status: 'COMPLETED' }
                                });
                                window.location.reload();
                              } catch (err) {
                                setError(err.response?.data?.message || 'Failed to complete event');
                              }
                            }}
                            className="text-sm text-emerald-600 hover:text-emerald-700 px-3 py-2 border border-emerald-300 rounded-lg"
                          >
                            Complete event
                          </button>
                        )}
              </div>
            </div>
          </div>

          {error && <div className="bg-rose-100 text-rose-700 p-3 rounded-lg">{error}</div>}

          {/* Pipeline Visualization */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Vendor Pipeline</h3>
            <div className="space-y-4">
              {Object.entries(assignmentsByCategory).map(([category, categoryAssignments]) => (
                <PipelineLadder
                  key={category}
                  category={category}
                  assignments={categoryAssignments}
                  alternativeVendors={alternativesByCategory[category] || []} // Would fetch from alternatives endpoint
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
                          onChange={async () => {
                            try {
                              await toggleChecklistItem(item.id, !item.isComplete);
                              setChecklist(prev => prev.map(c =>
                                c.id === item.id ? { ...c, isComplete: !c.isComplete } : c
                              ));
                            } catch (err) {
                              setError(err.response?.data?.message || 'Failed to update checklist');
                            }
                          }}
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
        <div className="lg:sticky lg:top-6 space-y-6">
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
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const assignment = categoryAssignments.find(a => a.status === 'OPEN') || categoryAssignments[0];
                            setSelectedAssignment(assignment);
                            setForceAssignModal(true);
                          }}
                          className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded font-medium"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategoryForSuggestions(category);
                            setShowSuggestions(true);
                          }}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded font-medium"
                        >
                          See Suggestions
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vendor Suggestions Panel */}
          {showSuggestions && selectedCategoryForSuggestions && (
            <div className="bg-white rounded-xl shadow p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  Vendor Suggestions for {selectedCategoryForSuggestions}
                </h3>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <VendorSuggestions
                category={selectedCategoryForSuggestions}
                eventDate={event?.date}
                excludeVendorId={assignmentsByCategory[selectedCategoryForSuggestions]?.find(a => a.status === 'ACCEPTED')?.vendorId}
                onSelectVendor={(vendor) => {
                  const assignment = assignmentsByCategory[selectedCategoryForSuggestions]?.find(a => a.status === 'OPEN') || assignmentsByCategory[selectedCategoryForSuggestions]?.[0];
                  if (assignment) {
                    handleForceAssign(assignment.id, vendor.id, selectedCategoryForSuggestions);
                    setShowSuggestions(false);
                  }
                }}
              />
            </div>
          )}

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

      <ManualAssignModal
        isOpen={forceAssignModal}
        onClose={() => {
          setForceAssignModal(false);
          setSelectedAssignment(null);
        }}
        onAssign={async (vendorId) => {
          await handleForceAssign(
            selectedAssignment?.id,
            vendorId,
            selectedAssignment?.serviceCategory
          );
        }}
        availableVendors={
          selectedAssignment
            ? vendors.filter(v =>
                v.serviceCategory === selectedAssignment.serviceCategory && v.isActive
              )
            : []
        }
        serviceCategory={selectedAssignment?.serviceCategory}
      />

      <ChangeDateModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        eventId={event?.id || id}
        currentDate={event?.date}
        onDateChanged={async () => {
          await reloadAll();
          setReadinessRefresh(value => value + 1);
        }}
      />
    </Layout>
  );
}
