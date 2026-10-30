import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Skeleton from '../components/Skeleton';
import { useApp } from '../context/AppContext';

const formatDate = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getLocalDate = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

export default function VendorDashboard() {
  const { state, fetchMyVendorProfile, fetchMyAssignments } = useApp();
  const { currentUser } = state;

  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [assignmentsError, setAssignmentsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled([
          fetchMyVendorProfile(),
          fetchMyAssignments(),
        ]);
        if (cancelled) return;
        const [profileResult, assignmentsResult] = results;
        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
          setProfileError('');
        } else {
          setProfileError(profileResult.reason.response?.data?.message || 'Could not load your vendor profile.');
        }
        if (assignmentsResult.status === 'fulfilled') {
          setAssignments(Array.isArray(assignmentsResult.value) ? assignmentsResult.value : []);
          setAssignmentsError('');
        } else {
          setAssignmentsError(assignmentsResult.reason.response?.data?.message || 'Could not load your assignments.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchMyVendorProfile, fetchMyAssignments, reloadKey]);

  if (loading) {
    return (
      <Layout title="Vendor Dashboard">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
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

  const pending = assignments.filter(a => a.status === 'PENDING');
  const accepted = assignments.filter(a => a.status === 'ACCEPTED');
  const declined = assignments.filter(a => a.status === 'DECLINED');
  const completed = assignments.filter(a => a.status === 'COMPLETED');
  const closed = assignments.filter(a => a.status === 'EXPIRED' || a.status === 'CANCELLED');
  const insuranceExpiryDate = profile?.insuranceExpiryDate?.slice(0, 10);
  const insuranceExpired = insuranceExpiryDate && insuranceExpiryDate < getLocalDate();

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

        {profileError && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {profileError} Some profile details may be unavailable.
            <button
              type="button"
              onClick={() => { setLoading(true); setReloadKey((key) => key + 1); }}
              className="ml-3 font-medium underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {assignmentsError && (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{assignmentsError}</span>
            <button
              type="button"
              onClick={() => { setLoading(true); setReloadKey((key) => key + 1); }}
              className="self-start rounded-md bg-white px-3 py-2 font-medium text-red-700 shadow-sm hover:bg-red-100 sm:self-auto"
            >
              Try again
            </button>
          </div>
        )}

        {insuranceExpiryDate && (
          <div className={`rounded-lg border p-4 text-sm ${insuranceExpired
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            Insurance {insuranceExpired ? 'expired' : 'valid through'} {formatDate(insuranceExpiryDate)}
          </div>
        )}

        {!assignmentsError && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-emerald-700">{completed.length}</p>
            <Link to="/vendor/assignments?status=COMPLETED" className="text-xs text-indigo-600 hover:underline">
              View →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Expired or cancelled</p>
            <p className="text-2xl font-bold text-gray-500">{closed.length}</p>
            <Link to="/vendor/assignments" className="text-xs text-indigo-600 hover:underline">
              View all →
            </Link>
          </div>
        </div>}

        {!assignmentsError && <div className="bg-white rounded-xl shadow overflow-hidden">
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
                    className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">{a.eventName}</p>
                      <p className="text-sm text-gray-500">
                        {a.serviceCategory?.replace(/_/g, ' ').toUpperCase()} · {formatDate(a.eventDate)}
                        {a.eventVenue ? ` · ${a.eventVenue}` : ''}
                      </p>
                      {a.serviceOrder && <p className="mt-1 break-words text-sm text-gray-700">Instructions: {a.serviceOrder}</p>}
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>}

        {!assignmentsError && <div className="bg-white rounded-xl shadow overflow-hidden">
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
                    className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">{a.eventName}</p>
                      <p className="text-sm text-gray-500">
                        {a.serviceCategory?.replace(/_/g, ' ').toUpperCase()} · {formatDate(a.eventDate)}
                        {a.eventVenue ? ` · ${a.eventVenue}` : ''}
                      </p>
                      {a.serviceOrder && <p className="mt-1 break-words text-sm text-gray-700">Instructions: {a.serviceOrder}</p>}
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>}

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
