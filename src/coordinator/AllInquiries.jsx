import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ResponsiveTable from '../components/ResponsiveTable';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';

export default function AllInquiries() {
  const { state, fetchInquiries } = useApp();
  const { inquiries, loading } = state;
  const [filter, setFilter] = useState('All');

  

  const statuses = ['All', ...new Set(inquiries.map((i) => i.status).filter(Boolean))];
  const filtered = filter === 'All' ? inquiries : inquiries.filter((i) => i.status === filter);

  if (loading) {
    return (
      <Layout title="All Inquiries">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="All Inquiries">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'All' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden p-4 md:p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No inquiries found"
              description="Try selecting a different status filter."
              size="small"
            />
          ) : (
            <>
              <ResponsiveTable
                columns={[
                  { key: 'client', label: 'Client', render: (inq) => (
                    <span className="text-sm text-slate-600 font-medium">{inq.clientName}</span>
                  )},
                  { key: 'eventType', label: 'Event Type', render: (inq) => (
                    <span className="text-sm text-slate-600 capitalize">{inq.eventType}</span>
                  )},
                  { key: 'eventDate', label: 'Date', render: (inq) => inq.eventDate },
                  { key: 'expectedAttendees', label: 'Attendees', render: (inq) => inq.expectedAttendees },
                  { key: 'status', label: 'Status', render: (inq) => (
                    <StatusBadge status={inq.status} />
                  )},
                  { key: 'action', label: 'Action', render: (inq) => (
                    <Link to={`/coordinator/inquiries/${inq.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                      View
                    </Link>
                  )},
                ]}
                data={filtered}
              />
              <div className="hidden md:block px-6 py-4 bg-slate-50/80 text-xs text-slate-500 border-t border-slate-200">
                Total: {filtered.length} inquiries
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}