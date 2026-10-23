import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../store/AppContext';

export default function Events() {
  const { state, fetchInquiries } = useApp();
  const { inquiries, loading } = state;
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      await fetchInquiries();
    };
    loadData();
  }, []);

  useEffect(() => {
    const eventsData = inquiries.filter((i) => i.event || i.status === 'EVENT_CREATED' || i.status === 'CONFIRMED');
    setEvents(eventsData);
  }, [inquiries]);

  if (loading) {
    return (
      <Layout title="Events">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Events">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((inq) => (
                <tr key={inq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{inq.event?.name || inq.eventType}</td>
                  <td className="px-4 py-3 text-gray-600">{inq.clientName}</td>
                  <td className="px-4 py-3 text-gray-600">{inq.event?.venue || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inq.event?.status || inq.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/coordinator/inquiries/${inq.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {events.length === 0 && (
          <div className="p-6 text-center text-gray-500">No events created yet.</div>
        )}
      </div>
    </Layout>
  );
}