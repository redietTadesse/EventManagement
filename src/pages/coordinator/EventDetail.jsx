import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Checklist from '../../components/Checklist';
import Timeline from '../../components/Timeline';
import VendorProfileCard from '../../components/VendorProfileCard';
import VendorRatingForm from '../../components/VendorRatingForm';
import ConflictSuggestion from '../../components/ConflictSuggestion';
import { hasConflict } from '../../engine/conflict';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

const EventDetail = () => {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const { inquiries, vendors, assignments, timeline } = state;
  const navigate = useNavigate();
  const inquiry = inquiries.find(i => i.event?.id === parseInt(id));
  const event = inquiry?.event;
  const eventTimeline = timeline.filter(t => t.eventId === parseInt(id));

  if (!event) {
    return (
      <div>
        <PageHeader title="Not Found" />
        <p className="text-slate-500">Event not found.</p>
      </div>
    );
  }

  const completed = event.checklist.filter(c => c.isComplete).length;
  const eventAssignments = assignments.filter(a => a.eventId === event.id);
  const acceptedVendors = eventAssignments
    .filter(a => a.status === 'ACCEPTED')
    .map(a => vendors.find(v => v.id === a.vendorId))
    .filter(Boolean);

  // Build eventsMap for conflict detection
  const eventsMap = {};
  inquiries.forEach(i => { if (i.event) eventsMap[i.event.id] = i.eventDate; });
  const eventDate = eventsMap[event.id];

  // Pending assignments that conflict with the assigned vendor's calendar
  const conflictingAssignments = eventAssignments.filter(a =>
    a.status === 'PENDING' && hasConflict(a.vendorId, eventDate, assignments, eventsMap)
  );

  // For manual assignment (coordinator)
  const [selectedVendor, setSelectedVendor] = useState('');
  const unfilled = event.unfilledCategories || [];
  const availableVendors = vendors.filter(v =>
    v.isActive && unfilled.includes(v.serviceCategory)
  );

  const handleManualAssign = (category) => {
    if (!selectedVendor) return;
    const vendorId = parseInt(selectedVendor);
    dispatch({
      type: 'MANUAL_ASSIGN',
      payload: { eventId: event.id, category, vendorId },
    });
    alert('Assignment created. Vendor will be notified.');
    navigate('/coordinator/dashboard');
  };

  const handleCompleteEvent = () => {
    if (window.confirm('Mark this event as completed? Clients will then be able to rate their vendors.')) {
      dispatch({ type: 'COMPLETE_EVENT', payload: { eventId: event.id } });
    }
  };

  const handleSwap = (oldAssignment, newVendorId) => {
    dispatch({
      type: 'REPLACE_ASSIGNMENT',
      payload: { assignmentId: oldAssignment.id, vendorId: newVendorId },
    });
  };

  return (
    <div className="page-enter">
      <PageHeader
        title={event.name}
        subtitle={`${completed}/${event.checklist.length} checklist items completed · Event date: ${eventDate || '—'}`}
        action={<button onClick={() => navigate('/coordinator/events')} className="btn-outline text-sm">← Back</button>}
      />

      {/* Venue banner */}
      {event.venue && (
        <div className="card mb-6 bg-ice/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-navy/10 text-navy">
              <BuildingOfficeIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{event.venue}</h3>
              {event.venueDetails && (
                <p className="text-sm text-slate-500">
                  Capacity: {event.venueDetails.capacity} · {event.venueDetails.features.join(', ')}
                  {event.venueDetails.basePrice ? ` · Base: ETB ${event.venueDetails.basePrice.toLocaleString()}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Status</h3>
            <StatusBadge status={event.status} />
          </div>
          <p className="text-sm text-slate-500 mb-4">
            This event was automatically created when the client accepted the proposal.
            It is linked to inquiry #{inquiry.id}.
          </p>
          <h4 className="font-semibold text-slate-800 mb-3">Vendor Assignments</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {eventAssignments.map(a => {
              const vendor = vendors.find(v => v.id === a.vendorId);
              return vendor ? (
                <div key={a.id}>
                  <VendorProfileCard vendor={vendor} assignments={assignments} />
                  <div className="mt-1 ml-1">
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              ) : (
                <div key={a.id} className="flex justify-between items-center text-sm p-2 border rounded">
                  <span>{a.vendorName}</span>
                  <StatusBadge status={a.status} />
                </div>
              );
            })}
            {eventAssignments.length === 0 && (
              <p className="text-sm text-slate-500">No vendors assigned yet.</p>
            )}
          </div>

          {/* Conflict warnings with swap suggestions */}
          {conflictingAssignments.length > 0 && (
            <div className="mt-4 space-y-3">
              <h5 className="font-semibold text-rose-dark">Scheduling Conflicts</h5>
              {conflictingAssignments.map(a => (
                <ConflictSuggestion
                  key={a.id}
                  assignment={a}
                  eventDate={eventDate}
                  onSuggestSwap={(vendorId) => handleSwap(a, vendorId)}
                />
              ))}
            </div>
          )}
          {unfilled.length > 0 && (
            <div className="mt-4 p-3 bg-amber/10 border border-amber/20 rounded-lg">
              <h5 className="font-medium text-amber-dark">Needs Coordinator</h5>
              <p className="text-sm text-slate-600">Unfilled categories: {unfilled.join(', ')}</p>
              {availableVendors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="rounded-lg border-slate-300 text-sm"
                  >
                    <option value="">Select vendor</option>
                    {availableVendors.map(v => (
                      <option key={v.id} value={v.id}>{v.companyName} ({v.serviceCategory})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleManualAssign(unfilled[0])}
                    className="btn-primary text-sm"
                    disabled={!selectedVendor}
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Planning Checklist</h3>
          <Checklist items={event.checklist} />
          {event.status === 'CONFIRMED' && (
            <button onClick={handleCompleteEvent} className="btn-success w-full mt-4">
              Mark Event as Completed
            </button>
          )}
        </div>
      </div>

      {/* Rating section shown when event is completed */}
      {event.status === 'COMPLETED' && acceptedVendors.length > 0 && (
        <div className="mt-6 card">
          <h3 className="text-lg font-semibold mb-1">Rate Vendors</h3>
          <p className="text-sm text-slate-500 mb-4">
            The client can rate each vendor after event completion. These ratings feed into future auto-assignment (tie-breaker).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {acceptedVendors.map(vendor => (
              <VendorRatingForm key={vendor.id} vendor={vendor} eventId={event.id} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 card">
        <h3 className="text-lg font-semibold mb-2">Timeline</h3>
        <Timeline entries={eventTimeline} />
      </div>
    </div>
  );
};

export default EventDetail;