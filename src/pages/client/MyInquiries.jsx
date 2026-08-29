import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

const MyInquiries = () => {
  const { state } = useApp();
  const { currentUser, inquiries } = state;
  const myInquiries = inquiries.filter(i => i.clientId === currentUser.id);

  return (
    <div className="page-enter">
      <PageHeader title="My Inquiries" subtitle="All your event requests and their current status." />

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Event Type</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Attendees</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myInquiries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No inquiries yet</td></tr>
              ) : (
                myInquiries.map(inq => (
                  <tr key={inq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {inq.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inq.eventDate}</td>
                    <td className="px-4 py-3 text-slate-600">{inq.expectedAttendees}</td>
                    <td className="px-4 py-3"><StatusBadge status={inq.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/client/inquiries/${inq.id}`} className="text-navy hover:text-navy/80 text-sm font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyInquiries;