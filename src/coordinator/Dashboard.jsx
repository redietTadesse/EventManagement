import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, CalendarDaysIcon, ExclamationTriangleIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import api from '../api/axios';
import { buildAttentionItems, countLifecycleStages, createRequestTracker, makeDateRange, mergeDashboardResults, metricDisplay } from './dashboardModel';

export default function CoordinatorDashboard() {
  const { fetchInquiries, fetchCoordinatorStats, fetchCoordinatorExceptions, fetchRecentHistory } = useApp();
  const [period, setPeriod] = useState(30);
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

  const events = data.events.filter((event) => eventFilter === 'ALL' || event.status === eventFilter);
  const statusCounts = data.stats?.eventsByStatus || {};
  const stageCounts = countLifecycleStages(statusCounts);
  const summary = [
    { title: 'Upcoming events', value: data.events.length, detail: `Next ${period} days`, icon: CalendarDaysIcon, iconClass: 'bg-indigo-50 text-indigo-700', href: '/coordinator/events' },
    { title: 'Needs attention', value: attention.length, detail: 'Distinct unresolved items', icon: ExclamationTriangleIcon, iconClass: 'bg-amber-50 text-amber-700', href: '/coordinator/inquiries' },
    { title: 'Confirmed events', value: data.events.filter((event) => event.status === 'CONFIRMED').length, detail: `Next ${period} days`, icon: CheckCircleIcon, iconClass: 'bg-emerald-50 text-emerald-700', href: '/coordinator/events' },
    { title: 'Active vendors', value: data.stats?.activeVendors ?? '—', detail: 'All active registered vendors', icon: UsersIcon, iconClass: 'bg-sky-50 text-sky-700', href: '/coordinator/vendors' },
  ];

  return <Layout title="Operations Overview"><main className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>
      <p className="text-sm font-medium text-indigo-600">Coordinator workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Operations Overview</h1>
      <p className="mt-1 text-sm text-slate-500">Monitor events, venue operations, and vendor coordination.</p>
      <p className="mt-2 text-xs text-slate-400">{new Date().toLocaleDateString(undefined, { dateStyle: 'full' })} · Period metrics: next {period} days · Active vendors, pipeline, attention and activity: all current data{lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
    </div><div className="flex gap-2">
      <label htmlFor="period" className="sr-only">Upcoming events period</label><select id="period" value={period} onChange={(event) => setPeriod(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value={7}>Next 7 days</option><option value={30}>Next 30 days</option><option value={90}>Next 90 days</option></select>
      <button onClick={refresh} disabled={loading} aria-label="Refresh dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"><ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </div></header>
    {Object.keys(sectionErrors).length > 0 && <div role="alert" className="flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Some dashboard sections could not be refreshed. Existing results are retained.<button onClick={refresh} className="font-semibold underline">Retry</button></div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Operational summary">{summary.map((card) => { const metricLoaded = card.title === 'Upcoming events' || card.title === 'Confirmed events' ? loaded.events : card.title === 'Needs attention' ? loaded.exceptions && loaded.inquiries : loaded.stats; const metric = metricDisplay(card.value, metricLoaded); return <Link key={card.title} to={card.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"><div className="flex justify-between"><div><p className="text-sm text-slate-500">{card.title}</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-900" aria-busy={!metricLoaded}>{metric}</p></div><span className={`rounded-lg p-2 ${card.iconClass}`}><card.icon className="h-5 w-5" /></span></div><p className="mt-3 text-xs text-slate-500">{card.detail}</p></Link>; })}</section>
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Attention required</h2><p className="mt-1 text-sm text-slate-500">Prioritized unresolved issues</p></div><Link to="/coordinator/inquiries" className="text-sm text-indigo-600">View all</Link></div>{attention.length ? <ul className="divide-y divide-slate-100">{attention.slice(0, 5).map((item) => <li key={item.id}><Link to={item.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50"><span className={`h-2.5 w-2.5 rounded-full ${item.priority === 0 ? 'bg-rose-500' : item.priority === 1 ? 'bg-amber-500' : 'bg-sky-500'}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{item.title || 'Operational issue'}</span><span className="block truncate text-xs text-slate-500">{item.detail}</span></span><span className="text-xs text-slate-400">{item.time ? new Date(item.time).toLocaleDateString() : ''}</span></Link></li>)}</ul> : sectionErrors.exceptions || sectionErrors.inquiries ? <p className="px-5 py-8 text-center text-sm text-rose-700">Attention items are temporarily unavailable.</p> : !loaded.exceptions || !loaded.inquiries ? <p className="animate-pulse px-5 py-8 text-center text-sm text-slate-500">Loading attention items…</p> : <p className="px-5 py-8 text-center text-sm text-slate-500">No unresolved operational issues.</p>}</section>
    <div className="grid gap-6 xl:grid-cols-5"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-3"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Upcoming events</h2><p className="mt-1 text-sm text-slate-500">From {dateRange.startDate} through {dateRange.endDate}</p></div><div className="flex gap-2"><label htmlFor="event-filter" className="sr-only">Filter upcoming events</label><select id="event-filter" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option value="ALL">All upcoming</option><option value="CONFIRMED">Confirmed</option><option value="AWAITING_VENDORS">Awaiting vendors</option><option value="NEEDS_COORDINATOR">Needs coordinator</option></select><Link to="/coordinator/events" className="px-2 py-1 text-sm text-indigo-600">View all</Link></div></div>{events.length ? <ul className="divide-y divide-slate-100">{events.slice(0, 7).map((event) => <li key={event.eventId}><Link to={`/coordinator/events/${event.eventId}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{event.eventName}</p><p className="mt-1 text-xs text-slate-500">{event.clientName} · {event.venue || 'Venue pending'} · {event.expectedAttendees ?? '—'} guests</p></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{new Date(`${event.eventDate}T00:00:00`).toLocaleDateString()}</span><StatusBadge status={event.status} /></div></Link></li>)}</ul> : <p className="px-5 py-8 text-center text-sm text-slate-500">{sectionErrors.events ? 'Upcoming events are temporarily unavailable.' : !loaded.events ? 'Loading upcoming events…' : 'No upcoming events in this period.'}</p>}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><h2 className="font-semibold text-slate-900">Event lifecycle</h2><p className="mt-1 text-sm text-slate-500">All event records; proportions use the full event count, including cancelled and closed events.</p>{loaded.stats ? <div className="mt-5 space-y-4">{stageCounts.map((stage) => { const total = stageCounts.reduce((sum, item) => sum + item.count, 0); return <div key={stage.label}><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">{stage.label}</span><span className="font-semibold tabular-nums">{stage.count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${total ? stage.count / total * 100 : 0}%` }} /></div></div>; })}</div> : <p className="mt-5 animate-pulse text-sm text-slate-500">{sectionErrors.stats ? 'Lifecycle data is temporarily unavailable.' : 'Loading lifecycle data…'}</p>}</section></div>
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Recent activity</h2></div>{data.history.length ? <ul className="divide-y divide-slate-100">{data.history.slice(0, 5).map((item, index) => <li key={item.id || index} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between"><span className="text-sm text-slate-700">{item.description || `${item.fromStatus || ''} → ${item.toStatus || ''}`}</span><span className="text-xs text-slate-400">{item.occurredAt ? new Date(item.occurredAt).toLocaleString() : ''}</span></li>)}</ul> : <p className="px-5 py-7 text-center text-sm text-slate-500">{sectionErrors.history ? 'Recent activity is temporarily unavailable.' : !loaded.history ? 'Loading activity…' : 'No recent activity.'}</p>}</section>
  </main></Layout>;
}
