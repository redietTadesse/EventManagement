import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import useVenueAvailabilityCalendar, { calendarDateKey as dateKey } from '../hooks/useVenueAvailabilityCalendar';
import { VenueAvailabilityReasons, VenueDayExplanation } from '../components/VenueAvailabilityReasons';

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayStyle = {
  available: 'bg-emerald-100 text-emerald-900',
  unavailable: 'bg-slate-200 text-slate-600 line-through',
  unknown: 'bg-white text-slate-700 border border-dashed border-slate-300',
  past: 'text-slate-400',
};
const dayLabel = {
  available: 'Venue available',
  unavailable: 'No suitable venue available',
  unknown: 'Availability unknown',
  past: 'Date has passed or is today',
};
const dayMark = { available: '✓', unavailable: '×', unknown: '?', past: '' };

export default function InquiryDateCalendar({ start, end, attendees, onChange, readOnly = false }) {
  const now = new Date();
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const [month, setMonth] = useState(() => {
    if (start) {
      const [year, month] = start.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [choosingEnd, setChoosingEnd] = useState(false);
  const [inspectedDate, setInspectedDate] = useState('');
  const rangeReasons = useRef(null);
  const [range, setRange] = useState(null);
  const [revision, setRevision] = useState(0);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = dateKey(month);
  const lastDay = dateKey(new Date(year, monthIndex, days));
  const attendance = Number.isInteger(Number(attendees)) && Number(attendees) > 0 ? Number(attendees) : undefined;
  const monthResult = useVenueAvailabilityCalendar(firstDay, lastDay, attendance, revision);
  const validRange = start > today && (!end || end >= start);
  const rangeKey = [start, end, attendance, revision].join('/');

  useEffect(() => {
    if (!validRange) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/venues/availability/reasons', {
          params: { date: start, endDate: end || undefined, attendees: attendance },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setRange({ key: rangeKey, available: data.some((venue) => venue.available), venues: data });
        }
      } catch {
        if (!controller.signal.aborted) setRange({ key: rangeKey, error: true });
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [validRange, start, end, attendance, rangeKey]);

  function selectDate(date, asEnd) {
    setInspectedDate('');
    if (asEnd) {
      onChange(start, date === start ? '' : date);
      setChoosingEnd(false);
    } else {
      onChange(date, date && end >= date ? end : '');
      setChoosingEnd(false);
    }
    if (date) {
      const [selectedYear, selectedMonth] = date.split('-').map(Number);
      setMonth(new Date(selectedYear, selectedMonth - 1, 1));
    }
  }

  const rangeResult = range?.key === rangeKey ? range : null;
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const offset = (month.getDay() + 6) % 7;

  return (
    <fieldset className="mb-5 space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Event dates and venue availability</legend>
      <p className="text-sm text-slate-600">
        {attendance ? `Showing availability for ${attendance} attendees.` : 'Enter your expected attendance to check venue capacity.'}
        {' '}Availability can change before your coordinator reserves a venue.
      </p>
      {!readOnly && <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Start date
          <input type="date" required min={tomorrow} value={start}
            onChange={(event) => selectDate(event.target.value, false)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2" />
        </label>
        <label className="text-sm font-medium">
          End date (optional)
          <input type="date" min={start || tomorrow} value={end} disabled={!start}
            onChange={(event) => selectDate(event.target.value, true)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2" />
        </label>
      </div>}
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" disabled={firstDay <= today.slice(0, 7) + '-01'}
          onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
          className="rounded-lg border px-3 py-1 disabled:opacity-40">‹</button>
        <p aria-live="polite" className="font-semibold">{monthLabel}</p>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
          className="rounded-lg border px-3 py-1">›</button>
      </div>
      {!readOnly && <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" aria-pressed={!choosingEnd} onClick={() => setChoosingEnd(false)}
          className="rounded border px-2 py-1 aria-pressed:bg-indigo-100">Choose start date</button>
        <button type="button" aria-pressed={choosingEnd} disabled={!start} onClick={() => setChoosingEnd(true)}
          className="rounded border px-2 py-1 aria-pressed:bg-indigo-100 disabled:opacity-40">Choose end date</button>
      </div>}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {weekdayLabels.map((day) => <span key={day} className="py-1 font-medium text-slate-600">{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={index} aria-hidden="true" />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const date = dateKey(new Date(year, monthIndex, day));
          const blockedRangeStart = date === start && rangeResult?.available === false;
          const dailyAvailability = monthResult?.dates?.get(date);
          const available = blockedRangeStart ? false : dailyAvailability;
          const status = date <= today ? 'past' : available === undefined ? 'unknown' : available ? 'available' : 'unavailable';
          const selected = Boolean(start && date >= start && date <= (end || start));
          const label = blockedRangeStart && end ? 'No suitable venue for the selected range' : dayLabel[status];
          const className = `min-h-9 rounded text-sm disabled:cursor-default ${dayStyle[status]} ${selected ? 'ring-2 ring-inset ring-indigo-600 font-bold' : ''}`;
          const content = <>{day}{' '}<span aria-hidden="true" className="text-xs">{dayMark[status]}</span></>;
          if (status === 'unavailable') {
            return <button key={date} type="button" aria-label={`${date}, ${label}. Show reasons`}
              title={`${label}. Show reasons`} className={className}
              onClick={() => {
                if (blockedRangeStart && end) {
                  setInspectedDate('');
                  rangeReasons.current?.focus();
                } else {
                  setInspectedDate(date);
                }
              }}>{content}</button>;
          }
          if (readOnly) {
            return <span key={date} aria-label={`${date}, ${label}`} title={label}
              className={`grid place-content-center ${className}`}>{content}</span>;
          }
          return <button key={date} type="button"
            disabled={status === 'past' || (choosingEnd && date < start)}
            aria-label={`${date}, ${label}`} aria-pressed={selected} title={label}
            onClick={() => selectDate(date, choosingEnd)} className={className}>{content}</button>;
        })}
      </div>
      <p className="text-xs text-slate-600">Select a gray date to see why venues are unavailable.</p>
      {inspectedDate && <VenueDayExplanation key={`${inspectedDate}/${attendance}`} date={inspectedDate}
        attendees={attendance} onClose={() => setInspectedDate('')} />}
      <div className="flex flex-wrap gap-2 text-xs">
        {['available', 'unavailable', 'unknown'].map((status) => (
          <span key={status} className={`rounded px-2 py-1 ${status === 'unavailable' ? 'bg-slate-200 text-slate-600' : dayStyle[status]}`}>
            <span aria-hidden="true">{dayMark[status]} </span>{dayLabel[status]}
          </span>
        ))}
      </div>
      {!monthResult && <p role="status" className="text-sm text-slate-600">Checking calendar availability…</p>}
      {(monthResult?.error || rangeResult?.error) && (
        <p role="status" className="text-sm text-amber-800">
          Availability could not be checked.{' '}
          <button type="button" className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </p>
      )}
      {validRange && !rangeResult?.error && (
        <p role="status" className={`text-sm font-medium ${rangeResult?.available === false ? 'text-rose-800' : 'text-slate-700'}`}>
          {!rangeResult ? 'Checking your selected dates…' : rangeResult.available
            ? 'A suitable venue is available for the entire selection.'
            : readOnly ? 'No suitable venue is available for the requested dates.'
              : 'No suitable venue is available for the entire selection. Try other dates or submit these dates for review.'}
        </p>
      )}
      {validRange && rangeResult?.venues && (
        <div ref={rangeReasons} tabIndex={-1}><VenueAvailabilityReasons venues={rangeResult.venues} /></div>
      )}
    </fieldset>
  );
}
