import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';

export default function VendorDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vendor, setVendor] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchVendorData();
    }, [id]);

    const fetchVendorData = async () => {
        setLoading(true);
        try {
            const [vendorRes, assignmentsRes] = await Promise.all([
                api.get(`/vendors/${id}`),
                api.get(`/vendors/${id}/assignments`)
            ]);
            setVendor(vendorRes.data);
            setAssignments(assignmentsRes.data);
        } catch (err) {
            setError('Failed to load vendor details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout title="Vendor Details">
                <div className="animate-pulse">Loading...</div>
            </Layout>
        );
    }

    if (error || !vendor) {
        return (
            <Layout title="Vendor Details">
                <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error || 'Vendor not found'}</div>
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
                <h1 className="text-2xl font-bold text-gray-800">{vendor.companyName}</h1>
                <span className={`ml-2 text-xs px-3 py-1 rounded-full ${vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vendor Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Vendor Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Company Name</p>
                                <p className="font-medium">{vendor.companyName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Service Category</p>
                                <p className="font-medium capitalize">{vendor.serviceCategory?.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Rating</p>
                                <p className="font-medium">{vendor.rating || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium">{vendor.phone || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{vendor.email || 'N/A'}</p>
                            </div>
                            {vendor.description && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500">Description</p>
                                    <p className="font-medium">{vendor.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
{/* Assignments */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Assignments ({assignments.length})</h3>
                        {assignments.length === 0 ? (
                            <p className="text-gray-500">No assignments yet</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Event</th>
                                            <th className="px-4 py-2 text-left">Category</th>
                                            <th className="px-4 py-2 text-left">Status</th>
                                            <th className="px-4 py-2 text-left">Assigned</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignments.map(a => (
                                            <tr key={a.id} className="border-t">
                                                <td className="px-4 py-2">{a.eventName}</td>
                                                <td className="px-4 py-2 capitalize">{a.serviceCategory}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        a.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                                        a.status === 'DECLINED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">{new Date(a.assignedAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
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
                                if (confirm(`Toggle ${vendor.companyName} active status?`)) {
                                    try {
                                        await api.patch(`/vendors/${id}/toggle-active`);
                                        fetchVendorData();
                                    } catch (err) {
                                        alert('Failed to toggle status');
                                    }
                                }
                            }}
                            className={`w-full px-4 py-2 rounded-lg font-medium ${vendor.isActive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                        >
                            {vendor.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow p-6">
                        <h3 className="font-semibold text-gray-800 mb-2">Load</h3>
                        <p className="text-3xl font-bold text-gray-800">
                            {assignments.filter(a => a.status === 'ACCEPTED' || a.status === 'PENDING').length}
                        </p>
                        <p className="text-sm text-gray-500">Active assignments</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}