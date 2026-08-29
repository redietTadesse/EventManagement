import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { UserIcon, BuildingOfficeIcon, ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const portals = [
  {
    role: 'CLIENT',
    userId: 1,
    title: 'Client Portal',
    desc: 'Submit inquiries, review proposals, accept events.',
    icon: UserIcon,
    color: 'navy',
  },
  {
    role: 'VENDOR',
    userId: 2,
    title: 'Vendor Portal',
    desc: 'View assignments, accept or decline.',
    icon: BuildingOfficeIcon,
    color: 'amber',
  },
  {
    role: 'COORDINATOR',
    userId: 4,
    title: 'Coordinator Portal',
    desc: 'Manage events, vendors, and assignments.',
    icon: ShieldCheckIcon,
    color: 'rose',
  },
];

const Login = () => {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const handleLogin = (userId, role) => {
    const user = { id: userId, role, fullName: portals.find(p => p.userId === userId)?.title || 'User' };
    dispatch({ type: 'LOGIN', payload: user });
    const path = {
      CLIENT: '/client/dashboard',
      VENDOR: '/vendor/dashboard',
      COORDINATOR: '/coordinator/dashboard',
    }[role];
    navigate(path);
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

      {/* Login cards */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Demo mode — pick a role to explore its portal.</p>
          <div className="space-y-4">
            {portals.map((p) => (
              <div
                key={p.role}
                className="bg-white rounded-xl shadow-card border border-slate-200/60 p-4 flex items-center gap-4 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                onClick={() => handleLogin(p.userId, p.role)}
              >
                <div className={`p-3 rounded-xl bg-${p.color}/10 text-${p.color}`}>
                  <p.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800">{p.title}</h4>
                  <p className="text-sm text-slate-500">{p.desc}</p>
                </div>
                <button className="btn-outline text-sm">Enter</button>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            Demo users: client1 · vendor1 · vendor2 · coordinator1
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;