import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import NotificationsPanel from '../../components/NotificationsPanel';
import CoordinatorCharts from '../../components/CoordinatorCharts';
import { InboxIcon, ClockIcon, ExclamationCircleIcon, BellAlertIcon } from '@heroicons/react/24/outline';

const CoordinatorDashboard = () => {
  const { state, dispatch } = useApp();
  const { inquiries, assignments, vendors, notifications, currentUser } = state;
  const newInquiries = inquiries.filter(i => i.status === 'INQUIRY_SUBMITTED');
  const pendingAssignments = assignments.filter(a => a.status === 'PENDING');
  const declinedAssignments = assignments.filter(a => a.status === 'DECLINED');
  const unreadNotifications = notifications.filter(n => n.userId === currentUser?.id && !n.isRead).length;

  const needsCoordinator = inquiries.filter(i => i.event?.status === 'NEEDS_COORDINATOR');

  return (
    <div className="page-enter">
      <PageHeader title="Coordinator Dashboard" subtitle="Monitor inquiries, vendor responses, and event readiness." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="New Inquiries" value={newInquiries.length} icon={<InboxIcon className="w-6 h-6" />} color="navy" />
        <StatCard label="Pending Vendor Responses" value={pendingAssignments.length} icon={<ClockIcon className="w-6 h-6" />} color="amber" />
        <StatCard label="Declined (Needs Reassign)" value={declinedAssignments.length} icon={<ExclamationCircleIcon className="w-6 h-6" />} color="rose" />
        <StatCard label="Unread Notifications" value={unreadNotifications} icon={<BellAlertIcon className="w-6 h-6" />} color="green" />
      </div>

      <CoordinatorCharts />

      {needsCoordinator.length > 0 && (
        <div className="mb-6 p-4 bg-rose/10 border border-rose/20 rounded-lg text-rose-dark text-sm">
          {needsCoordinator.length} event(s) require manual vendor assignment. See below.
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-800 mb-3">New Inquiries</h2>
      <div className="card overflow-hidden p-0 mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Event Type</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {newInquiries.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No new inquiries</td></tr>
              ) : (
                newInquiries.map(inq => (
                  <tr key={inq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{inq.clientName}</td>
                    <td className="px-4 py-3 text-slate-600">{inq.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                    <td className="px-4 py-3 text-slate-600">{inq.eventDate}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/coordinator/inquiries/${inq.id}`} className="btn-primary text-sm">Generate Proposal</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-3">Events Needing Coordinator</h2>
      {needsCoordinator.length === 0 ? (
        <div className="card text-center text-sm text-slate-500 mb-8">No events need manual intervention.</div>
      ) : (
        <div className="space-y-3 mb-8">
          {needsCoordinator.map(inquiry => {
            const event = inquiry.event;
            const unfilled = event.unfilledCategories || [];
            return (
              <div key={inquiry.id} className="card p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <h4 className="font-semibold text-slate-800">{event.name}</h4>
                  <p className="text-sm text-slate-500">Unfilled: {unfilled.join(', ')}</p>
                </div>
                <Link to={`/coordinator/events/${event.id}`} className="btn-primary text-sm">Manage</Link>
              </div>
            );
          })}
        </div>
      )}

      <NotificationsPanel limit={5} />
    </div>
  );
};

export default CoordinatorDashboard;