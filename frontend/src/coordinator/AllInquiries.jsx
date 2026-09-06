import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function AllInquiries() {
  const { state } = useApp();
  const inquiries = state?.inquiries || [];
  const [filter, setFilter] = useState('All');

  const statuses = ['All', ...new Set(inquiries.map(i => i.status).filter(Boolean))];
  const filtered = filter === 'All' ? inquiries : inquiries.filter(i => i.status === filter);

  return (
    <Layout title="All Inquiries">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E293B' }}>All Inquiries</h1>
          <span style={{ fontSize: '14px', color: '#64748B' }}>Total: {filtered.length}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #E2E8F0',
                backgroundColor: filter === s ? '#1E2761' : 'white',
                color: filter === s ? 'white' : '#475569',
                cursor: 'pointer'
              }}
            >
              {s === 'All' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No inquiries found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Event Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Attendees</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(inq => (
                    <tr key={inq.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{inq.clientName}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{inq.eventType}</td>
                      <td className="px-4 py-3 text-slate-600">{inq.eventDate ? new Date(inq.eventDate).toLocaleDateString() : 'TBD'}</td>
                      <td className="px-4 py-3 text-slate-600">{inq.expectedAttendees || 0}</td>
                      <td className="px-4 py-3"><StatusBadge status={inq.status} /></td>
                      <td className="px-4 py-3">
                        <Link to={`/coordinator/inquiries/${inq.id}`} className="text-navy hover:text-navy/80 text-sm font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}