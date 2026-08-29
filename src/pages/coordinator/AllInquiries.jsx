import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

const AllInquiries = () => {
  const { state } = useApp();
  const { inquiries } = state;

  return (
    <div className="page-enter">
      <PageHeader title="All Inquiries" subtitle="Every inquiry across all clients and lifecycle stages." />

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Event Type</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Attendees</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inquiries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No inquiries</td></tr>
              ) : (
                inquiries.map(inq => (
                  <tr key={inq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{inq.clientName}</td>
                    <td className="px-4 py-3 text-slate-600">{inq.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                    <td className="px-4 py-3 text-slate-600">{inq.eventDate}</td>
                    <td className="px-4 py-3 text-slate-600">{inq.expectedAttendees}</td>
                    <td className="px-4 py-3"><StatusBadge status={inq.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/coordinator/inquiries/${inq.id}`} className="text-navy hover:text-navy/80 text-sm font-medium">
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

export default AllInquiries;