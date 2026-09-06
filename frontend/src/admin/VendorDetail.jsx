import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const users = state?.users || [];
  const vendor = users.find(u => u.id === Number(id));

  if (!vendor) {
    return (
      <Layout title="Vendor Details">
        <div className="card text-center py-12 text-slate-500">Vendor not found</div>
      </Layout>
    );
  }

  return (
    <Layout title="Vendor Details">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/coordinator/vendors')}
          className="text-slate-500 hover:text-slate-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{vendor.fullName}</h1>
      </div>
      <div className="card">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Company</p>
            <p className="font-medium">{vendor.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium">{vendor.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Username</p>
            <p className="font-medium">{vendor.username}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Role</p>
            <p className="font-medium">{vendor.role}</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <button
            onClick={() => navigate(`/coordinator/vendors/${id}/edit`)}
            className="btn-primary"
          >
            Edit Vendor
          </button>
        </div>
      </div>
    </Layout>
  );
}