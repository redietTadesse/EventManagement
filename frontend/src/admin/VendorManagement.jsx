import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function VendorManagement() {
  const { state } = useApp();
  const users = state?.users || [];
  const vendors = users.filter(u => u.role === 'VENDOR');

  return (
    <Layout title="Vendor Management">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E293B' }}>Vendors</h1>
            <p style={{ fontSize: '14px', color: '#64748B' }}>Manage all service providers</p>
          </div>
          <Link to="/coordinator/vendors/new" className="btn-primary">
            + Add Vendor
          </Link>
        </div>

        <div className="card overflow-hidden p-0">
          {vendors.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No vendors found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{v.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">{v.email}</td>
                      <td className="px-4 py-3">
                        <Link to={`/coordinator/vendors/${v.id}`} className="text-navy hover:text-navy/80 text-sm font-medium">
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
