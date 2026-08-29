import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

const Assignments = () => {
  const { state } = useApp();
  const { currentUser, vendors, assignments } = state;
  const vendorProfile = vendors.find(v => v.userId === currentUser.id);
  const myAssignments = assignments.filter(a => a.vendorId === vendorProfile?.id);

  return (
    <div className="page-enter">
      <PageHeader title="My Assignments" subtitle="Every event you've been assigned to." />

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Event</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Assigned</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myAssignments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No assignments yet</td></tr>
              ) : (
                myAssignments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.eventName}</td>
                    <td className="px-4 py-3 text-slate-600">{a.serviceCategory}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{new Date(a.assignedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/vendor/assignments/${a.id}`} className="text-navy hover:text-navy/80 text-sm font-medium">
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

export default Assignments;