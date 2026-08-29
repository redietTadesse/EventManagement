// Check if vendor has any accepted assignment on a given date.
// We need the event date; we'll pass it from the context.
export const hasConflict = (vendorId, date, assignments, eventsMap) => {
  // eventsMap: { eventId: eventDate } – we'll build it.
  return assignments.some(a => {
    if (a.vendorId !== vendorId) return false;
    if (a.status !== 'ACCEPTED') return false;
    const eventDate = eventsMap[a.eventId];
    return eventDate === date;
  });
};

// Venue conflict: check if a venue is already booked for a given date.
// Checks live planned events (CONFIRMED / AWAITING_VENDORS / NEEDS_COORDINATOR are real bookings).
export const hasVenueConflict = (venueId, date, inquiries) => {
  if (!venueId || !date) return false;
  return inquiries.some(inquiry => {
    const event = inquiry.event;
    if (!event) return false;
    if (!['CONFIRMED', 'AWAITING_VENDORS', 'NEEDS_COORDINATOR'].includes(event.status)) return false;
    return event.venueId === venueId && inquiry.eventDate === date;
  });
};