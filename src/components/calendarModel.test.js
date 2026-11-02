import test from 'node:test';
import assert from 'node:assert/strict';
import { eventDayCoverage, mapCalendarEvents } from './calendarModel.js';

const record = (overrides = {}) => ({ id: 1, name: 'Conference', clientName: 'Client', eventDate: '2027-01-20', venue: 'Main Hall', status: 'AWAITING_VENDORS', ...overrides });

test('event response fields map directly to an all-day event and detail link', () => {
  const { events, omittedCount } = mapCalendarEvents([record()]);
  assert.equal(omittedCount, 0);
  assert.equal(events[0].title, 'Conference (Main Hall)');
  assert.equal(events[0].end, '2027-01-21');
  assert.equal(events[0].allDay, true);
  assert.equal(events[0].url, '/coordinator/events/1');
  assert.equal(events[0].extendedProps.client, 'Client');
  assert.equal(events[0].backgroundColor, '#D97706');
});

test('inclusive end dates survive month, year, leap-day and DST boundaries', () => {
  for (const [start, end, exclusive] of [
    ['2026-12-30', '2026-12-31', '2027-01-01'],
    ['2028-02-28', '2028-02-29', '2028-03-01'],
    ['2027-03-13', '2027-03-14', '2027-03-15'],
    ['2027-11-06', '2027-11-07', '2027-11-08'],
  ]) {
    assert.equal(mapCalendarEvents([record({ eventDate: start, endDate: end })]).events[0].end, exclusive);
  }
});

test('invalid dates and reversed ranges are reported without crashing the calendar', () => {
  const result = mapCalendarEvents([
    null,
    record({ eventDate: null }), record({ eventDate: '2027-02-30' }),
    record({ endDate: 'invalid' }), record({ endDate: '2027-01-19' }),
    record({ id: null }), record({ id: 2 }),
  ]);
  assert.equal(result.omittedCount, 6);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].id, '2');
});

test('event-day coverage counts overlapping dates once and changes with the viewed month', () => {
  const { events } = mapCalendarEvents([
    record({ eventDate: '2026-12-31', endDate: '2027-01-02' }),
    record({ id: 2, eventDate: '2027-01-02', endDate: '2027-01-04' }),
  ]);
  assert.equal(eventDayCoverage(events, 2026, 11).daysWithEvents, 1);
  assert.equal(eventDayCoverage(events, 2027, 0).daysWithEvents, 4);
  assert.equal(eventDayCoverage(events, 2027, 1).daysWithEvents, 0);
});

test('cancelled and closed events remain visible but do not inflate scheduled event days', () => {
  const { events } = mapCalendarEvents([
    record({ status: 'CANCELLED' }), record({ id: 2, status: 'CLOSED' }),
    record({ id: 3, eventDate: '2027-01-21', status: 'COMPLETED' }),
  ]);
  assert.equal(events.length, 3);
  assert.equal(eventDayCoverage(events, 2027, 0).daysWithEvents, 1);
  assert.notEqual(events[0].backgroundColor, events[2].backgroundColor);
});

test('empty loaded results are zero and February retains its actual number of days', () => {
  assert.deepEqual(eventDayCoverage([], 2028, 1), { daysWithEvents: 0, daysInMonth: 29, percentage: 0 });
});
