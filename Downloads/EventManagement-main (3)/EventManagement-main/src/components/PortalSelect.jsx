import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

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
    accent: 'bg-indigo-600',
  },
  {
    id: 'vendor',
    icon: '🧰',
    title: 'Vendor Portal',
    description: 'View open events and respond to your service assignments.',
    accent: 'bg-emerald-600',
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="pt-14 pb-8 text-center px-4">
        <h1 className="text-3xl font-bold text-gray-800">AICC Event Management</h1>
        <p className="text-gray-500 mt-2">Select your portal to continue</p>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl w-full">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              to={`/login/${portal.id}`}
              className="group bg-white rounded-2xl shadow p-8 border border-gray-100 hover:border-indigo-300 hover:shadow-lg transition"
            >
              <div
                className={`w-12 h-12 rounded-xl ${portal.accent} text-white flex items-center justify-center text-xl`}
              >
                {portal.icon}
              </div>
              <h2 className="mt-5 text-xl font-semibold text-gray-800">{portal.title}</h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{portal.description}</p>
              <span className="mt-6 inline-flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
                Enter portal
                <span aria-hidden="true" className="ml-1 transition group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-gray-400">
        Addis International Convention Center
      </footer>
    </div>
  );
}