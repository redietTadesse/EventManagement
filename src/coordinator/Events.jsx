import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ResponsiveTable from '../components/ResponsiveTable';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';

export default function Events() {
  const { state, fetchInquiries } = useApp();
  const { inquiries, loading } = state;
  const [events, setEvents] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const loadData = async () => {
      await fetchInquiries();
    };
    loadData();
  }, [fetchInquiries]);

  useEffect(() => {
    const eventsData = inquiries.filter((i) => i.event || i.status === 'EVENT_CREATED' || i.status === 'CONFIRMED');
    setEvents(eventsData);
  }, [inquiries]);

  const filteredEvents = events.filter(event => {
    const eventData = event.event || event;
    if (dateFilter && eventData.eventDate && !eventData.eventDate.includes(dateFilter)) return false;
    if (statusFilter && (eventData.status || event.status) !== statusFilter) return false;
    return true;
  });

  const statusOptions = ['EVENT_CREATED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  if (loading) {
    return (
      <Layout title="Events">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Events">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Events</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all events</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Filter by date..."
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[150px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => { setDateFilter(''); setStatusFilter(''); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden p-4 md:p-0">
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No events found"
              description="Try adjusting your filters or check back later."
              size="small"
            />
          ) : (
            <ResponsiveTable
              columns={[
                { key: 'name', label: 'Event', render: (event) => (
                  <span className="text-sm text-slate-600 font-medium">{event.event?.name || event.eventType}</span>
                )},
                { key: 'client', label: 'Client', render: (event) => event.clientName },
                { key: 'date', label: 'Date', render: (event) => event.eventDate },
                { key: 'venue', label: 'Venue', render: (event) => event.event?.venue || 'N/A' },
                { key: 'status', label: 'Status', render: (event) => (
                  <StatusBadge status={event.event?.status || event.status} />
                )},
                { key: 'action', label: 'Action', render: (event) => (
                  <Link to={`/coordinator/events/${event.event?.id || event.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                    View
                  </Link>
                )},
              ]}
              data={filteredEvents}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}