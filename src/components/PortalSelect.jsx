import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_DASHBOARDS } from '../utils/roles';

const portals = [
  {
    id: 'client',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    title: 'Client Portal',
    description: 'Submit event inquiries, follow your proposals, and track your events.',
    accent: 'bg-indigo-500',
  },
  {
    id: 'vendor',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    title: 'Vendor Portal',
    description: 'View open events and respond to your service assignments.',
    accent: 'bg-emerald-500',
  },
  {
    id: 'coordinator',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: 'Coordinator Portal',
    description: 'Manage inquiries, events, venues, and vendor assignments.',
    accent: 'bg-slate-600',
  },
  {
    id: 'admin',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    title: 'Admin Portal',
    description: 'Manage vendor accounts, activate applications, and oversee the directory.',
    accent: 'bg-amber-600',
  },
];

export default function PortalSelect() {
  const { state } = useApp();
  const { currentUser, loading } = state;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading...
      </div>
    );
  }

  if (currentUser) {
    const path = ROLE_DASHBOARDS[currentUser.role];
    return <Navigate to={path || '/login'} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Subtle radial gradient behind header */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent pointer-events-none" />

      <header className="relative pt-10 pb-8 text-center px-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          AICC Event Management
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Select your portal to continue
        </p>
      </header>

      <main className="relative flex-1 flex items-start justify-center px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl w-full">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              to={`/login/${portal.id}`}
              className="group block relative rounded-2xl bg-white p-8 border border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
            >
              {/* Icon circle */}
              <div className={`w-16 h-16 rounded-2xl ${portal.accent} text-white flex items-center justify-center text-2xl transition-transform group-hover:scale-110 transition duration-200`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d={portal.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-semibold text-gray-900">{portal.title}</h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{portal.description}</p>

              <span className="absolute bottom-5 right-5 flex items-center text-sm font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">
                Enter portal
                <span aria-hidden="true" className="ml-1 transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/vendor-application"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Want to become a vendor at AICC? Apply here
          </Link>
        </div>
      </main>

      <footer className="relative pb-6 text-center text-xs text-gray-400">
        Addis International Convention Center
      </footer>
    </div>
  );
}