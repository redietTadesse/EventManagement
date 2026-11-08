import { useEffect, useState } from 'react';
import api from '../api/axios';

export function calendarDateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-');
}

export default function useVenueAvailabilityCalendar(start, end, attendees, revision) {
  const [result, setResult] = useState(null);
  const key = [start, end, attendees, revision].join('/');

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/venues/availability/calendar', {
          params: { start, end, attendees },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResult({ key, dates: new Map(data.map((day) => [day.date, day.available])) });
        }
      } catch {
        if (!controller.signal.aborted) setResult({ key, error: true });
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [start, end, attendees, key]);

  return result?.key === key ? result : null;
}
