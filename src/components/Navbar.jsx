import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import NotificationsBell from './NotificationsBell';

const Navbar = () => {
  const { state, logout } = useApp();
  const { currentUser } = state;
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const initials = currentUser.fullName.split(' ').map((w) => w[0]).join('');

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
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
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <NotificationsBell />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-semibold">
                {initials}
              </div>
              <div className="text-sm leading-tight">
                <div className="font-medium text-white">{currentUser.fullName}</div>
                <div className="text-xs text-slate-400">{roleLabel}</div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-300 hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="hidden md:block text-sm text-slate-400 hover:text-rose-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel (shown below the navbar on small screens) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-y border-slate-800 bg-slate-900 shadow-sm">
          <div className="container mx-auto px-4 max-w-7xl divide-y divide-slate-800">
            <div className="px-4 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-semibold">
                {initials}
              </div>
              <div>
                <div className="font-medium text-white text-sm">{currentUser.fullName}</div>
                <div className="text-xs text-slate-400">{roleLabel}</div>
              </div>
            </div>
            <nav className="px-4 py-3 space-y-1" aria-label="Mobile navigation">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-3">
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-3 text-sm font-medium text-left text-rose-400 hover:bg-slate-800 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;