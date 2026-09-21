import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED'];

export default function MyAssignments() {
  const { fetchMyAssignments } = useApp();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();

  const status = params.get('status') || 'ALL';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchMyAssignments();
        if (!cancelled) setAssignments(list || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load assignments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchMyAssignments]);

  const filtered = status === 'ALL'
    ? assignments
    : assignments.filter(a => a.status === status);

  if (loading) {
    return (
      <Layout title="My Assignments">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout title="My Assignments">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setParams(f === 'ALL' ? {} : { status: f })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                status === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            No assignments in this view.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.eventName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.eventDate}</td>
                    <td className="px-4 py-3 text-gray-600">{a.serviceCategory?.toUpperCase()}</td>
                    <td className="px-4 py-3 text-gray-600">{a.eventVenue || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/vendor/assignments/${a.id}`}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}