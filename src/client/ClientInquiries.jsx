import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

export default function ClientInquiries() {
  const { state, fetchMyInquiries } = useApp();
  const { currentUser, inquiries, loading } = state;

  useEffect(() => {
    if (currentUser?.id != null) fetchMyInquiries(currentUser.id).catch(() => {});
  }, [fetchMyInquiries, currentUser?.id]);

  const myInquiries = inquiries.filter(i => i.clientId === currentUser?.id);

  return (
    <Layout title="My Inquiries">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Inquiries</h1>
            <p className="text-gray-600 mt-1">View and manage your event inquiries</p>
          </div>
          <Link
            to="/client/new-inquiry"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + New Inquiry
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading…</div>
        ) : myInquiries.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            No inquiries yet.
            <Link to="/client/new-inquiry" className="text-indigo-600 hover:underline ml-2">
              Create one now
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendees</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myInquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{inq.eventType}</td>
                    <td className="px-4 py-3 text-gray-600">{inq.eventDate}</td>
                    <td className="px-4 py-3 text-gray-600">{inq.expectedAttendees}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inq.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/client/inquiries/${inq.id}`}
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