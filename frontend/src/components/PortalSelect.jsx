import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';  // ← UPDATED

const ROLE_DASHBOARDS = {
  CLIENT: '/client/dashboard',
  VENDOR: '/vendor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
};

const portals = [
  {
    id: 'client',
    icon: '📅',
    title: 'Client Portal',
    description: 'Submit event inquiries, follow your proposals, and track your events.',
    accent: 'bg-navy',
  },
  {
    id: 'vendor',
    icon: '🧰',
    title: 'Vendor Portal',
    description: 'View open events and respond to your service assignments.',
    accent: 'bg-green',
  },
  {
    id: 'coordinator',
    icon: '🗂️',
    title: 'Coordinator Portal',
    description: 'Manage inquiries, events, venues, and vendor assignments.',
    accent: 'bg-slate-800',
  },
];

export default function PortalSelect() {
  const { state } = useApp();
  const currentUser = state?.currentUser;

  if (currentUser) {
    const path = ROLE_DASHBOARDS[currentUser.role] || '/';
    return <Navigate to={path} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="pt-14 pb-8 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-navy">AICC</h1>
          <p className="text-xl text-slate-500 mt-2">Event Management System</p>
          <p className="text-sm text-slate-400 mt-4">Addis International Convention Center</p>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl w-full">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              to={`/login/${portal.id}`}
              className="group bg-white rounded-2xl shadow-card p-8 border border-slate-200 hover:border-navy/30 hover:shadow-dropdown transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${portal.accent} text-white flex items-center justify-center text-2xl`}>
                {portal.icon}
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-800">{portal.title}</h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{portal.description}</p>
              <span className="mt-6 inline-flex items-center text-sm font-medium text-navy group-hover:translate-x-1 transition-all">
                Enter portal →
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Addis International Convention Center
      </footer>
    </div>
  );
}