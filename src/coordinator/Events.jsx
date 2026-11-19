import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import StatusBadge from '../components/StatusBadge';
import ResponsiveTable from '../components/ResponsiveTable';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { eventPage } from '../utils/eventPages';
import EventPageControls from '../components/EventPageControls';
import { useApp } from '../context/AppContext';

const EVENT_STATUS_OPTIONS = [
  { value: 'EVENT_CREATED', label: 'Event created' },
  { value: 'AWAITING_VENDORS', label: 'Waiting for vendors' },
  { value: 'NEEDS_COORDINATOR', label: 'Needs coordinator' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CLOSED', label: 'Closed' },
];

const asDateOnly = (value) => (typeof value === 'string' ? value.slice(0, 10) : '');

const formatEventDate = (value) => {
  const dateOnly = asDateOnly(value);
  if (!dateOnly) return 'Date not set';

  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return dateOnly;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day));
};

export default function Events() {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [ownership, setOwnership] = useState('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const requestController = useRef(null);
  useEffect(() => { setPageNumber(1); }, [ownership, dateFrom, dateTo, statusFilter, search]);

  const loadEvents = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setLoadError('');

    try {
      const response = await api.get('/events', { signal: controller.signal });
      if (!Array.isArray(response.data)) {
        throw new Error('The events service returned an unexpected response.');
      }
      if (!controller.signal.aborted) setEvents(response.data);
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError(error.response?.data?.message || error.message || 'Could not load events.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    return () => requestController.current?.abort();
  }, [loadEvents]);

  const filteredEvents = events.filter(event => {
    if (!`${event.name || ''} ${event.clientName || ''} ${event.venue || ''} ${event.id}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    const eventStart = asDateOnly(event.eventDate);
    const eventEnd = asDateOnly(event.endDate) || eventStart;

    // Date filters match events whose date range overlaps the selected range.
    if ((dateFrom || dateTo) && !eventStart) return false;
    if (dateFrom && eventEnd < dateFrom) return false;
    if (dateTo && eventStart > dateTo) return false;
    if (statusFilter && event.status !== statusFilter) return false;
    if (ownership === 'mine' && String(event.coordinator?.id) !== String(state.currentUser?.id)) return false;
    if (ownership === 'unassigned' && event.coordinator) return false;
    return true;
  });

  const invalidDateRange = dateFrom && dateTo && dateFrom > dateTo;
  const page = eventPage(filteredEvents, pageNumber);

  return (
    <Layout title="Events">
      <div className="space-y-6">
        <PageHeader eyebrow="From booking to event day" title="Events" subtitle="Follow venue bookings, vendor responses and preparation for each event." action={<button type="button" onClick={loadEvents} disabled={loading} className="btn-outline"><ArrowPathIcon className="h-4 w-4" />Refresh</button>} />
        <label className="record-filters"><span className="record-search"><MagnifyingGlassIcon aria-hidden="true" /><span className="sr-only">Find an event, client or venue</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find an event, client or venue…" /></span></label>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Handling coordinator
              <select value={ownership} onChange={(event) => setOwnership(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="all">All events</option>
                <option value="mine">My events</option>
                <option value="unassigned">Unassigned events</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              From date
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-normal text-slate-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              To date
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-normal text-slate-800"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
              className="self-end px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">All stages</option>
              {EVENT_STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter(''); setOwnership('all'); setSearch(''); }}
              className="self-end px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          </div>
          {invalidDateRange && (
            <p role="alert" className="mt-3 text-sm text-rose-700">From date must be on or before To date.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden p-4 md:p-0">
          {loading ? (
            <div role="status" className="py-12 text-center text-sm text-slate-500">Loading events…</div>
          ) : loadError ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-rose-700">{loadError}</p>
              <button
                type="button"
                onClick={loadEvents}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          ) : invalidDateRange ? (
            <EmptyState icon="📅" title="Check the selected dates" description="Adjust the date range to see events." size="small" />
          ) : events.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No events yet"
              description="Events appear here after the signed contract and payment receipt have been checked."
              size="small"
            />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No events match these filters"
              description="Adjust the date range or status, or clear the filters."
              size="small"
            />
          ) : (
            <ResponsiveTable
              columns={[
                { key: 'name', label: 'Event', render: (event) => (
                  <Link to={`/coordinator/events/${event.id}`} className="inquiry-record-name">{event.name || 'Untitled event'}</Link>
                )},
                { key: 'client', label: 'Client', render: (event) => event.clientName || 'Client unavailable' },
                { key: 'coordinator', label: 'Handled by', render: (event) => event.coordinator?.name || 'Unassigned' },
                { key: 'date', label: 'Date range', render: (event) => (
                  <span>
                    {formatEventDate(event.eventDate)}
                    {event.endDate && asDateOnly(event.endDate) !== asDateOnly(event.eventDate)
                      ? ` – ${formatEventDate(event.endDate)}`
                      : ''}
                  </span>
                )},
                { key: 'venue', label: 'Venue', render: (event) => event.venue || 'Not assigned' },
                { key: 'status', label: 'Status', render: (event) => (
                  <StatusBadge status={event.status} />
                )},
                { key: 'action', label: 'Action', render: (event) => (
                  <Link to={`/coordinator/events/${event.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                    View
                  </Link>
                )},
              ]}
              data={invalidDateRange ? [] : page.rows}
            />
          )}
        </div>
        {!loading && !loadError && !invalidDateRange && <EventPageControls page={page} onChange={setPageNumber} />}
      </div>
    </Layout>
  );
}
