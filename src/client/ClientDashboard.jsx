import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/inquiries/client/${user.id}`)
      .then((res) => setInquiries(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <Layout title="Client Dashboard">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome, {user.name}
        </h1>
        <p className="text-gray-600 mb-6">Here are your inquiries</p>

        {loading ? (
          <p>Loading...</p>
        ) : inquiries.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
            No inquiries yet.
            <Link to="/client/new-inquiry" className="text-indigo-600 hover:underline ml-2">
              Create one now
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inquiries.map((inq) => (
              <div key={inq.id} className="bg-white rounded-xl shadow p-4 border">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800">{inq.eventType}</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {inq.status}
                  </span>
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