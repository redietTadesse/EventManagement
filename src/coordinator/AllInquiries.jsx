// src/coordinator/AllInquiries.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/axios';

export default function AllInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/inquiries')
      .then((res) => setInquiries(res.data))
      .finally(() => setLoading(false));
  }, []);

  const statuses = ['All', ...new Set(inquiries.map((i) => i.status))];
  const filtered = filter === 'All' ? inquiries : inquiries.filter((i) => i.status === filter);

  if (loading) {
    return (
      <Layout title="All Inquiries">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="All Inquiries">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendees</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inq) => (
                  <tr key={inq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{inq.clientName}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{inq.eventType}</td>
                    <td className="px-4 py-3 text-gray-600">{inq.eventDate}</td>
                    <td className="px-4 py-3 text-gray-600">{inq.expectedAttendees}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inq.status} />
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
          <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
            Total: {filtered.length} inquiries
          </div>
        </div>
      </div>
    </Layout>
  );
}