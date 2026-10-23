import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../store/AppContext';

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
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Filter by date..."
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[150px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => { setDateFilter(''); setStatusFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{event.event?.name || event.eventType}</td>
                    <td className="px-4 py-3 text-gray-600">{event.clientName}</td>
                    <td className="px-4 py-3 text-gray-600">{event.eventDate}</td>
                    <td className="px-4 py-3 text-gray-600">{event.event?.venue || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={event.event?.status || event.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/coordinator/events/${event.event?.id || event.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEvents.length === 0 && (
            <div className="p-6 text-center text-gray-500">No events found.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}