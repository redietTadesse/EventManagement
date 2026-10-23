import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext'; // <-- Import useAuth
import { useApp } from '../store/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CoordinatorDashboard() {
  const { user } = useAuth(); // <-- Get the real logged-in user from here
  const { state } = useApp();
  const { inquiries = [] } = state; // <-- Just get inquiries
  
  const [stats, setStats] = useState({
    total: 0, pending: 0, proposals: 0, events: 0, confirmed: 0
  });

  // Calculate stats whenever inquiries change
  useEffect(() => {
    if (inquiries && inquiries.length > 0) {
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
      });
    }
  }, [inquiries]);

  const chartData = [
    { name: 'Inquiries', value: stats.pending },
    { name: 'Proposals', value: stats.proposals },
    { name: 'Events', value: stats.events },
    { name: 'Confirmed', value: stats.confirmed },
  ];

  const recentInquiries = inquiries.slice(0, 5);

  return (
    <Layout title="Coordinator Dashboard">
      <div className="space-y-6">
        <div>
          {/* Fallback to 'Coordinator' if user is somehow null */}
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, {user?.fullName || user?.username || 'Coordinator'}
          </h1>
          <p className="text-gray-600">Manage event inquiries and operations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
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
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link to="/coordinator/inquiries" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            View All Inquiries
          </Link>
          <Link to="/coordinator/events" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            Manage Events
          </Link>
          <Link to="/admin/vendors" className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            Vendor Management
          </Link>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Inquiry Status Distribution</h3>
          {/* Added a fixed height div to ensure Recharts renders correctly */}
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Inquiries */}
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
                    <p className="text-sm text-gray-500 capitalize">{inq.eventType} · {inq.eventDate}</p>
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