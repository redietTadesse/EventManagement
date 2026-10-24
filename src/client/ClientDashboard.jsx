import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

export default function ClientDashboard() {
  const { state, fetchMyInquiries } = useApp();
  const { currentUser, inquiries, loading } = state;
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (currentUser?.id != null) fetchMyInquiries(currentUser.id).catch(() => {});
  }, [fetchMyInquiries, currentUser?.id]);

  useEffect(() => {
    // Filter inquiries that have been converted to events
    const myEvents = inquiries.filter(i => 
      i.clientId === currentUser?.id && 
      (i.event || i.status === 'EVENT_CREATED' || i.status === 'CONFIRMED' || i.status === 'COMPLETED')
    );
    setEvents(myEvents);
  }, [inquiries, currentUser?.id]);

  const myInquiries = inquiries.filter(i => i.clientId === currentUser?.id);
  
  // Calculate statistics
  const stats = {
    totalInquiries: myInquiries.length,
    pendingInquiries: myInquiries.filter(i => i.status === 'INQUIRY_SUBMITTED').length,
    proposals: myInquiries.filter(i => i.status === 'PROPOSAL_SENT').length,
    events: events.length,
    confirmedEvents: events.filter(e => e.status === 'CONFIRMED').length,
    completedEvents: events.filter(e => e.status === 'COMPLETED').length,
  };

  return (
    <Layout title="Client Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, {currentUser?.name || currentUser?.fullName || 'Client'}
          </h1>
          <p className="text-gray-600 mt-1">Manage your inquiries and events</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Total Inquiries</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalInquiries}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingInquiries}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Proposals</p>
            <p className="text-2xl font-bold text-blue-600">{stats.proposals}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Events</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.events}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmedEvents}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-purple-600">{stats.completedEvents}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Link
            to="/client/new-inquiry"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + New Inquiry
          </Link>
          {events.length > 0 && (
            <Link
              to="/client/events"
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              View Events
            </Link>
          )}
        </div>

        {/* Recent Inquiries */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-gray-800">Recent Inquiries</h3>
            <Link to="/client/inquiries" className="text-sm text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : myInquiries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No inquiries yet.
              <Link to="/client/new-inquiry" className="text-indigo-600 hover:underline ml-2">
                Create one now
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myInquiries.slice(0, 5).map((inq) => (
                <div key={inq.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-800">{inq.eventType}</h3>
                        <StatusBadge status={inq.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {inq.eventDate} · {inq.expectedAttendees} attendees
                      </p>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {inq.requirements}
                      </p>
                    </div>
                    <Link 
                      to={`/client/inquiries/${inq.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium ml-4"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events */}
        {events.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-medium text-gray-800">Your Events</h3>
              <Link to="/client/events" className="text-sm text-indigo-600 hover:text-indigo-700">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-800">
                          {event.event?.name || event.eventType}
                        </h3>
                        <StatusBadge status={event.event?.status || event.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {event.eventDate} · {event.event?.venue || 'Venue TBD'}
                      </p>
                    </div>
                    <Link 
                      to={`/client/events/${event.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium ml-4"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}