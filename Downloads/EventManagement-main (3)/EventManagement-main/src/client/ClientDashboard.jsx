import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

export default function ClientDashboard() {
  const { state, fetchInquiries } = useApp();
  const { currentUser, inquiries, loading } = state;

  useEffect(() => {
    fetchInquiries();
  }, []);

  const myInquiries = inquiries.filter(i => i.clientId === currentUser?.id);

  return (
    <Layout title="Client Dashboard">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome, {currentUser?.name || currentUser?.fullName || 'Client'}
        </h1>
        <p className="text-gray-600 mb-6">Here are your inquiries</p>

        {loading ? (
          <p>Loading...</p>
        ) : myInquiries.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
            No inquiries yet.
            <Link to="/client/new-inquiry" className="text-indigo-600 hover:underline ml-2">
              Create one now
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myInquiries.map((inq) => (
              <div key={inq.id} className="bg-white rounded-xl shadow p-4 border">
                <div className="flex justify-between items-start">
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
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}