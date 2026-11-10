import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, CalendarDaysIcon, ExclamationTriangleIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import api from '../api/axios';
import { buildAttentionItems, buildOperationsQueue, countLifecycleStages, createRequestTracker, makeDateRange, mergeDashboardResults, metricDisplay } from './dashboardModel';
import OperationsQueue from './OperationsQueue';
import LiveSimulationModal from './LiveSimulationModal';
import VendorEcosystemChart from './VendorEcosystemChart';
import IssueAttention from './IssueAttention';
import useApiResource from '../hooks/useApiResource';

const demoVendorEcosystem = [
  { name: 'Elite AV', activeLoad: 8, qualityScore: 4.8 },
  { name: 'Addis Security', activeLoad: 5, qualityScore: 4.6 },
  { name: 'MediaPro', activeLoad: 3, qualityScore: 4.1 },
  { name: 'Nile Catering', activeLoad: 7, qualityScore: 3.2 },
];

export default function CoordinatorDashboard() {
  const { state, fetchInquiries, fetchCoordinatorStats, fetchCoordinatorExceptions, fetchRecentHistory } = useApp();
  const workload = useApiResource('/coordinators/workload');
  const mine = workload.data.find((item) => item.coordinator.id === state.currentUser?.id);
  const [period, setPeriod] = useState(30);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [data, setData] = useState({ stats: null, exceptions: null, inquiries: [], events: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [eventFilter, setEventFilter] = useState('ALL');
  const [loaded, setLoaded] = useState({ stats: false, exceptions: false, inquiries: false, events: false, history: false });
  const [sectionErrors, setSectionErrors] = useState({});
  const requestTracker = useRef(createRequestTracker());
  const mounted = useRef(false);
  const dataRef = useRef(data);
  const loadedRef = useRef(loaded);

  const dateRange = useMemo(() => {
    return makeDateRange(new Date(), period);
  }, [period]);

  const refresh = useCallback(async () => {
    const currentRequest = requestTracker.current.begin();
    setLoading(true);
    const requests = await Promise.allSettled([
      fetchCoordinatorStats(), fetchCoordinatorExceptions(), fetchRecentHistory(), fetchInquiries(),
      api.get('/coordinator/upcoming-events', { params: dateRange }).then((response) => response.data || []),
    ]);
    if (!mounted.current || !requestTracker.current.isLatest(currentRequest)) return;
    const merged = mergeDashboardResults(requests, dataRef.current, loadedRef.current);
    dataRef.current = merged.data;
    loadedRef.current = merged.loaded;
    setData(merged.data);
    setLoaded(merged.loaded);
    setSectionErrors(merged.errors);
    if (requests.some((result) => result.status === 'fulfilled')) setLastUpdated(new Date());
    setLoading(false);
  }, [dateRange, fetchCoordinatorStats, fetchCoordinatorExceptions, fetchRecentHistory, fetchInquiries]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => { mounted.current = false; requestTracker.current.invalidate(); };
  }, [refresh]);

  const attention = useMemo(() => buildAttentionItems(data.exceptions || {}, data.inquiries), [data.exceptions, data.inquiries]);
  const queue = buildOperationsQueue(attention, data.events);

  const events = data.events.filter((event) => eventFilter === 'ALL' || event.status === eventFilter);
  const statusCounts = data.stats?.eventsByStatus || {};
  const stageCounts = countLifecycleStages(statusCounts);
  const summary = [
    { title: 'Upcoming events', value: data.events.length, detail: `Next ${period} days`, icon: CalendarDaysIcon, iconClass: 'bg-indigo-50 text-indigo-700', href: '/coordinator/events' },
    { title: 'Inquiries to review', value: attention.filter(item => item.id.startsWith('inquiry:')).length, detail: 'New inquiries and overdue proposals', icon: ExclamationTriangleIcon, iconClass: 'bg-amber-50 text-amber-700', href: '/coordinator/inquiries' },
    { title: 'Confirmed events', value: data.events.filter((event) => event.status === 'CONFIRMED').length, detail: `Next ${period} days`, icon: CheckCircleIcon, iconClass: 'bg-emerald-50 text-emerald-700', href: '/coordinator/events' },
    { title: 'Active vendors', value: data.stats?.activeVendors ?? '—', detail: 'All active registered vendors', icon: UsersIcon, iconClass: 'bg-sky-50 text-sky-700', href: '/coordinator/vendors' },
  ];

  return <Layout title="Operations overview"><div className="space-y-6">
    <PageHeader title="Operations board"
      subtitle="Upcoming events and the work that moves them forward."
      action={<>
        <label htmlFor="period" className="sr-only">Upcoming events period</label>
        <select id="period" value={period} onChange={event => setPeriod(Number(event.target.value))}>
          <option value={7}>Next 7 days</option><option value={30}>Next 30 days</option><option value={90}>Next 90 days</option>
        </select>
        <button type="button" onClick={refresh} disabled={loading} className="btn-outline"><ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </>} />
    {lastUpdated && <p className="text-xs text-slate-500">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Upcoming events cover the next {period} days.</p>}
    {Object.keys(sectionErrors).length > 0 && <div role="alert" className="flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Some dashboard sections could not be refreshed. Existing results are retained.<button onClick={refresh} className="font-semibold underline">Retry</button></div>}
    <OperationsQueue items={queue} loading={loading} incomplete={Boolean(sectionErrors.events || sectionErrors.exceptions || sectionErrors.inquiries)} />
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Operational summary">
      {summary.map(card => {
        const metricLoaded = card.title === 'Upcoming events' || card.title === 'Confirmed events' ? loaded.events
          : card.title === 'Inquiries to review' ? loaded.exceptions && loaded.inquiries : loaded.stats;
        return <Link key={card.title} to={card.href} className="rounded-2xl">
          <StatCard label={card.title} value={metricDisplay(card.value, metricLoaded)} detail={card.detail}
            icon={<card.icon />} color={card.title === 'Inquiries to review' ? 'amber' : card.title === 'Confirmed events' ? 'green' : 'navy'} />
        </Link>;
      })}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex justify-between gap-3">
        <h2 className="font-semibold">My workload</h2>
        <button onClick={workload.reload} className="text-sm text-indigo-700">Refresh workload</button>
      </div>
      {workload.loading && <p className="mt-2 text-sm">Loading workload…</p>}
      {workload.error && <p role="alert" className="mt-2 text-sm text-rose-700">{workload.error}</p>}
      {mine && <p className="mt-2 text-sm text-slate-600">{mine.inquiries} active inquiries · {mine.events} active events</p>}
      <Link to="/coordinator/events" className="mt-2 inline-block text-sm text-indigo-700">View events and filter by My events</Link>
    </section>
    <IssueAttention />

    <div className="grid gap-6 xl:grid-cols-5"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-3"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Upcoming events</h2><p className="mt-1 text-sm text-slate-500">From {dateRange.startDate} through {dateRange.endDate}</p></div><div className="flex gap-2"><label htmlFor="event-filter" className="sr-only">Filter upcoming events</label><select id="event-filter" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option value="ALL">All upcoming</option><option value="CONFIRMED">Confirmed</option><option value="AWAITING_VENDORS">Awaiting vendors</option><option value="NEEDS_COORDINATOR">Needs coordinator</option></select><Link to="/coordinator/events" className="px-2 py-1 text-sm text-indigo-600">View all</Link></div></div>{events.length ? <ul className="divide-y divide-slate-100">{events.slice(0, 7).map((event) => <li key={event.eventId}><Link to={`/coordinator/events/${event.eventId}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{event.eventName}</p><p className="mt-1 text-xs text-slate-500">{event.clientName} · {event.venue || 'Venue pending'} · {event.expectedAttendees ?? '—'} guests</p></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{new Date(`${event.eventDate}T00:00:00`).toLocaleDateString()}</span><StatusBadge status={event.status} /></div></Link></li>)}</ul> : <p className="px-5 py-8 text-center text-sm text-slate-500">{sectionErrors.events ? 'Upcoming events are temporarily unavailable.' : !loaded.events ? 'Loading upcoming events…' : 'No upcoming events in this period.'}</p>}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><h2 className="font-semibold text-slate-900">Event lifecycle</h2><p className="mt-1 text-sm text-slate-500">All event records; proportions use the full event count, including cancelled and closed events.</p>{loaded.stats ? <div className="mt-5 space-y-4">{stageCounts.map((stage) => { const total = stageCounts.reduce((sum, item) => sum + item.count, 0); return <div key={stage.label}><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">{stage.label}</span><span className="font-semibold tabular-nums">{stage.count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${total ? stage.count / total * 100 : 0}%` }} /></div></div>; })}</div> : <p className="mt-5 animate-pulse text-sm text-slate-500">{sectionErrors.stats ? 'Lifecycle data is temporarily unavailable.' : 'Loading lifecycle data…'}</p>}</section></div>
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Recent activity</h2></div>{data.history.length ? <ul className="divide-y divide-slate-100">{data.history.slice(0, 5).map((item, index) => <li key={item.id || index} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between"><span className="text-sm text-slate-700">{item.description || `${item.fromStatus || ''} → ${item.toStatus || ''}`}</span><span className="text-xs text-slate-400">{item.occurredAt ? new Date(item.occurredAt).toLocaleString() : ''}</span></li>)}</ul> : <p className="px-5 py-7 text-center text-sm text-slate-500">{sectionErrors.history ? 'Recent activity is temporarily unavailable.' : !loaded.history ? 'Loading activity…' : 'No recent activity.'}</p>}</section>
    <details className="surface p-5">
      <summary className="text-sm font-semibold text-slate-700">Workflow demonstration</summary>
      <p className="my-3 text-sm text-slate-500">Explore a sample vendor selection scenario for your presentation.</p>
      <button type="button" onClick={() => setIsSimulationOpen(true)} className="btn-outline">Open demonstration</button>
      <div className="mt-4"><VendorEcosystemChart data={demoVendorEcosystem} /></div>
    </details>
  </div><LiveSimulationModal isOpen={isSimulationOpen} onClose={() => setIsSimulationOpen(false)} /></Layout>;
}
