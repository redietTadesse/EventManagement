import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import Layout from './Layout';
import api from '../api/axios';
import { eventDayCoverage, mapCalendarEvents } from './calendarModel';

export default function MasterCalendar() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const requestController = useRef(null);

  const loadEvents = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/events', { signal: controller.signal });
      if (!Array.isArray(response.data)) throw new Error('The events service returned an unexpected response.');
      if (!controller.signal.aborted) {
        setRecords(response.data);
        setLoaded(true);
      }
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError.response?.data?.message || 'Could not load calendar events.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    return () => requestController.current?.abort();
  }, [loadEvents]);

  const { events, omittedCount } = useMemo(() => mapCalendarEvents(records), [records]);
  const coverage = useMemo(() => eventDayCoverage(events, visibleMonth.year, visibleMonth.month), [events, visibleMonth]);
  const monthLabel = new Date(visibleMonth.year, visibleMonth.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Layout title="Calendar">
    <div className="coordinator-calendar space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Calendar</h1><p className="mt-1 text-sm text-slate-500">Event dates and vendor coordination status.</p></div>
        <button type="button" onClick={loadEvents} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50">{loading ? 'Loading…' : 'Refresh calendar'}</button>
      </div>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}{loaded ? ' Previously loaded events remain visible.' : ''} <button type="button" onClick={loadEvents} disabled={loading} className="font-medium underline">Retry</button></div>}
      {loading && !loaded && <p role="status" className="py-10 text-center text-sm text-slate-500">Loading calendar events…</p>}
      {loaded && <>
      {omittedCount > 0 && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{omittedCount} {omittedCount === 1 ? 'event could' : 'events could'} not be shown because the date range or event ID is missing or invalid. <Link to="/coordinator/events" className="underline">Review events</Link></p>}
      {!events.length && !omittedCount && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No events yet. Events created from accepted proposals will appear here.</p>}
      {/* Event-day summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-500 mb-1">Event days · {monthLabel}</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold text-indigo-600">{coverage.percentage}%</p>
            <p className="text-sm text-slate-500 mb-1">of days have events</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${coverage.percentage}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">Unique dates with events; excludes cancelled and closed events.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Days with events</p>
          <p className="text-4xl font-bold text-slate-800">{coverage.daysWithEvents} <span className="text-lg text-slate-400 font-normal">/ {coverage.daysInMonth}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Legend</p>
          <div className="flex flex-col gap-1 mt-2 text-sm">
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-600"></div> Confirmed / Completed</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-600"></div> Awaiting Vendors</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-600"></div> Needs Coordinator</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-indigo-600"></div> Event Created</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-500"></div> Cancelled / Closed</div>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          datesSet={({ view }) => {
            const year = view.currentStart.getFullYear();
            const month = view.currentStart.getMonth();
            setVisibleMonth(previous => previous.year === year && previous.month === month ? previous : { year, month });
          }}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            navigate(`/coordinator/events/${info.event.id}`);
          }}
        />
      </div>
      </>}

      {/* Custom CSS overrides for FullCalendar to match Tailwind theme */}
      <style>{`
        .coordinator-calendar .fc-header-toolbar {
          flex-wrap: wrap;
          gap: 12px;
        }
        .fc-theme-standard .fc-scrollgrid {
          border-color: #e2e8f0; /* slate-200 */
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #e2e8f0;
        }
        .fc-col-header-cell-cushion {
          color: #64748b; /* slate-500 */
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          padding: 8px 0;
        }
        .fc-daygrid-day-number {
          color: #334155; /* slate-700 */
          font-weight: 500;
          padding: 8px;
        }
        .fc-event {
          border-radius: 6px;
          padding: 2px 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          margin-top: 2px;
        }
        .fc-button-primary {
          background-color: #f8fafc !important; /* slate-50 */
          border-color: #e2e8f0 !important;
          color: #334155 !important;
          font-weight: 600 !important;
          text-transform: capitalize !important;
        }
        .fc-button-primary:hover {
          background-color: #f1f5f9 !important; /* slate-100 */
        }
        .fc-button-active {
          background-color: #4f46e5 !important; /* indigo-600 */
          border-color: #4338ca !important;
          color: white !important;
        }
      `}</style>
    </div>
    </Layout>
  );
}
