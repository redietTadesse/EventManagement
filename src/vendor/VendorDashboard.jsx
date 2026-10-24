import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Skeleton from '../components/Skeleton';
import { useApp } from '../context/AppContext';

export default function VendorDashboard() {
  const { state, fetchMyVendorProfile, fetchMyAssignments } = useApp();
  const { currentUser } = state;

  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, list] = await Promise.all([
          fetchMyVendorProfile(),
          fetchMyAssignments(),
        ]);
        if (cancelled) return;
        setProfile(me);
        setAssignments(list || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load your dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchMyVendorProfile, fetchMyAssignments]);

  if (loading) {
    return (
      <Layout title="Vendor Dashboard">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Vendor Dashboard">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      </Layout>
    );
  }

  const pending = assignments.filter(a => a.status === 'PENDING');
  const accepted = assignments.filter(a => a.status === 'ACCEPTED');
  const declined = assignments.filter(a => a.status === 'DECLINED');

  return (
    <Layout title="Vendor Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, {profile?.companyName || currentUser?.fullName || 'Vendor'}
          </h1>
          <p className="text-gray-600 mt-1">
            {profile?.serviceCategory
              ? `${profile.serviceCategory.toUpperCase()} services`
              : 'Your assignments and events'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Awaiting your response</p>
            <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
            <Link to="/vendor/assignments?status=PENDING" className="text-xs text-indigo-600 hover:underline">
              Review →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{accepted.length}</p>
            <Link to="/vendor/assignments?status=ACCEPTED" className="text-xs text-indigo-600 hover:underline">
              View →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Declined</p>
            <p className="text-2xl font-bold text-gray-500">{declined.length}</p>
            <Link to="/vendor/assignments?status=DECLINED" className="text-xs text-indigo-600 hover:underline">
              View →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-gray-800">Needs your response</h3>
            <Link to="/vendor/assignments?status=PENDING" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          {pending.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              Nothing waiting on you right now.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pending.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/vendor/assignments/${a.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{a.eventName}</p>
                      <p className="text-sm text-gray-500">
                        {a.serviceCategory?.toUpperCase()} · {a.eventDate}
                        {a.eventVenue ? ` · ${a.eventVenue}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-gray-800">Upcoming commitments</h3>
            <Link to="/vendor/assignments?status=ACCEPTED" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          {accepted.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No accepted assignments yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {accepted.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/vendor/assignments/${a.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{a.eventName}</p>
                      <p className="text-sm text-gray-500">
                        {a.serviceCategory?.toUpperCase()} · {a.eventDate}
                        {a.eventVenue ? ` · ${a.eventVenue}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center">
          <Link
            to="/vendor/open"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm"
          >
            Browse open assignments
          </Link>
        </div>
      </div>
    </Layout>
  );
}