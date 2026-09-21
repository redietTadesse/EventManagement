import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CoordinatorDashboard() {
  const { state, fetchInquiries, fetchCoordinatorStats } = useApp();
  const { inquiries, loading } = state;
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!dataLoaded && !loading) {
      fetchInquiries();
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const coordinatorStats = await fetchCoordinatorStats();
        setStats(coordinatorStats);
      } catch (err) {
        console.error('Failed to load coordinator stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    
    loadStats();
  }, [fetchCoordinatorStats]);

  const chartData = stats?.eventsByStatus 
    ? Object.entries(stats.eventsByStatus).map(([name, value]) => ({ name, value }))
    : [];

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Active Vendors</p>
            <p className="text-2xl font-bold text-indigo-600">{stats?.activeVendors || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Total Events</p>
            <p className="text-2xl font-bold text-gray-800">{stats?.totalEvents || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Confirmed Events</p>
            <p className="text-2xl font-bold text-green-600">{stats?.eventsByStatus?.CONFIRMED || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Completed Events</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.eventsByStatus?.COMPLETED || 0}</p>
          </div>
        </div>

        {!statsLoading && chartData.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Event Status Distribution</h3>
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
        )}

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