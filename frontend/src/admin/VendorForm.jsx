import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';

export default function VendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    serviceCategory: 'av',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      navigate('/coordinator/vendors');
    }, 500);
  };

  const inputClass = 'w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy outline-none transition';

  return (
    <Layout title={isEdit ? 'Edit Vendor' : 'Add Vendor'}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/coordinator/vendors')}
            className="text-slate-500 hover:text-slate-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="bg-rose/20 text-rose-700 p-3 rounded-lg text-sm">{error}</div>}

          {!isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  minLength="6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
            <input
              type="text"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Category *</label>
            <select
              name="serviceCategory"
              value={form.serviceCategory}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="av">AV Equipment</option>
              <option value="catering">Catering</option>
              <option value="security">Security</option>
              <option value="cleaning">Cleaning</option>
              <option value="photography">Photography</option>
              <option value="music">Music</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Vendor' : 'Create Vendor'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/coordinator/vendors')}
              className="text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}