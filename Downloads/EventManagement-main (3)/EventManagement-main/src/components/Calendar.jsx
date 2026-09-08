import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from './Layout';

// Helper: get number of days in a month
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Helper: get the day of week for the first day of a month (0=Sun, 1=Mon, ...6=Sat)
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

// Helper: convert day-of-week to Monday-first index (0=Mon, ...6=Sun)
const mondayFirstIndex = (day) => (day === 0 ? 6 : day - 1);

// Helper: format date as YYYY-MM-DD
const formatDateKey = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

// Sample events data (in a real app this would come from an API)
const sampleEvents = [
  { id: 1, name: 'Team Meeting', date: '2026-09-08', type: 'meeting', status: 'confirmed' },
  { id: 2, name: 'Product Launch', date: '2026-09-15', type: 'event', status: 'confirmed' },
  { id: 3, name: 'Client Call', date: '2026-09-10', type: 'meeting', status: 'pending' },
  { id: 4, name: 'Conference', date: '2026-09-20', type: 'event', status: 'confirmed' },
  { id: 5, name: 'Workshop', date: '2026-09-25', type: 'workshop', status: 'confirmed' },
  { id: 6, name: 'Board Meeting', date: '2026-10-01', type: 'meeting', status: 'confirmed' },
  { id: 7, name: 'Annual Gala', date: '2026-10-15', type: 'event', status: 'pending' },
  { id: 8, name: 'Training Session', date: '2026-09-06', type: 'workshop', status: 'confirmed' },
  { id: 9, name: 'Review Meeting', date: '2026-09-12', type: 'meeting', status: 'confirmed' },
  { id: 10, name: 'Strategy Planning', date: '2026-09-18', type: 'meeting', status: 'pending' },
  { id: 11, name: 'Team Building', date: '2026-09-22', type: 'event', status: 'confirmed' },
  { id: 12, name: 'Quarterly Review', date: '2026-09-30', type: 'meeting', status: 'confirmed' },
  { id: 13, name: 'Holiday', date: '2026-10-05', type: 'event', status: 'confirmed' },
  { id: 14, name: 'Site Visit', date: '2026-09-03', type: 'meeting', status: 'confirmed' },
  { id: 15, name: 'Budget Review', date: '2026-09-28', type: 'meeting', status: 'pending' },
];

