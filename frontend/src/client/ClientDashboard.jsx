import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function ClientDashboard() {
  const { state } = useApp();
  const currentUser = state?.currentUser || null;
  const inquiries = state?.inquiries || [];

  const myInquiries = inquiries.filter(i => i.clientId === currentUser?.id);

  return (
    <Layout title="Client Dashboard">
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E293B' }}>
              Welcome, {currentUser?.fullName || 'Client'}
            </h1>
            <p style={{ color: '#64748B' }}>Here are your event inquiries</p>
          </div>
          <Link to="/client/new-inquiry" className="btn-primary">
            + New Inquiry
          </Link>
        </div>

        {myInquiries.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-500">No inquiries yet</p>
            <Link to="/client/new-inquiry" className="text-navy hover:underline mt-2 inline-block">
              Create your first inquiry
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {myInquiries.map(inq => (
              <div key={inq.id} className="card hover:shadow-dropdown transition">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-slate-800 capitalize">{inq.eventType}</h3>
                  <StatusBadge status={inq.status} />
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {inq.eventDate ? new Date(inq.eventDate).toLocaleDateString() : 'TBD'} · {inq.expectedAttendees || 0} attendees
                </p>
                {inq.requirements && (
                  <p className="text-sm text-slate-600 mt-2 truncate">{inq.requirements}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}