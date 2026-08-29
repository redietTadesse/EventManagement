import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ConflictSuggestion from '../../components/ConflictSuggestion';
import { hasConflict } from '../../engine/conflict';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AssignmentDetail = () => {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const { assignments, inquiries } = state;
  const navigate = useNavigate();
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [response, setResponse] = useState(null);
  const assignment = assignments.find(a => a.id === parseInt(id));

  if (!assignment) {
    return (
      <div>
        <PageHeader title="Not Found" />
        <p className="text-slate-500">Assignment not found.</p>
      </div>
    );
  }

  // Conflict detection: does this vendor already have an ACCEPTED assignment on this event's date?
  const eventsMap = {};
  inquiries.forEach(i => { if (i.event) eventsMap[i.event.id] = i.eventDate; });
  const eventDate = eventsMap[assignment.eventId];
  const hasScheduleConflict = assignment.status === 'PENDING' &&
    hasConflict(assignment.vendorId, eventDate, assignments, eventsMap);

  const handleAccept = () => {
    if (hasScheduleConflict) return;
    dispatch({
      type: 'RESPOND_TO_ASSIGNMENT',
      payload: { assignmentId: assignment.id, status: 'ACCEPTED' },
    });
    setResponse('accepted');
    setTimeout(() => navigate('/vendor/dashboard'), 1500);
  };

  const handleDecline = () => {
    dispatch({
      type: 'RESPOND_TO_ASSIGNMENT',
      payload: { assignmentId: assignment.id, status: 'DECLINED', declineReason },
    });
    setResponse('declined');
    setTimeout(() => navigate('/vendor/dashboard'), 1500);
  };

  const handleSwap = (newVendorId) => {
    dispatch({
      type: 'REPLACE_ASSIGNMENT',
      payload: { assignmentId: assignment.id, vendorId: newVendorId },
    });
    navigate('/vendor/assignments');
  };

  return (
    <div className="page-enter max-w-2xl mx-auto">
      <PageHeader
        title="Assignment Details"
        subtitle="Review the event before responding."
        action={<button onClick={() => navigate('/vendor/assignments')} className="btn-outline text-sm">← Back</button>}
      />

      {response === 'accepted' && (
        <div className="mb-4 p-3 bg-green/10 text-green rounded-lg text-sm">Assignment accepted! Coordinator notified.</div>
      )}
      {response === 'declined' && (
        <div className="mb-4 p-3 bg-amber/10 text-amber rounded-lg text-sm">Assignment declined. Coordinator will reassign.</div>
      )}

      <div className="card space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{assignment.eventName}</h3>
          <StatusBadge status={assignment.status} />
        </div>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500">Service Category</span>
          <span className="font-medium">{assignment.serviceCategory}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500">Event Date</span>
          <span className="font-medium">{eventDate || '—'}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-slate-500">Assigned</span>
          <span className="font-medium">{new Date(assignment.assignedAt).toLocaleString()}</span>
        </div>

        {/* Conflict warning with actionable suggestions */}
        {hasScheduleConflict && assignment.status === 'PENDING' && (
          <ConflictSuggestion
            assignment={assignment}
            eventDate={eventDate}
            onSuggestSwap={handleSwap}
          />
        )}

        {assignment.status === 'PENDING' && !response && (
          <div className="pt-2 space-y-4">
            <h4 className="font-semibold text-slate-800">Your Choice</h4>
            {hasScheduleConflict ? (
              <div className="flex items-start gap-2 p-3 bg-rose/10 border border-rose/20 rounded-lg text-sm text-rose-dark">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  You cannot accept this assignment because it conflicts with another event you already confirmed on {eventDate}.
                  Use the swap suggestions above, or decline so the coordinator can reassign.
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button onClick={handleAccept} className="btn-success">Accept Assignment</button>
                <button onClick={() => setShowDecline(true)} className="btn-danger">Decline</button>
              </div>
            )}
            {showDecline && (
              <div className="space-y-3">
                <textarea
                  rows={2}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Reason for declining (optional)"
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
                />
                <button onClick={handleDecline} className="btn-danger">Confirm Decline</button>
              </div>
            )}
          </div>
        )}
        {assignment.status === 'ACCEPTED' && (
          <div className="p-3 bg-green/10 text-green rounded-lg text-sm">You have confirmed this assignment.</div>
        )}
        {assignment.status === 'DECLINED' && (
          <div className="p-3 bg-amber/10 text-amber rounded-lg text-sm">
            You declined. Reason: {assignment.declineReason || 'Not provided'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;