// Generate dynamic events for the current month and surrounding months
const generateEventsForMonth = (year, month) => {
  const events = [];
  const baseEvents = [
    { name: 'Team Standup', type: 'meeting' },
    { name: 'Project Review', type: 'meeting' },
    { name: 'Client Presentation', type: 'event' },
    { name: 'Workshop', type: 'workshop' },
    { name: 'Training', type: 'workshop' },
    { name: 'Board Meeting', type: 'meeting' },
    { name: 'Strategy Session', type: 'meeting' },
    { name: 'Product Demo', type: 'event' },
  ];

  // Seed-based pseudo-random for consistent events per month
  const seed = year * 100 + month;
  const numEvents = 8 + (seed % 6); // 8-13 events per month

  for (let i = 0; i < numEvents; i++) {
    const day = 1 + ((seed * (i + 1) * 7) % 28); // Days 1-28 for safety
    const eventTemplate = baseEvents[(seed + i) % baseEvents.length];
    const dateKey = formatDateKey(year, month, day);

    events.push({
      id: `${year}-${month}-${i}`,
      name: eventTemplate.name,
      date: dateKey,
      type: eventTemplate.type,
      status: (i + seed) % 3 === 0 ? 'pending' : 'confirmed',
    });
  }

  return events;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_TYPE_COLORS = {
  meeting: 'bg-indigo-500',
  event: 'bg-emerald-500',
  workshop: 'bg-amber-500',
};

const EVENT_TYPE_BADGES = {
  meeting: 'badge-navy',
  event: 'badge-green',
  workshop: 'badge-amber',
};

export default function Calendar() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  // Generate events for the current month view
  const events = useMemo(() => generateEventsForMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  // Build a map of date -> events
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }, [events]);

  // Calendar grid calculation
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);
  const startOffset = mondayFirstIndex(firstDayOfWeek);

  // Previous month days to fill the grid
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  // Build calendar cells
  const calendarCells = [];

  // Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    calendarCells.push({
      day,
      year: prevYear,
      month: prevMonth,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const isToday =
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear;

    calendarCells.push({
      day,
      year: currentYear,
      month: currentMonth,
      isCurrentMonth: true,
      isToday,
      dateKey,
      dayEvents: eventsByDate[dateKey] || [],
    });
  }

  // Next month leading days to fill remaining cells
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const remainingCells = 42 - calendarCells.length; // 6 rows * 7 cols
  for (let day = 1; day <= remainingCells; day++) {
    calendarCells.push({
      day,
      year: nextYear,
      month: nextMonth,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Navigation handlers
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Handle date click
  const handleDateClick = (cell) => {
    if (!cell.isCurrentMonth) {
      // Navigate to that month
      setCurrentYear(cell.year);
      setCurrentMonth(cell.month);
      setSelectedDate(formatDateKey(cell.year, cell.month, cell.day));
      return;
    }
    setSelectedDate(cell.dateKey);
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  // Stats
  const totalEvents = events.length;
  const confirmedEvents = events.filter((e) => e.status === 'confirmed').length;
  const pendingEvents = events.filter((e) => e.status === 'pending').length;

  return (
    <Layout title="Calendar">
      <div className="page-enter space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
            <p className="text-sm text-slate-500 mt-1">
              View and manage your schedule. Active dates are highlighted.
            </p>
          </div>
          <button onClick={goToToday} className="btn-primary">
            Today
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="text-sm text-slate-500">Total Events</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalEvents}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-slate-500">Confirmed</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{confirmedEvents}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-slate-500">Pending</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pendingEvents}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="card">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={goToPrevMonth}
                  className="btn-outline p-2"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-slate-900">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <button
                  onClick={goToNextMonth}
                  className="btn-outline p-2"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-slate-500 uppercase py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, index) => {
                  const dateKey = cell.dateKey || formatDateKey(cell.year, cell.month, cell.day);
                  const isSelected = selectedDate === dateKey;
                  const hasEvents = cell.dayEvents && cell.dayEvents.length > 0;

                  let cellClasses =
                    'relative flex flex-col items-center justify-center rounded-lg p-2 min-h-[3rem] sm:min-h-[3.5rem] cursor-pointer transition-all duration-150 ';

                  if (!cell.isCurrentMonth) {
                    // Non-active dates (other months)
                    cellClasses += 'text-slate-300 bg-slate-50/50 cursor-pointer hover:bg-slate-100 ';
                  } else if (cell.isToday) {
                    // Today
                    cellClasses +=
                      'bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 ';
                  } else if (isSelected) {
                    // Selected date
                    cellClasses +=
                      'bg-indigo-100 text-indigo-700 font-semibold ring-2 ring-indigo-500 ';
                  } else if (hasEvents) {
                    // Active dates (current month, has events)
                    cellClasses +=
                      'bg-green-50 text-green-800 font-medium hover:bg-green-100 hover:shadow-sm ';
                  } else {
                    // Non-active dates (current month, no events)
                    cellClasses += 'text-slate-600 bg-white hover:bg-slate-50 hover:shadow-sm ';
                  }

                  return (
                    <div
                      key={`${index}-${dateKey}`}
                      className={cellClasses}
                      onClick={() => handleDateClick(cell)}
                    >
                      <span className="text-sm">{cell.day}</span>

                      {/* Event indicators for active dates */}
                      {cell.isCurrentMonth && hasEvents && (
                        <div className="flex gap-0.5 mt-1">
                          {cell.dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${EVENT_TYPE_COLORS[event.type] || 'bg-slate-400'}`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Today indicator */}
                      {cell.isToday && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-indigo-600" />
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Active Date (has events)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-200" />
                    <span>Non-active Date</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-indigo-100 ring-1 ring-indigo-500" />
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Details Panel */}
          <div className="lg:col-span-1">
            <div className="card sticky top-6">
              {selectedDate ? (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled
                  </p>

                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {event.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`badge ${EVENT_TYPE_BADGES[event.type] || 'badge-gray'}`}>
                                  {event.type}
                                </span>
                                <span
                                  className={`badge ${
                                    event.status === 'confirmed'
                                      ? 'badge-green'
                                      : 'badge-amber'
                                  }`}
                                >
                                  {event.status}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                EVENT_TYPE_COLORS[event.type] || 'bg-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-slate-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-500">No events on this date</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Select an active date to see events
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-slate-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Select a date</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click on any date to view its events
                  </p>
                </div>
              )}

              {/* Upcoming Events */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Events</h4>
                <div className="space-y-2">
                  {events
                    .filter((e) => e.status === 'confirmed')
                    .slice(0, 5)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 text-sm p-2 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedDate(event.date)}
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            EVENT_TYPE_COLORS[event.type] || 'bg-slate-400'
                          }`}
                        />
                        <span className="text-slate-700 truncate flex-1">{event.name}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
