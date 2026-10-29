import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_DASHBOARDS } from '../utils/roles';
import { BuildingOfficeIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const portals = [
  {
    id: 'client',
    icon: BuildingOfficeIcon,
    title: 'Client Portal',
    description: 'Submit event inquiries, follow your proposals, and track your events.',
    accent: 'bg-indigo-500',
    accentLight: 'bg-indigo-50',
    accentText: 'text-indigo-600',
  },
  {
    id: 'vendor',
    icon: UserGroupIcon,
    title: 'Vendor Portal',
    description: 'View open events and respond to your service assignments.',
    accent: 'bg-emerald-500',
    accentLight: 'bg-emerald-50',
    accentText: 'text-emerald-600',
  },
  {
    id: 'coordinator',
    icon: ClipboardDocumentListIcon,
    title: 'Coordinator Portal',
    description: 'Manage inquiries, events, venues, and vendor assignments.',
    accent: 'bg-slate-600',
    accentLight: 'bg-slate-50',
    accentText: 'text-slate-600',
  },
  {
    id: 'admin',
    icon: ShieldCheckIcon,
    title: 'Admin Portal',
    description: 'Manage vendor accounts, activate applications, and oversee the directory.',
    accent: 'bg-amber-500',
    accentLight: 'bg-amber-50',
    accentText: 'text-amber-600',
  },
];

export default function PortalSelect() {
  const { state } = useApp();
  const { currentUser, loading } = state;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-3 border-indigo-600 border-t-transparent mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentUser) {
    const path = ROLE_DASHBOARDS[currentUser.role];
    return <Navigate to={path || '/login'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="pt-16 pb-12 text-center px-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3">
          AICC Event Management
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Select your portal to continue
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl w-full">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              to={`/login/${portal.id}`}
              className="group relative bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${portal.accent} text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <portal.icon className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-semibold text-slate-900 mb-3">{portal.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">{portal.description}</p>

              {/* Enter portal button */}
              <div className={`flex items-center text-sm font-semibold ${portal.accentText} group-hover:gap-2 transition-all duration-300`}>
                Enter portal
                <span aria-hidden="true" className="ml-1 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="pb-8 text-center">
        <Link
          to="/vendor-application"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md transition-all duration-300 mb-6"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Want to become a vendor at AICC? Apply here
        </Link>
        <div className="mt-4">
          <p className="text-sm text-slate-500">
            Addis International Convention Center
          </p>
          <p className="text-xs text-slate-400 mt-1">
            © 2024 All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}