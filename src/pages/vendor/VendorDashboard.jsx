import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import NotificationsPanel from '../../components/NotificationsPanel';
import { ClockIcon, CheckCircleIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { eventCategoryMap } from '../../data/mockData';

const VendorDashboard = () => {
  const { state, dispatch } = useApp();
  const { currentUser, vendors, assignments, inquiries } = state;
  const vendorProfile = vendors.find(v => v.userId === currentUser.id);
  const myAssignments = assignments.filter(a => a.vendorId === vendorProfile?.id);
  const pendingAssignments = myAssignments.filter(a => a.status === 'PENDING');
  const confirmedAssignments = myAssignments.filter(a => a.status === 'ACCEPTED');

  // Open events: events in AWAITING_VENDORS where vendor's category is not yet filled
  // Excludes events where the vendor already has any assignment (any status)
  const openEvents = inquiries
    .filter(i => i.event && i.event.status === 'AWAITING_VENDORS')
    .filter(i => {
      const hasAnyAssignment = assignments.some(a => a.eventId === i.event.id && a.vendorId === vendorProfile?.id);
      if (hasAnyAssignment) return false;
      const categoriesNeeded = eventCategoryMap[i.eventType] || [];
      const assignedCategories = assignments
        .filter(a => a.eventId === i.event.id && a.status === 'ACCEPTED')
        .map(a => a.serviceCategory);
      const remaining = categoriesNeeded.filter(cat => !assignedCategories.includes(cat));
      return remaining.includes(vendorProfile?.serviceCategory);
    });

  return (
    <div className="page-enter">
      <PageHeader
        title={vendorProfile?.companyName || currentUser.fullName}
        subtitle={`Service category: ${vendorProfile?.serviceCategory || 'N/A'}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending Assignments" value={pendingAssignments.length} icon={<ClockIcon className="w-6 h-6" />} color="amber" />
        <StatCard label="Confirmed Assignments" value={confirmedAssignments.length} icon={<CheckCircleIcon className="w-6 h-6" />} color="green" />
        <StatCard label="Total Assignments" value={myAssignments.length} icon={<ClipboardDocumentListIcon className="w-6 h-6" />} color="navy" />
      </div>

      {openEvents.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Open Events</h2>
          <div className="space-y-3 mb-8">
            {openEvents.map(inquiry => {
              const categoriesNeeded = eventCategoryMap[inquiry.eventType] || [];
              const assignedCategories = assignments
                .filter(a => a.eventId === inquiry.event.id && a.status === 'ACCEPTED')
                .map(a => a.serviceCategory);
              const remaining = categoriesNeeded.filter(cat => !assignedCategories.includes(cat));
              return (
                <div key={inquiry.id} className="card p-4 flex flex-wrap items-center gap-3 hover:shadow-lg transition-all">
                  <div className="flex-1 min-w-[200px]">
                    <h4 className="font-semibold text-slate-800">{inquiry.event.name}</h4>
                    <p className="text-sm text-slate-500">{inquiry.eventDate} · {remaining.join(', ')} needed</p>
                  </div>
                  <button
                    className="btn-primary text-sm"
                    onClick={() => {
                      if (window.confirm('Accept this open event?')) {
                        dispatch({
                          type: 'ACCEPT_OPEN_EVENT',
                          payload: { eventId: inquiry.event.id, vendorId: vendorProfile.id },
                        });
                      }
                    }}
                  >
                    Volunteer
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold text-slate-800 mb-3">Pending Assignments</h2>
      {pendingAssignments.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">No pending assignments — you're all caught up.</div>
      ) : (
        <div className="space-y-3">
          {pendingAssignments.map(assignment => (
            <div key={assignment.id} className="card p-4 flex flex-wrap items-center gap-3 hover:shadow-lg transition-all">
              <div className="flex-1 min-w-[200px]">
                <h4 className="font-semibold text-slate-800">{assignment.eventName}</h4>
                <p className="text-sm text-slate-500">{assignment.serviceCategory}</p>
              </div>
              <span className="badge badge-amber">Needs Response</span>
              <Link to={`/vendor/assignments/${assignment.id}`} className="btn-primary text-sm">Respond</Link>
            </div>
          ))}
        </div>
      )}

      <NotificationsPanel limit={5} />
    </div>
  );
};

export default VendorDashboard;