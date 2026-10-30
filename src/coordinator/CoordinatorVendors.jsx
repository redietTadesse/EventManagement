import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import VendorPerformanceModal from '../components/VendorPerformanceModal';

export default function CoordinatorVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ category: '', search: '', active: '' });
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/vendors');
        setVendors(res.data);
      } catch {
        setError('Failed to load vendors');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredVendors = vendors.filter((v) => {
    if (filters.category && v.serviceCategory !== filters.category) return false;
    if (filters.search && !v.companyName?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.active === 'true' && !v.isActive) return false;
    if (filters.active === 'false' && v.isActive) return false;
    return true;
  });

  const categories = [...new Set(vendors.map((v) => v.serviceCategory).filter(Boolean))];

  return (
    <Layout title="Vendors">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Vendors</h1>
        <p className="text-sm text-gray-500">Directory of service providers. Activation is managed by an administrator.</p>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[150px]"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{String(c).replace(/_/g, ' ').toUpperCase()}</option>
          ))}
        </select>
        <select
          value={filters.active}
          onChange={(e) => setFilters({ ...filters, active: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          onClick={() => setFilters({ category: '', search: '', active: '' })}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl shadow p-4 h-32" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          No vendors found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-xl shadow border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
                    {vendor.companyName?.charAt(0) || 'V'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{vendor.companyName}</h4>
                    <p className="text-sm text-gray-500 capitalize">{vendor.serviceCategory?.replace(/_/g, ' ')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex text-amber-400 text-sm">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>{i < Math.floor(vendor.rating || 0) ? '★' : '☆'}</span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{vendor.rating || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 text-sm text-gray-500 grid grid-cols-2 gap-1">
                <span>📞 {vendor.phone || 'N/A'}</span>
                <span>✉️ {vendor.email || 'N/A'}</span>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedVendor(vendor.id)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedVendor && (
        <VendorPerformanceModal vendorId={selectedVendor} onClose={() => setSelectedVendor(null)} />
      )}
    </Layout>
  );
}
