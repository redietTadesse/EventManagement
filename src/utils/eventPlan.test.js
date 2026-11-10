import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readEventPlan, tomorrowDateKey } from './eventPlan.js';

test('venue search details can be reused in the inquiry across sign-in', () => {
  const plan = { eventType: 'trade_show', date: '2028-02-29', endDate: '2028-03-02', attendees: '250' };
  const search = new URLSearchParams(plan);
  assert.deepEqual(readEventPlan(new URLSearchParams(search.toString()), '2028-02-01'), plan);
});

test('invalid deep links preserve only supported event details', () => {
  const earliestDate = '2028-02-01';
  assert.deepEqual(readEventPlan(new URLSearchParams({
    eventType: 'invalid', date: '2028-02-30', endDate: '2028-03-01', attendees: '2147483648',
  }), earliestDate), { eventType: 'conference', date: '', endDate: '', attendees: '' });
  assert.deepEqual(readEventPlan(new URLSearchParams({
    eventType: 'meeting', date: '2028-02-14', endDate: '2028-02-13', attendees: '42',
  }), earliestDate), { eventType: 'meeting', date: '2028-02-14', endDate: '', attendees: '42' });
});

test('the earliest inquiry date rolls over to the next local day', () => {
  assert.equal(tomorrowDateKey(new Date(2027, 11, 31, 23, 45)), '2028-01-01');
  assert.equal(readEventPlan(new URLSearchParams('date=2027-12-31'), '2028-01-01').date, '');
});
