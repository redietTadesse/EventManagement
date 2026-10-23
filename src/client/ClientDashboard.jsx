import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../store/AppContext';

export default function ClientDashboard() {
  const { user } = useAuth(); // <--- Get the logged-in user here
  const { state } = useApp();
  const { inquiries = [] } = state;

  // Filter inquiries to only show this client's data
  const myInquiries = inquiries.filter(i => i.clientId === user?.id);

  return (
    <Layout title="Client Dashboard">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {user?.fullName || user?.username || 'Client'}
            </h1>
            <p className="text-gray-600">Here are your event inquiries</p>
          </div>
          <Link to="/client/new-inquiry" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            + New Inquiry
          </Link>
        </div>

        {myInquiries.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            <p className="text-lg">No inquiries yet</p>
            <p className="text-sm mt-1">
              <Link to="/client/new-inquiry" className="text-indigo-600 hover:underline">
                Create your first inquiry
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myInquiries.map((inq) => (
              <div key={inq.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800 capitalize">
                    {inq.eventType || 'Event'}
                  </h3>
                  <StatusBadge status={inq.status} />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {inq.eventDate ? new Date(inq.eventDate).toLocaleDateString() : 'Date TBD'}
                  {inq.expectedAttendees && ` · ${inq.expectedAttendees} attendees`}
                </p>
                {inq.requirements && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {inq.requirements}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}