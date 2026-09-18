import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function Events() {
  const { state } = useApp();
  const inquiries = state?.inquiries || [];
  const events = inquiries.filter(i => i.status === 'EVENT_CREATED' || i.status === 'PROPOSAL_ACCEPTED');

  return (
    <Layout title="Events">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E293B' }}>Events</h1>
          <span style={{ fontSize: '14px', color: '#64748B' }}>Total: {events.length}</span>
        </div>

        <div className="card overflow-hidden p-0">
          {events.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <p>No events created yet.</p>
              <Link to="/coordinator/inquiries" className="text-navy hover:underline mt-2 inline-block">
                View inquiries to convert
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map(inq => (
                    <tr key={inq.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800 capitalize">{inq.eventType}</td>
                      <td className="px-4 py-3 text-slate-600">{inq.clientName}</td>
                      <td className="px-4 py-3"><StatusBadge status={inq.status} /></td>
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