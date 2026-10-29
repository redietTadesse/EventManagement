import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const FILTERS = ['ALL', 'EVENT_CREATED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function ClientEventHistory() {
  const { state, fetchMyInquiries } = useApp();
  const { currentUser, inquiries, loading } = state;
  const [params, setParams] = useSearchParams();

  const status = params.get('status') || 'ALL';

  useEffect(() => {
    if (currentUser?.id != null) fetchMyInquiries(currentUser.id).catch(() => {});
  }, [fetchMyInquiries, currentUser?.id]);

  // Filter inquiries that have been converted to events
  const myEvents = inquiries.filter(i => 
    i.clientId === currentUser?.id && 
    (i.event || i.status === 'EVENT_CREATED' || i.status === 'CONFIRMED' || i.status === 'COMPLETED' || i.status === 'CANCELLED')
  );

  const filtered = status === 'ALL'
    ? myEvents
    : myEvents.filter(e => (e.event?.status || e.status) === status);

  if (loading) {
    return (
      <Layout title="My Events">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout title="My Events">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Events</h1>
            <p className="text-gray-600 mt-1">View and manage your event history</p>
          </div>
          <Link
            to="/client/new-inquiry"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + New Inquiry
          </Link>
        </div>

        {/* Status Filters */}
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
              {f === 'ALL' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Events List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            {myEvents.length === 0 
              ? 'No events yet. Create an inquiry to get started.'
              : 'No events in this view.'}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {event.event?.name || event.eventType}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{event.eventDate}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {event.event?.venue || 'TBD'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={event.event?.status || event.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/client/events/${event.id}`}
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
          </div>
        )}
      </div>
    </Layout>
  );
}