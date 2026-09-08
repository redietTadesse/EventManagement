import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

export default function VendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { state, fetchUsers, createVendor } = useApp();
  const { users } = state;

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    serviceCategory: 'av',
    phone: '',
    description: '',
    isActive: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      const vendor = users.find(u => u.id === parseInt(id));
      if (vendor) {
        setForm({
          ...form,
          username: vendor.username || '',
          email: vendor.email || '',
          fullName: vendor.fullName || '',
          companyName: vendor.fullName || '',
          isActive: vendor.isActive !== undefined ? vendor.isActive : true
        });
      }
    }
  }, [id, users]);

  const handleChange = (e) => {
    setForm({...form, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        // Update logic would go here
        navigate('/admin/vendors');
      } else {
        await createVendor({
          username: form.username,
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          companyName: form.companyName,
          serviceCategory: form.serviceCategory,
          phone: form.phone
        });
        navigate('/admin/vendors');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'av', label: 'AV Equipment' },
    { value: 'catering', label: 'Catering' },
    { value: 'security', label: 'Security' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'photography', label: 'Photography' },
    { value: 'music', label: 'Music' }
  ];

  return (
    <Layout title={isEdit ? 'Edit Vendor' : 'Add Vendor'}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/vendors')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>
          )}

          {!isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                  minLength="6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Category *</label>
            <select
              name="serviceCategory"
              value={form.serviceCategory}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows="3"
              value={form.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Services offered, experience, etc."
            />
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Vendor' : 'Create Vendor'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/vendors')}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}