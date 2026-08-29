import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

const AllEvents = () => {
  const { state } = useApp();
  const { inquiries } = state;
  const events = inquiries.filter(i => i.event).map(i => i.event);

  return (
    <div className="page-enter">
      <PageHeader title="Events" subtitle="All events currently being planned or executed." />

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Event</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Checklist Items</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No events yet</td></tr>
              ) : (
                events.map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{ev.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{ev.checklist.length}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/coordinator/events/${ev.id}`} className="text-navy hover:text-navy/80 text-sm font-medium">
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

export default AllEvents;