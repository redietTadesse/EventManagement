import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function Layout({ children, title }) {
  const { state, dispatch } = useApp();
  const currentUser = state?.currentUser || null;

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const roleLabel = {
    CLIENT: 'Client',
    VENDOR: 'Vendor',
    COORDINATOR: 'Coordinator'
  }[currentUser?.role] || 'User';

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-navy">AICC</Link>
              {title && <span className="text-sm text-slate-500 hidden sm:inline">{title}</span>}
              <span className="text-xs bg-ice text-navy px-2 py-1 rounded-full hidden md:inline">
                {roleLabel}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden sm:inline">
                {currentUser?.fullName || currentUser?.username || 'Guest'}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-500 hover:text-rose transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}