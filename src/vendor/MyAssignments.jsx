import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { statusLabel } from '../utils/status';
import { proposalLabel } from '../utils/proposalReview';
import Skeleton from '../components/Skeleton';
import { TableSkeleton } from '../components/Skeleton';
import { useApp } from '../context/AppContext';

const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'COMPLETED', 'CANCELLED'];

export default function MyAssignments() {
  const { fetchMyAssignments } = useApp();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const requestedStatus = params.get('status') || 'ALL';
  const status = FILTERS.includes(requestedStatus) ? requestedStatus : 'ALL';
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
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
  }, [fetchMyAssignments, reloadKey]);

  const categories = [...new Set(assignments.map(a => a.serviceCategory).filter(Boolean))];

  const filtered = status === 'ALL'
    ? assignments
    : assignments.filter(a => a.status === status);

  const categoryFiltered = filtered.filter(a => (!categoryFilter || a.serviceCategory === categoryFilter) && `${a.eventName || ''} ${a.eventVenue || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading) {
    return (
      <Layout title="My Assignments">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
          <TableSkeleton rows={5} columns={6} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="My Assignments">
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Assignments">
      <div className="space-y-4">
        <PageHeader eyebrow="Your commitments with AICC" title="My assignments" subtitle="Review offers, check where you are needed and follow the work you have accepted." action={<button type="button" className="btn-outline" onClick={() => setReloadKey(key => key + 1)}>Refresh</button>} />
        <label className="record-filters"><span className="record-search"><span className="sr-only">Find an event or venue</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find an event or venue…" /></span></label>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f}
              type="button"
              aria-pressed={status === f}
              onClick={() => setParams(f === 'ALL' ? {} : { status: f })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                status === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'ALL' ? 'All offers' : statusLabel(f)}<span className="ml-2 opacity-75">{f === 'ALL' ? assignments.length : assignments.filter(a => a.status === f).length}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter by service"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200"
          >
            <option value="">All services</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{proposalLabel(cat)}</option>
            ))}
          </select>
          {categoryFilter && (
            <button
              onClick={() => setCategoryFilter('')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        {categoryFiltered.length === 0 ? (
          <section className="surface"><EmptyState title={assignments.length ? 'No assignments match this view' : 'Your offers will appear here'} description={assignments.length ? 'Try another stage, service or event name to find your work.' : 'AICC will send a service offer when your vendor profile is selected. You can also explore open requests.'} actionText={assignments.length ? 'Clear filters' : 'Explore open requests'} actionLink={assignments.length ? undefined : '/vendor/open'} actionOnClick={() => { setParams({}); setCategoryFilter(''); setSearch(''); }} /></section>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl bg-white shadow md:block">
              <table className="record-table w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoryFiltered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.eventName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.eventDate || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{proposalLabel(a.serviceCategory)}</td>
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
            <ul className="space-y-3 md:hidden">
              {categoryFiltered.map(a => (
                <li key={a.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800">{a.eventName || 'Untitled event'}</p>
                      <p className="mt-1 text-sm text-gray-600">{a.eventDate || 'Date not set'}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Service</dt>
                      <dd className="mt-0.5 text-gray-700">{a.serviceCategory?.replace(/_/g, ' ').toUpperCase() || '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Venue</dt>
                      <dd className="mt-0.5 truncate text-gray-700">{a.eventVenue || '—'}</dd>
                    </div>
                  </dl>
                  <Link
                    to={`/vendor/assignments/${a.id}`}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    View assignment
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Layout>
  );
}
