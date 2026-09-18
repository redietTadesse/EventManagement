import React from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function VendorDashboard() {
  const { state } = useApp();
  const currentUser = state?.currentUser || null;

  return (
    <Layout title="Vendor Dashboard">
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E293B' }}>
          Welcome, {currentUser?.fullName || currentUser?.username || 'Vendor'}
        </h1>
        <p style={{ color: '#64748B', marginBottom: '20px' }}>
          Review and respond to your event assignments.
        </p>

        <div className="card text-center py-12">
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧰</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B' }}>
            No assignments yet
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '400px', margin: '8px auto 0' }}>
            When the coordinator assigns services to you, your assignments will appear here.
          </p>
        </div>
      </div>
    </Layout>
  );
}