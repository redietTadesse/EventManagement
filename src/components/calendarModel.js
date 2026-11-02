const DAY_MS = 86400000;

function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

export function mapCalendarEvents(records) {
  const events = [];
  let omittedCount = 0;
  for (const record of records) {
    if (!record || typeof record !== 'object') {
      omittedCount += 1;
      continue;
    }
    const start = calendarDate(record.eventDate);
    const inclusiveEnd = calendarDate(record.endDate || record.eventDate);
    if (record.id == null || start == null || inclusiveEnd == null || inclusiveEnd < start) {
      omittedCount += 1;
      continue;
    }
    const colors = {
      CONFIRMED: ['#059669', '#047857'], COMPLETED: ['#059669', '#047857'],
      AWAITING_VENDORS: ['#D97706', '#B45309'], NEEDS_COORDINATOR: ['#E11D48', '#BE123C'],
      CANCELLED: ['#64748B', '#475569'], CLOSED: ['#64748B', '#475569'],
    };
    const [backgroundColor, borderColor] = colors[record.status] || ['#4F46E5', '#4338CA'];
    events.push({
      id: String(record.id),
      title: `${record.name || `Event #${record.id}`} (${record.venue || 'Venue not assigned'})`,
      start: record.eventDate,
      // The API's final day is inclusive; FullCalendar all-day ends are exclusive.
      end: new Date(inclusiveEnd + DAY_MS).toISOString().slice(0, 10),
      allDay: true,
      url: `/coordinator/events/${record.id}`,
      backgroundColor, borderColor, textColor: '#ffffff',
      extendedProps: { status: record.status, client: record.clientName },
    });
  }
  return { events, omittedCount };
}

export function eventDayCoverage(events, year, month) {
  const monthStart = Date.UTC(year, month, 1);
  const monthEnd = Date.UTC(year, month + 1, 1);
  const daysInMonth = Math.round((monthEnd - monthStart) / DAY_MS);
  const dates = new Set();
  for (const event of events) {
    if (['CANCELLED', 'CLOSED'].includes(event.extendedProps?.status)) continue;
    const start = calendarDate(event.start);
    const end = calendarDate(event.end);
    if (start == null || end == null) continue;
    // Clip first so even an unusually long event only visits the displayed month's days.
    for (let day = Math.max(start, monthStart); day < Math.min(end, monthEnd); day += DAY_MS) dates.add(day);
  }
  return { daysWithEvents: dates.size, daysInMonth, percentage: Math.round(dates.size / daysInMonth * 100) };
}
