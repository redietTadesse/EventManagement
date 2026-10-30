import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, fetchUsers, toggleVendorStatus } = useApp();
  const { users, loading } = state;
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      const found = users.find(u => u.id === parseInt(id));
      setVendor(found);
    }
  }, [users, id]);

  const handleToggle = async () => {
    try {
      await toggleVendorStatus(id);
      await fetchUsers();
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  if (loading || !vendor) {
    return (
      <Layout title="Vendor Details">
        <div className="animate-pulse text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Vendor Details">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/vendors')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{vendor.fullName || 'Vendor'}</h1>
        <span className={`ml-2 text-xs px-3 py-1 rounded-full ${vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {vendor.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Vendor Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Company Name</p>
                <p className="font-medium">{vendor.fullName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{vendor.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium">{vendor.username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium">{vendor.role || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Actions</h3>
            <button
              onClick={() => navigate(`/admin/vendors/${id}/edit`)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium mb-3"
            >
              Edit Vendor
            </button>
            <button
              onClick={async () => {
                if (confirm(`Toggle ${vendor.fullName} active status?`)) {
                  await handleToggle();
                }
              }}
              className={`w-full px-4 py-2 rounded-lg font-medium ${vendor.isActive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
            >
              {vendor.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
