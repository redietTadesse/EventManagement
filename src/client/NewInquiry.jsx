import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// Calendar helpers
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();
const mondayFirstIndex = (day) => (day === 0 ? 6 : day - 1);
const formatDateKey = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

// Sample booked/active dates (would come from API in production)
const bookedDates = [
  '2026-09-08', '2026-09-15', '2026-09-20', '2026-09-25',
  '2026-10-05', '2026-10-12', '2026-10-18', '2026-10-25',
  '2026-11-02', '2026-11-10', '2026-11-15', '2026-11-22',
  '2026-12-01', '2026-12-10', '2026-12-20',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function NewInquiry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [form, setForm] = useState({
    eventType: 'conference',
    eventDate: '',
    expectedAttendees: '',
    requirements: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const calendarRef = useRef(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build set of booked dates for quick lookup
  const bookedSet = useMemo(() => new Set(bookedDates), []);

  // Generate calendar cells
  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);
    const startOffset = mondayFirstIndex(firstDayOfWeek);

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    const cells = [];

    // Previous month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells.push({ day, year: prevYear, month: prevMonth, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(currentYear, currentMonth, day);
      const isToday =
        today.getDate() === day &&
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear;
      const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      cells.push({ day, year: currentYear, month: currentMonth, isCurrentMonth: true, isToday, isPast, dateKey });
    }

    // Next month leading days
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      cells.push({ day, year: nextYear, month: nextMonth, isCurrentMonth: false });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateSelect = (dateKey) => {
    setForm({ ...form, eventDate: dateKey });
    setCalendarOpen(false);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/inquiries', {
        clientId: user.id,
        clientName: user.name,
        ...form,
        expectedAttendees: Number(form.expectedAttendees),
      });
      navigate('/client/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="New Inquiry">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">New Inquiry</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              name="eventType"
              value={form.eventType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="conference">Conference</option>
              <option value="wedding">Wedding</option>
              <option value="trade_show">Trade Show</option>
              <option value="concert">Concert</option>
              <option value="gala">Gala</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>

          <div className="mb-4" ref={calendarRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Date
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white hover:border-indigo-400 transition-colors"
              >
                <span className={form.eventDate ? 'text-gray-900' : 'text-gray-400'}>
                  {form.eventDate
                    ? new Date(form.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Select a date...'}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {calendarOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-dropdown border border-gray-200 p-4 w-80">
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm font-semibold text-gray-900">
                      {MONTHS[currentMonth]} {currentYear}
                    </span>
                    <button type="button" onClick={goToNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {calendarCells.map((cell, idx) => {
                      const isBooked = cell.dateKey && bookedSet.has(cell.dateKey);
                      const isSelected = cell.dateKey === form.eventDate;
                      let classes = 'relative flex items-center justify-center h-8 w-full rounded-md text-xs font-medium transition-all ';
                      if (!cell.isCurrentMonth) {
                        classes += 'text-gray-200 cursor-default';
                      } else if (cell.isPast) {
                        classes += 'text-gray-300 cursor-not-allowed';
                      } else if (isSelected) {
                        classes += 'bg-indigo-600 text-white shadow-sm';
                      } else if (isBooked) {
                        classes += 'bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer ring-1 ring-amber-200';
                      } else {
                        classes += 'text-gray-700 hover:bg-green-50 hover:text-green-700 cursor-pointer';
                      }
                      return (
                        <div
                          key={idx}
                          className={classes}
                          onClick={() => { if (cell.isCurrentMonth && !cell.isPast && cell.dateKey) handleDateSelect(cell.dateKey); }}
                        >
                          {cell.day}
                          {cell.isCurrentMonth && isBooked && !isSelected && (
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap gap-3 text-[10px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-amber-400" />
                      <span>Booked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-green-100 ring-1 ring-green-300" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-indigo-600" />
                      <span>Selected</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Dates with <span className="text-amber-600 font-medium">amber</span> indicator are already booked
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Attendees
            </label>
            <input
              type="number"
              name="expectedAttendees"
              value={form.expectedAttendees}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
              min="1"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirements
            </label>
            <textarea
              name="requirements"
              rows="3"
              value={form.requirements}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Any special requirements..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </Layout>
  );
}