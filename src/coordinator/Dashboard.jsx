import ProposalOverlaps from './ProposalOverlaps';
import BookingJourneyBoard from './BookingJourneyBoard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowPathIcon, CalendarDaysIcon, ExclamationTriangleIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import api from '../api/axios';
import { buildAttentionItems, buildOperationsQueue, createRequestTracker, makeDateRange, mergeDashboardResults, metricDisplay } from './dashboardModel';
import OperationsQueue from './OperationsQueue';
import LiveSimulationModal from './LiveSimulationModal';

import IssueAttention from './IssueAttention';
import useApiResource from '../hooks/useApiResource';
import ViewTabs from '../components/ViewTabs';


export default function CoordinatorDashboard() {
  const [params, setParams] = useSearchParams();
  const view = ['work', 'progress', 'events', 'overlaps'].includes(params.get('view')) ? params.get('view') : 'progress';
  const setView = value => setParams(previous => { const next = new URLSearchParams(previous); next.set('view', value); return next; });
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


  const summary = [
    { title: 'Upcoming events', value: data.events.length, detail: `Next ${period} days`, icon: CalendarDaysIcon, iconClass: 'bg-indigo-50 text-indigo-700', href: '/coordinator/events' },
    { title: 'Inquiries to review', value: attention.filter(item => item.id.startsWith('inquiry:')).length, detail: 'New inquiries and overdue proposals', icon: ExclamationTriangleIcon, iconClass: 'bg-amber-50 text-amber-700', href: '/coordinator/inquiries' },
    { title: 'Confirmed events', value: data.events.filter((event) => event.status === 'CONFIRMED').length, detail: `Next ${period} days`, icon: CheckCircleIcon, iconClass: 'bg-emerald-50 text-emerald-700', href: '/coordinator/events' },
    { title: 'Active vendors', value: data.stats?.activeVendors ?? '—', detail: 'All active registered vendors', icon: UsersIcon, iconClass: 'bg-sky-50 text-sky-700', href: '/coordinator/vendors' },
  ];

  return <Layout title="Operations overview"><div className="space-y-6">
    <header className="desk-mast"><div><p>Coordinator workspace</p><h1>Event operations</h1><span>{mine ? `My workload · ${mine.inquiries} inquiries and ${mine.events} events` : 'Bookings, venue dates and service commitments'}</span></div>
      <div className="mast-actions"><Link to="/coordinator/venue-schedule" className="btn-primary"><CalendarDaysIcon/>Venue schedule</Link>
        <button type="button" onClick={refresh} disabled={loading} className="btn-outline"><ArrowPathIcon className={loading ? 'animate-spin' : ''}/>Refresh</button>
        {workload.error && <button type="button" onClick={workload.reload}>Retry workload</button>}</div>
    </header>
    {Object.keys(sectionErrors).length > 0 && <div role="alert" className="flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Some dashboard sections could not be refreshed. Existing results are retained.<button onClick={refresh} className="font-semibold underline">Retry</button></div>}
    <ViewTabs id="operations" label="Operations views" value={view} onChange={setView} items={[
      ['progress', 'Booking board'], ['work', 'Follow-up queue', loaded.inquiries && loaded.exceptions && loaded.events ? queue.length : null], ['overlaps', 'Competing proposals'], ['events', 'Upcoming events'],
    ]} />
    {view === 'overlaps' && <section role="tabpanel" id="operations-panel-overlaps" aria-labelledby="operations-tab-overlaps"><ProposalOverlaps inquiries={data.inquiries} loaded={loaded.inquiries} error={sectionErrors.inquiries} refresh={refresh}/></section>}
    {view === 'work' && <section role="tabpanel" id="operations-panel-work" aria-labelledby="operations-tab-work" className="space-y-6"><OperationsQueue items={queue} loading={loading} incomplete={Boolean(sectionErrors.events || sectionErrors.exceptions || sectionErrors.inquiries)} /><IssueAttention /></section>}
    {view === 'progress' && <section role="tabpanel" id="operations-panel-progress" aria-labelledby="operations-tab-progress"><BookingJourneyBoard inquiries={data.inquiries} currentUserId={state.currentUser?.id} loaded={loaded.inquiries} error={sectionErrors.inquiries} /></section>}

    {view === 'events' && <section role="tabpanel" id="operations-panel-events" aria-labelledby="operations-tab-events">
    <div className="space-y-6"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-3"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Upcoming events</h2><p className="mt-1 text-sm text-slate-500">From {dateRange.startDate} through {dateRange.endDate}</p></div><div className="flex flex-wrap gap-2"><label htmlFor="period" className="sr-only">Upcoming period</label><select id="period" value={period} onChange={e => setPeriod(Number(e.target.value))}>{[7,30,90].map(n => <option key={n} value={n}>Next {n} days</option>)}</select><label htmlFor="event-filter" className="sr-only">Filter upcoming events</label><select id="event-filter" value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option value="ALL">All upcoming</option><option value="CONFIRMED">Confirmed</option><option value="AWAITING_VENDORS">Awaiting vendors</option><option value="NEEDS_COORDINATOR">Needs coordinator</option></select><Link to="/coordinator/events" className="px-2 py-1 text-sm text-indigo-600">View all</Link></div></div>{events.length ? <ul className="divide-y divide-slate-100">{events.slice(0, 15).map((event) => <li key={event.eventId}><Link to={`/coordinator/events/${event.eventId}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{event.eventName}</p><p className="mt-1 text-xs text-slate-500">{event.clientName} · {event.venue || 'Venue pending'} · {event.expectedAttendees ?? '—'} guests</p></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{new Date(`${event.eventDate}T00:00:00`).toLocaleDateString()}</span><StatusBadge status={event.status} /></div></Link></li>)}</ul> : <p className="px-5 py-8 text-center text-sm text-slate-500">{sectionErrors.events ? 'Upcoming events are temporarily unavailable.' : !loaded.events ? 'Loading upcoming events…' : 'No upcoming events in this period.'}</p>}</section>
    </div>
    </section>}
    <details className="disclosure-row"><summary>Operations totals {lastUpdated && <small>Updated {lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>}</summary><div className="metric-strip mt-4">
      {summary.map(card => <Link key={card.title} to={card.href}><StatCard label={card.title} value={metricDisplay(card.value, card.title === 'Active vendors' ? loaded.stats : card.title === 'Inquiries to review' ? loaded.inquiries && loaded.exceptions : loaded.events)} detail={card.detail} icon={<card.icon/>}/></Link>)}</div></details>
    <details className="disclosure-row"><summary>Recent activity<span aria-hidden="true">+</span></summary><div className="mt-4">{data.history.length ? <ul className="divide-y divide-slate-100">{data.history.slice(0, 5).map((item, index) => <li key={item.id || index} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between"><span className="text-sm text-slate-700">{item.description || `${item.fromStatus || ''} → ${item.toStatus || ''}`}</span><span className="text-xs text-slate-400">{item.occurredAt ? new Date(item.occurredAt).toLocaleString() : ''}</span></li>)}</ul> : <p className="px-5 py-7 text-center text-sm text-slate-500">{sectionErrors.history ? 'Recent activity is temporarily unavailable.' : !loaded.history ? 'Loading activity…' : 'No recent activity.'}</p>}</div></details>
    <details className="surface p-5">
      <summary className="text-sm font-semibold text-slate-700">Workflow demonstration</summary>
      <p className="my-3 text-sm text-slate-500">Explore a sample vendor selection scenario for your presentation.</p>
      <button type="button" onClick={() => setIsSimulationOpen(true)} className="btn-outline">Open demonstration</button>

    </details>
  </div><LiveSimulationModal isOpen={isSimulationOpen} onClose={() => setIsSimulationOpen(false)} /></Layout>;
}
