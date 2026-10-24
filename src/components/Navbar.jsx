import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
// import NotificationsBell from './NotificationsBell';

const Navbar = () => {
  const { state, logout } = useApp();
  const { currentUser } = state;
  const navigate = useNavigate();

  if (!currentUser) return null;

  const roleLabel = { CLIENT: 'Client', VENDOR: 'Vendor', COORDINATOR: 'Coordinator', ADMIN: 'Administrator' }[currentUser.role];
  const links = {
    CLIENT: [
      { to: '/client/dashboard', label: 'Dashboard' },
      { to: '/client/inquiries', label: 'My Inquiries' },
      { to: '/client/events', label: 'My Events' },
      { to: '/client/new-inquiry', label: 'New Inquiry' },
    ],
    VENDOR: [
      { to: '/vendor/dashboard', label: 'Dashboard' },
      { to: '/vendor/assignments', label: 'My Assignments' },
      { to: '/vendor/open', label: 'Open Requests' },
    ],
    COORDINATOR: [
      { to: '/coordinator/dashboard', label: 'Dashboard' },
      { to: '/coordinator/inquiries', label: 'All Inquiries' },
      { to: '/coordinator/events', label: 'Events' },
      { to: '/coordinator/calendar', label: 'Calendar' },
      { to: '/coordinator/vendors', label: 'Vendors' },
      { to: '/coordinator/venues', label: 'Venues' },
    ],
    ADMIN: [
      { to: '/admin/vendors', label: 'Vendors' },
    ],
  }[currentUser.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-navy font-bold text-xl">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            AICC Events
          </Link>
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {/* <NotificationsBell /> */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-ice text-navy flex items-center justify-center text-sm font-semibold">
                {currentUser.fullName.split(' ').map(w => w[0]).join('')}
              </div>
              <div className="text-sm leading-tight">
                <div className="font-medium text-slate-800">{currentUser.fullName}</div>
                <div className="text-xs text-slate-500">{roleLabel}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-rose-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;