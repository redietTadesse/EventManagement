
export function shiftDay(value, offset) {
  const date = new Date(value + 'T12:00:00');
  date.setDate(date.getDate() + offset);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-');
}

export function scheduleDays(start, count = 14) {
  return Array.from({ length: count }, (_, index) => shiftDay(start, index));
}

export function venueDay(venue, date, bookings, blocked, events, now = Date.now()) {
  const booking = bookings.find(row => row.bookingDate === date &&
    (row.status === 'CONFIRMED' || row.status === 'HELD' && row.expiresAt &&
      new Date(row.expiresAt).getTime() > now));
  const event = booking?.eventId ? events.find(item => item.id === booking.eventId) : null;
  if (booking) {
    if (booking.status === 'HELD') return { kind: 'hold', label: 'Held', booking };
    const phase = !event?.eventDate ? 'Booked' : date < event.eventDate ? 'Setup'
      : date > (event.endDate || event.eventDate) ? 'Takedown' : 'Event';
    return { kind: phase.toLowerCase(), label: phase, booking, event };
  }
  const block = blocked.find(row => row.date === date);
  if (block) return { kind: 'blocked', label: 'Blocked', reason: block.reason };
  const legacy = events.find(item => item.venueId === venue.id &&
    !['CANCELLED', 'CLOSED', 'COMPLETED'].includes(item.status) && item.eventDate &&
    date >= item.eventDate && date <= (item.endDate || item.eventDate));
  if (legacy) return { kind: 'booked', label: 'Event record', event: legacy };
  return { kind: venue.active ? 'free' : 'inactive', label: venue.active ? 'Open' : 'Inactive' };
}
