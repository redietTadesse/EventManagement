
import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleDays, venueDay } from './venueScheduleModel.js';
const venue = { id: 1, active: true };
const event = { id: 2, venueId: 1, eventDate: '2028-02-29', endDate: '2028-02-29', status: 'CONFIRMED' };
test('a meeting reservation distinguishes setup, event and takedown over a leap-day boundary', () => {
  const days = scheduleDays('2028-02-28', 3);
  const bookings = days.map(bookingDate => ({ bookingDate, eventId: 2, status: 'CONFIRMED' }));
  assert.deepEqual(days.map(day => venueDay(venue, day, bookings, [], [event]).label), ['Setup', 'Event', 'Takedown']);
  assert.equal(scheduleDays('2026-12-31', 2)[1], '2027-01-01');
});
test('expired holds and cancelled bookings release dates while administrator blocks remain visible', () => {
  const date = '2028-02-28';
  const bookings = [{ bookingDate: date, status: 'CANCELLED' }, { bookingDate: date, status: 'HELD', expiresAt: '2020-01-01T00:00:00' }];
  assert.equal(venueDay(venue, date, bookings, [], [], Date.now()).kind, 'free');
  assert.equal(venueDay(venue, date, bookings, [{ date, reason: 'Maintenance' }], []).reason, 'Maintenance');
  assert.equal(venueDay({ ...venue, active: false }, date, [], [], []).kind, 'inactive');
});
test('legacy event records remain visible and cancelled events do not occupy a venue', () => {
  assert.equal(venueDay(venue, event.eventDate, [], [], [event]).kind, 'booked');
  assert.equal(venueDay(venue, event.eventDate, [], [], [{ ...event, status: 'CANCELLED' }]).kind, 'free');
});
