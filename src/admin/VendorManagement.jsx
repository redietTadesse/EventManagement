import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../store/AppContext';

export default function VendorManagement() {
  const { state, fetchUsers, toggleVendorStatus } = useApp();
  const { users, loading } = state;
  const [vendors, setVendors] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    active: ''
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();
    };
    loadData();
  }, []);

  useEffect(() => {
    const vendorUsers = users.filter(u => u.role === 'VENDOR');
    setVendors(vendorUsers);
  }, [users]);

  const filteredVendors = vendors.filter(v => {
    if (filters.search && !v.fullName?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.active === 'true' && !v.isActive) return false;
    if (filters.active === 'false' && v.isActive) return false;
    return true;
  });

  const handleToggle = async (id) => {
    await toggleVendorStatus(id);
    await fetchUsers();
  };

  if (loading) {
    return (
      <Layout title="Vendor Management">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Vendor Management">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vendors</h1>
          <p className="text-sm text-gray-500">Manage all service providers</p>
        </div>
        <Link
          to="/admin/vendors/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add Vendor
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[150px]"
        />
        <select
          value={filters.active}
          onChange={(e) => setFilters({...filters, active: e.target.value})}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          onClick={() => setFilters({category: '', search: '', active: ''})}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>

      {filteredVendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          No vendors found. <Link to="/admin/vendors/new" className="text-indigo-600">Add one</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map(vendor => (
            <VendorCard 
              key={vendor.id} 
              vendor={vendor} 
              onToggle={() => handleToggle(vendor.id)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

function VendorCard({ vendor, onToggle }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle();
    } catch (err) {
      alert('Failed to toggle vendor status');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border p-4 hover:shadow-lg transition">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
            {vendor.fullName?.charAt(0) || 'V'}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">{vendor.fullName}</h4>
            <p className="text-sm text-gray-500">{vendor.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full ${vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <Link to={`/admin/vendors/${vendor.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">
          View Details →
        </Link>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`text-xs px-3 py-1 rounded-lg ${vendor.isActive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
        >
          {toggling ? '...' : vendor.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}