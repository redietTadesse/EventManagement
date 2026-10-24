import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ActionBanner from '../components/ActionBanner';
import AuditTimeline from '../components/AuditTimeline';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExclamationTriangleIcon, ClockIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function CoordinatorDashboard() {
  const { state, fetchInquiries, fetchCoordinatorStats, fetchCoordinatorExceptions, fetchRecentHistory } = useApp();
  const { inquiries, loading } = state;
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [exceptions, setExceptions] = useState(null);
  const [exceptionsLoading, setExceptionsLoading] = useState(true);
  const [recentHistory, setRecentHistory] = useState([]);

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

  useEffect(() => {
    const loadExceptions = async () => {
      try {
        const exceptionsData = await fetchCoordinatorExceptions();
        setExceptions(exceptionsData);
      } catch (err) {
        console.error('Failed to load exceptions:', err);
      } finally {
        setExceptionsLoading(false);
      }
    };

    loadExceptions();
  }, [fetchCoordinatorExceptions]);

  useEffect(() => {
    const loadRecentHistory = async () => {
      try {
        const history = await fetchRecentHistory();
        setRecentHistory(history || []);
      } catch (err) {
        console.error('Failed to load recent history:', err);
      }
    };

    loadRecentHistory();
  }, [fetchRecentHistory]);

  const chartData = stats?.eventsByStatus
    ? Object.entries(stats.eventsByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const recentInquiries = inquiries.slice(0, 5);

  const totalExceptions = (exceptions?.needsCoordinatorEvents?.length || 0) +
                         (exceptions?.openAssignments?.length || 0) +
                         (exceptions?.staleProposals?.length || 0);

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
        {/* Exception Board - Command Center */}
        {!exceptionsLoading && totalExceptions > 0 && (
          <div className="space-y-3">
            {/* Events needing coordinator */}
            {exceptions?.needsCoordinatorEvents?.length > 0 && (
              <ActionBanner
                type="critical"
                count={exceptions.needsCoordinatorEvents.length}
                description="Events stuck in NEEDS_COORDINATOR status require manual intervention"
                items={exceptions.needsCoordinatorEvents.map(e => ({
                  id: e.id,
                  title: e.name,
                  description: `${e.eventDate}`,
                  link: `/coordinator/events/${e.id}`,
                }))}
                onViewAll={() => window.location.href = '/coordinator/events'}
                viewAllText="View all events"
              />
            )}

            {/* Open assignments */}
            {exceptions?.openAssignments?.length > 0 && (
              <ActionBanner
                type="critical"
                count={exceptions.openAssignments.length}
                description="Open assignments are unclaimed and need vendor assignment"
                items={exceptions.openAssignments.map(a => ({
                  id: a.id,
                  title: a.serviceCategory,
                  description: a.eventName,
                  link: `/coordinator/events/${a.eventId}`,
                }))}
                onViewAll={() => window.location.href = '/coordinator/events'}
                viewAllText="View all assignments"
              />
            )}

            {/* Stale proposals */}
            {exceptions?.staleProposals?.length > 0 && (
              <ActionBanner
                type="warning"
                count={exceptions.staleProposals.length}
                description="Proposals pending for 3+ days may need follow-up"
                items={exceptions.staleProposals.map(i => ({
                  id: i.id,
                  title: i.clientName,
                  description: i.eventType,
                  link: `/coordinator/inquiries/${i.id}`,
                }))}
                onViewAll={() => window.location.href = '/coordinator/inquiries'}
                viewAllText="View all inquiries"
              />
            )}
          </div>
        )}

        {/* Pipeline Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <Link to="/coordinator/inquiries" className="bg-white rounded-xl shadow p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-xs md:text-sm text-gray-500">Proposals Sent</p>
            <p className="text-2xl md:text-3xl font-bold text-amber-600 tabular-nums">
              {inquiries.filter(i => i.status === 'PROPOSAL_SENT').length}
            </p>
          </Link>
          <Link to="/coordinator/events" className="bg-white rounded-xl shadow p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-xs md:text-sm text-gray-500">In Progress</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-600 tabular-nums">
              {(stats?.eventsByStatus?.AWAITING_VENDORS || 0) + (stats?.eventsByStatus?.NEEDS_COORDINATOR || 0)}
            </p>
          </Link>
          <Link to="/coordinator/events" className="bg-white rounded-xl shadow p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-xs md:text-sm text-gray-500">Awaiting Vendors</p>
            <p className="text-2xl md:text-3xl font-bold text-amber-600 tabular-nums">
              {stats?.eventsByStatus?.AWAITING_VENDORS || 0}
            </p>
          </Link>
          <Link to="/coordinator/events" className="bg-white rounded-xl shadow p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-xs md:text-sm text-gray-500">Confirmed</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600 tabular-nums">
              {stats?.eventsByStatus?.CONFIRMED || 0}
            </p>
          </Link>
          <Link to="/coordinator/events" className="bg-white rounded-xl shadow p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-xs md:text-sm text-gray-500">Completed</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-600 tabular-nums">
              {stats?.eventsByStatus?.COMPLETED || 0}
            </p>
          </Link>
        </div>

        {/* Vendor Load Panel - Simple heatmap */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Vendor Load Overview</h3>
          <div className="text-sm text-gray-500">
            Vendor load heatmap coming soon - will show vendor assignment distribution by category
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-medium text-gray-800">Recent Activity</h3>
            <span className="text-xs text-gray-500">Last 10 transitions</span>
          </div>
          <div className="p-6">
            {recentHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentHistory.slice(0, 5).map((entry, idx) => {
                    const actor = entry.actor || 'System';
                    const actorColors = {
                      System: 'text-slate-600',
                      Client: 'text-emerald-600',
                      Vendor: 'text-amber-600',
                      Coordinator: 'text-rose-600',
                      Admin: 'text-purple-600',
                    };
                    const actorBgColors = {
                      System: 'bg-slate-100',
                      Client: 'bg-emerald-100',
                      Vendor: 'bg-amber-100',
                      Coordinator: 'bg-rose-100',
                      Admin: 'bg-purple-100',
                    };
                    const initial = actor[0];

                    return (
                      <li key={entry.id || idx}>
                        <div className="relative pb-8">
                          {idx < Math.min(4, recentHistory.length - 1) && (
                            <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${actorBgColors[actor] || 'bg-slate-100'} ${actorColors[actor] || 'text-slate-600'}`}>
                                <span className="text-xs font-bold">{initial}</span>
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-500">
                                <span className={`font-medium ${actorColors[actor] || 'text-slate-700'}`}>
                                  {actor}
                                </span>
                                {' '}
                                <span className="text-gray-400">·</span>
                                {' '}
                                {formatTimestamp(entry.occurredAt)}
                              </div>
                              <div className="mt-0.5 text-sm text-gray-700">
                                {entry.description || `${entry.fromStatus || ''} → ${entry.toStatus || ''}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
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

        {/* Chart - moved to bottom as less important */}
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
      </div>
    </Layout>
  );
}

function formatTimestamp(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}