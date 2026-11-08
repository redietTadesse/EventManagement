
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/admin/dashboard/stats');
      setStats(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load administration summary.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout title="Administration">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              System Administration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage vendor accounts, venue details, and availability.
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border bg-white px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh summary'}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Total users', 'totalUsers'],
            ['Active users', 'activeUsers'],
            ['Active vendors', 'activeVendors'],
            ['Events', 'totalEvents']
          ].map(([label, key]) => (
            <section
              key={key}
              className="rounded-xl border bg-white p-5"
            >
              <h2 className="text-sm text-slate-500">{label}</h2>
              <p className="mt-2 text-3xl font-bold">
                {stats?.[key] ?? '—'}
              </p>
            </section>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin/vendors"
            className="rounded-xl border bg-white p-6 hover:border-indigo-400"
          >
            <h2 className="font-semibold text-indigo-700">
              Vendor management →
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Review applications, edit profiles, and activate vendor accounts.
            </p>
          </Link>

          <Link
            to="/admin/venues"
            className="rounded-xl border bg-white p-6 hover:border-indigo-400"
          >
            <h2 className="font-semibold text-indigo-700">
              Venue management →
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Maintain venue capacity, resources, buffers, and blocked dates.
            </p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
