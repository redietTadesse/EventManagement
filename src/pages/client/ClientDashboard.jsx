import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import NotificationsPanel from '../../components/NotificationsPanel';
import { PlusIcon, DocumentTextIcon, BellAlertIcon } from '@heroicons/react/24/outline';

const ClientDashboard = () => {
  const { state } = useApp();
  const { currentUser, inquiries, notifications } = state;
  const myInquiries = inquiries.filter(i => i.clientId === currentUser.id);
  const unreadNotifications = notifications.filter(n => n.userId === currentUser.id && !n.isRead).length;

  return (
    <div className="page-enter">
      <PageHeader
        title={`Welcome, ${currentUser.fullName}`}
        subtitle="Track your inquiries, proposals, and upcoming events."
        action={
          <Link to="/client/inquiries/new" className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-1" /> New Inquiry
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Inquiries" value={myInquiries.length} icon={<DocumentTextIcon className="w-6 h-6" />} color="navy" />
        <StatCard label="Pending Proposals" value={myInquiries.filter(i => i.status === 'PROPOSAL_SENT').length} icon={<DocumentTextIcon className="w-6 h-6" />} color="amber" />
        <StatCard label="Unread Notifications" value={unreadNotifications} icon={<BellAlertIcon className="w-6 h-6" />} color="green" />
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Inquiries</h2>
      <div className="space-y-3">
        {myInquiries.length === 0 ? (
          <div className="card text-center text-sm text-slate-500">No inquiries yet — create your first one.</div>
        ) : (
          myInquiries.slice(0, 5).map(inq => (
            <div key={inq.id} className="card p-4 flex flex-wrap items-center gap-3 hover:shadow-lg transition-all">
              <div className="flex-1 min-w-[200px]">
                <h4 className="font-semibold text-slate-800">
                  {inq.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </h4>
                <p className="text-sm text-slate-500">{inq.eventDate} · {inq.expectedAttendees} attendees</p>
              </div>
              <StatusBadge status={inq.status} />
              <Link to={`/client/inquiries/${inq.id}`} className="btn-outline text-sm">View</Link>
            </div>
          ))
        )}
      </div>

      <NotificationsPanel limit={5} />
    </div>
  );
};

export default ClientDashboard;