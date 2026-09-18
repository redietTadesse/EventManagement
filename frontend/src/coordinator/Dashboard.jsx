import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function CoordinatorDashboard() {
  const { state } = useApp();
  const currentUser = state?.currentUser || null;
  const inquiries = state?.inquiries || [];

  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'INQUIRY_SUBMITTED').length,
    proposals: inquiries.filter(i => i.status === 'PROPOSAL_SENT').length,
  };

  const recent = inquiries.slice(0, 5);

  return (
    <Layout title="Coordinator Dashboard">
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E293B' }}>
            Welcome, {currentUser?.fullName || 'Coordinator'}
          </h1>
          <p style={{ color: '#64748B' }}>Manage event inquiries and operations</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-slate-500">Proposals</p>
            <p className="text-2xl font-bold text-navy">{stats.proposals}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          <Link to="/coordinator/inquiries" className="btn-primary">View All Inquiries</Link>
          <Link to="/coordinator/events" className="btn-success">Manage Events</Link>
          <Link to="/coordinator/vendors" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            Vendor Management
          </Link>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-slate-800">Recent Inquiries</h3>
            <Link to="/coordinator/inquiries" className="text-sm text-navy hover:text-navy/80">
              View All →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No inquiries yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map(inq => (
                <div key={inq.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800">{inq.clientName}</p>
                    <p className="text-sm text-slate-500">
                      {inq.eventType} · {inq.eventDate ? new Date(inq.eventDate).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={inq.status} />
                    <Link to={`/coordinator/inquiries/${inq.id}`} className="text-sm text-navy hover:text-navy/80">
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}