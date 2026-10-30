import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ResponsiveTable from '../components/ResponsiveTable';
import api from '../api/axios';

export default function VendorManagement() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [recalculating, setRecalculating] = useState(false);
    const [filters, setFilters] = useState({
        category: '',
        search: '',
        minRating: '',
        active: ''
    });

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vendors');
            setVendors(res.data);
        } catch (err) {
            setError('Failed to load vendors');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredVendors = vendors.filter(v => {
        if (filters.category && v.serviceCategory !== filters.category) return false;
        if (filters.search && !v.companyName.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.minRating && (v.rating || 0) < parseFloat(filters.minRating)) return false;
        if (filters.active === 'true' && !v.isActive) return false;
        if (filters.active === 'false' && v.isActive) return false;
        return true;
    });

    const categories = [...new Set(vendors.map(v => v.serviceCategory))];

    const handleToggleVendor = async (vendorId) => {
        try {
            await api.patch(`/vendors/${vendorId}/toggle-active`);
            fetchVendors();
        } catch (err) {
            alert('Failed to toggle vendor status');
        }
    };

    const handleRecalculateRatings = async () => {
        if (!window.confirm('Recalculate ratings for all vendors?')) return;
        setRecalculating(true);
        setToast('');
        setError('');
        try {
            const response = await api.post('/vendors/recalculate-ratings');
            await fetchVendors();
            setToast(response.data?.message || 'Vendor ratings recalculated successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to recalculate vendor ratings.');
        } finally {
            setRecalculating(false);
        }
    };

    return (
        <Layout title="Vendor Management">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Vendors</h1>
                    <p className="text-sm text-gray-500">Manage all service providers</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <section aria-label="Maintenance" className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Maintenance</p>
                        <button
                            type="button"
                            onClick={handleRecalculateRatings}
                            disabled={recalculating}
                            className="text-sm font-medium text-indigo-700 hover:text-indigo-800 disabled:opacity-50"
                        >
                            {recalculating ? 'Recalculating…' : 'Recalculate Ratings'}
                        </button>
                    </section>
                    <Link
                        to="/admin/vendors/new"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        + Add Vendor
                    </Link>
                </div>
            </div>

            {toast && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{toast}</div>}

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4 mb-6 flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Search by name..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[150px]"
                />
                <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                        <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>
                    ))}
                </select>
                <select
                    value={filters.minRating}
                    onChange={(e) => setFilters({...filters, minRating: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                    <option value="">Any Rating</option>
                    <option value="4">4+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                    <option value="5">5 Stars</option>
                </select>
                <select
                    value={filters.active}
                    onChange={(e) => setFilters({...filters, active: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>
                <button
                    onClick={() => setFilters({category: '', search: '', minRating: '', active: ''})}
                    className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                    Clear
                </button>
            </div>

            {/* Results */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="animate-pulse bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4 h-32"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="bg-rose-100 text-rose-700 p-4 rounded-lg">{error}</div>
            ) : filteredVendors.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-8 text-center text-slate-500">
                    No vendors found. <Link to="/admin/vendors/new" className="text-indigo-600">Add one</Link>
                </div>
            ) : (
                <>
                    {/* Mobile List View */}
                    <div className="md:hidden space-y-3">
                        {filteredVendors.map(vendor => (
                            <div key={vendor.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                                            {vendor.companyName?.charAt(0) || 'V'}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">{vendor.companyName}</h4>
                                            <p className="text-xs text-slate-500 capitalize">{vendor.serviceCategory?.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${vendor.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {vendor.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex text-amber-400 text-xs">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i}>{i < Math.floor(vendor.rating || 0) ? '★' : '☆'}</span>
                                        ))}
                                    </div>
                                    <span className="text-xs text-slate-500">{vendor.rating || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                    <Link to={`/admin/vendors/${vendor.id}`} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                                        View Details
                                    </Link>
                                    <button
                                        onClick={() => handleToggleVendor(vendor.id)}
                                        className={`text-xs px-3 py-1 rounded-lg ${vendor.isActive ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                                    >
                                        {vendor.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Grid View */}
                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredVendors.map(vendor => (
                            <VendorCard key={vendor.id} vendor={vendor} onToggle={fetchVendors} />
                        ))}
                    </div>
                </>
            )}
        </Layout>
    );
}
// ===== VendorCard Component =====

function VendorCard({ vendor, onToggle }) {
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        try {
            await api.patch(`/vendors/${vendor.id}/toggle-active`);
            onToggle();
        } catch (err) {
            alert('Failed to toggle vendor status');
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0">
                        {vendor.companyName?.charAt(0) || 'V'}
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800">{vendor.companyName}</h4>
                        <p className="text-sm text-slate-500 capitalize">{vendor.serviceCategory?.replace('_', ' ')}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex text-amber-400 text-sm">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i}>{i < Math.floor(vendor.rating || 0) ? '★' : '☆'}</span>
                                ))}
                            </div>
                            <span className="text-xs text-slate-500">{vendor.rating || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${vendor.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="mt-3 text-sm text-slate-500 grid grid-cols-2 gap-1">
                <span>📞 {vendor.phone || 'N/A'}</span>
                <span>✉️ {vendor.email || 'N/A'}</span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                <Link to={`/admin/vendors/${vendor.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                    View Details →
                </Link>
                <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className={`text-xs px-3 py-1 rounded-lg ${vendor.isActive ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                >
                    {toggling ? '...' : vendor.isActive ? 'Deactivate' : 'Activate'}
                </button>
            </div>
        </div>
    );
}
