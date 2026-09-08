import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CoordinatorDashboard() {
  const { state, fetchInquiries } = useApp();
  const { inquiries, loading } = state;
  const [stats, setStats] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!dataLoaded && !loading) {
      fetchInquiries();
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (inquiries.length > 0) {
      const byStatus = inquiries.reduce((acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      }, {});
      setStats({
        total: inquiries.length,
        pending: byStatus.INQUIRY_SUBMITTED || 0,
        proposals: byStatus.PROPOSAL_SENT || 0,
        events: byStatus.EVENT_CREATED || 0,
        confirmed: byStatus.CONFIRMED || 0,
        completed: byStatus.COMPLETED || 0,
      });
    }
  }, [inquiries]);

  const chartData = [
    { name: 'Inquiries', value: stats.pending || 0 },
    { name: 'Proposals', value: stats.proposals || 0 },
    { name: 'Events', value: stats.events || 0 },
    { name: 'Confirmed', value: stats.confirmed || 0 },
    { name: 'Completed', value: stats.completed || 0 },
  ];

  const recentInquiries = inquiries.slice(0, 5);

  // Show loading only on first load
  if (loading && inquiries.length === 0) {
    return (
      <Layout title="Dashboard">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Coordinator Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Proposals</p>
            <p className="text-2xl font-bold text-blue-600">{stats.proposals || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Events</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.events || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Inquiry Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-gray-800">Recent Inquiries</h3>
            <Link to="/coordinator/inquiries" className="text-sm text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>
          {recentInquiries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No inquiries yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentInquiries.map((inq) => (
                <div key={inq.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{inq.clientName}</p>
                    <p className="text-sm text-gray-500">{inq.eventType} · {inq.eventDate}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={inq.status} />
                    <Link to={`/coordinator/inquiries/${inq.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}