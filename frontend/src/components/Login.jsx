import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';  // ← UPDATED

const PORTAL_LABELS = {
  client: 'Client',
  vendor: 'Vendor',
  coordinator: 'Coordinator',
};

const ROLE_DASHBOARDS = {
  CLIENT: '/client/dashboard',
  VENDOR: '/vendor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
};

// ===== Mock Users =====
const mockUsers = [
  { id: 1, username: 'client1', password: 'password123', role: 'CLIENT', fullName: 'John Client', email: 'client@example.com' },
  { id: 4, username: 'coordinator1', password: 'password123', role: 'COORDINATOR', fullName: 'Jane Coordinator', email: 'coord@aicc.et' },
  { id: 2, username: 'vendor1', password: 'password123', role: 'VENDOR', fullName: 'AV Solutions', email: 'av@example.com' },
  { id: 3, username: 'vendor2', password: 'password123', role: 'VENDOR', fullName: 'Catering Plus', email: 'catering@example.com' },
  { id: 5, username: 'vendor3', password: 'password123', role: 'VENDOR', fullName: 'SecureGuard', email: 'secure@example.com' },
  { id: 6, username: 'vendor4', password: 'password123', role: 'VENDOR', fullName: 'CleanCo', email: 'clean@example.com' },
  { id: 7, username: 'vendor5', password: 'password123', role: 'VENDOR', fullName: 'PhotoPro', email: 'photo@example.com' },
  { id: 8, username: 'vendor6', password: 'password123', role: 'VENDOR', fullName: 'Melody Events', email: 'music@example.com' },
  { id: 9, username: 'vendor7', password: 'password123', role: 'VENDOR', fullName: 'Gourmet Catering', email: 'gourmet@example.com' },
  { id: 10, username: 'vendor8', password: 'password123', role: 'VENDOR', fullName: 'Sound & Light Co.', email: 'sound@example.com' },
  { id: 11, username: 'vendor9', password: 'password123', role: 'VENDOR', fullName: 'Elite Security', email: 'elite@example.com' },
  { id: 12, username: 'vendor10', password: 'password123', role: 'VENDOR', fullName: 'Sparkle Clean', email: 'sparkle@example.com' },
  { id: 13, username: 'vendor11', password: 'password123', role: 'VENDOR', fullName: 'Capture Moments', email: 'capture@example.com' },
  { id: 14, username: 'vendor12', password: 'password123', role: 'VENDOR', fullName: 'DJ Vibes', email: 'dj@example.com' },
  { id: 15, username: 'vendor13', password: 'password123', role: 'VENDOR', fullName: 'ProStage AV', email: 'prostage@example.com' },
  { id: 16, username: 'vendor14', password: 'password123', role: 'VENDOR', fullName: 'Addis Feast Catering', email: 'adfeast@example.com' },
  { id: 17, username: 'vendor15', password: 'password123', role: 'VENDOR', fullName: 'GuardPlus', email: 'guardplus@example.com' },
];

export default function Login() {
  const { portal } = useParams();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ fullName: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const portalKey = portal?.toLowerCase();
  const portalLabel = PORTAL_LABELS[portalKey];

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignIn = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const username = form.username.trim();
    const password = form.password.trim();

    const user = mockUsers.find(
      u => u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password
    );

    if (user) {
      dispatch({ type: 'LOGIN', payload: user });
      const path = ROLE_DASHBOARDS[user.role] || '/';
      navigate(path, { replace: true });
    } else {
      setError('Invalid username or password');
    }
    setSubmitting(false);
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const username = form.username.trim();

    if (mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      setError('Username already exists');
      setSubmitting(false);
      return;
    }

    const newUser = {
      id: mockUsers.length + 1,
      username: username,
      password: form.password.trim(),
      role: 'CLIENT',
      fullName: form.fullName.trim(),
      email: `${username}@example.com`,
    };
    mockUsers.push(newUser);
    dispatch({ type: 'LOGIN', payload: newUser });
    navigate('/client/dashboard', { replace: true });
    setSubmitting(false);
  };

  const inputClass = 'w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy outline-none transition';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-dropdown p-8">
        <Link to="/" className="text-sm text-navy hover:text-navy/80">← All portals</Link>
        <h2 className="text-2xl font-bold text-center text-slate-800 mt-4">AICC Event Management</h2>
        <p className="text-center text-sm text-slate-500 mt-1 mb-6">
          {mode === 'signin'
            ? portalLabel ? `Sign in to the ${portalLabel} Portal` : 'Sign in to your portal'
            : portalLabel ? `Create your ${portalLabel} Portal account` : 'Create a client account'}
        </p>

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn}>
            {error && (
              <div className="bg-rose/20 text-rose-700 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                className={inputClass}
                value={form.username}
                onChange={handleChange}
                required
                placeholder="e.g., client1, vendor1, coordinator1"
              />
              <p className="text-xs text-slate-400 mt-1">
                Hint: Use 'client1', 'vendor1', or 'coordinator1' with password 'password123'
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                className={inputClass}
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Enter password"
              />
              <p className="text-xs text-slate-400 mt-1">Hint: All mock accounts use 'password123'</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="text-center text-sm text-slate-500 mt-4">
              New client?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); }}
                className="text-navy hover:text-navy/80 font-medium"
              >
                Create an account
              </button>
            </p>
            {portalLabel === 'Vendor' && (
              <p className="text-center text-xs text-slate-400 mt-4">
                Vendor accounts are created by AICC administration.
              </p>
            )}
            {portalLabel === 'Coordinator' && (
              <p className="text-center text-xs text-slate-400 mt-4">
                Coordinator accounts are created by AICC administration.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            {error && (
              <div className="bg-rose/20 text-rose-700 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                name="fullName"
                className={inputClass}
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                className={inputClass}
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                className={inputClass}
                value={form.password}
                onChange={handleChange}
                required
                minLength="6"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
            <p className="text-center text-sm text-slate-500 mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className="text-navy hover:text-navy/80 font-medium"
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}