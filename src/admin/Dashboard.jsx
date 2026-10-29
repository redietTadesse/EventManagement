import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

export default function AdminDashboard() {
  const { state, dispatch } = useApp();
  const { users = [], inquiries = [] } = state;

  // Modal state for editing a user
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', role: '' });

  // Stats
  const totalVendors = users.filter(u => u.role === 'VENDOR').length;
  const totalClients = users.filter(u => u.role === 'CLIENT').length;

  // ===== ACTIONS =====
  const handleToggleStatus = (id) => {
    dispatch({ type: 'TOGGLE_USER_STATUS', payload: id });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      dispatch({ type: 'DELETE_USER', payload: id });
    }
  };

  const handleResetPassword = (name) => {
    const confirmReset = window.confirm(`Reset password for ${name} to 'password123'?`);
    if (confirmReset) {
      dispatch({ type: 'RESET_PASSWORD', payload: name });
      alert(`✅ Password for ${name} has been reset to: password123`);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({ fullName: user.fullName || '', email: user.email || '', role: user.role || 'CLIENT' });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    dispatch({ 
      type: 'UPDATE_USER', 
      payload: { ...editingUser, ...editForm } 
    });
    setEditingUser(null);
  };

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Administration</h1>
          <p className="text-gray-600">Manage users, vendors, and system-wide settings.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Vendors</p>
            <p className="text-2xl font-bold text-gray-800">{totalVendors}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Clients</p>
            <p className="text-2xl font-bold text-gray-800">{totalClients}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Inquiries</p>
            <p className="text-2xl font-bold text-gray-800">{inquiries.length}</p>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-medium text-gray-800">User Management</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => {
                  const isActive = u.isActive !== false; 

                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{u.fullName || u.username}</div>
                        <div className="text-gray-500 text-xs">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isActive ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(u)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleResetPassword(u.fullName || u.username)}
                          className="text-orange-500 hover:text-orange-700 text-xs font-medium"
                        >
                          Reset Pwd
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(u.id)}
                          className={`text-xs font-medium ${isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id, u.fullName || u.username)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Edit User</h3>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CLIENT">Client</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="COORDINATOR">Coordinator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
