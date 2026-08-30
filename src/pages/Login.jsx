import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password,
      });
      const { accessToken, role } = response.data;

      const user = { username, fullName: username, role, token: accessToken };
      dispatch({ type: 'LOGIN', payload: user });

      const path = {
        CLIENT: '/client/dashboard',
        VENDOR: '/vendor/dashboard',
        COORDINATOR: '/coordinator/dashboard',
      }[role] || '/login';
      navigate(path);
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
      {/* Branding */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy to-indigo-700 text-white p-12 flex flex-col justify-center hidden lg:flex">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMzIgMTZMMTYgMzJMMzIgNDhMNDggMzJMMzIgMTZaIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDYiLz48L3N2Zz4=')] opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <svg className="w-10 h-10 text-ice" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-3xl font-bold">AICC</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Event Management,<br />
            <span className="text-ice">done differently.</span>
          </h1>
          <p className="mt-4 text-ice/80 max-w-md">
            A connected platform where clients and vendors interact directly — no manual middleman, fully automated transitions and notifications.
          </p>
          <ul className="mt-8 space-y-2">
            {['Submit inquiries & receive proposals instantly', 'Automated vendor assignment on acceptance', 'Transparent status tracking at every step'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <CheckCircleIcon className="w-5 h-5 text-green" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Sign in to your account.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy/40"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy/40"
                placeholder="Enter your password"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-navy text-white py-2.5 rounded-lg font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;