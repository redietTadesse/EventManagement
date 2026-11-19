import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProposalDraft, seatingCapacity, proposedWindow, proposalChecks, proposalPayload } from './proposalBuilder.js';
const venue = { id: 12, name: 'Meeting Room', capacity: 300, layoutCapacities: '{"THEATRE":300,"CLASSROOM":132}', setupBufferDays: 1, teardownBufferDays: 1 };
const draft = { eventName: 'Research summit', eventDate: '2027-02-28', endDate: '', expectedAttendees: 100, tableSetup: 'CLASSROOM', customPrice: '6000', terms: 'Agreed payment terms', categories: [], vendorShortlist: {} };
test('venue fit uses the agreed seating capacity and never substitutes the room maximum for unknown layouts', () => {
  assert.equal(seatingCapacity(venue, 'CLASSROOM'), 132);
  assert.equal(seatingCapacity(venue, 'BANQUET'), null);
  assert.equal(seatingCapacity({ capacity: 300 }, 'CLASSROOM'), null);
  assert.equal(seatingCapacity({ capacity: 300 }, 'THEATRE'), 300);
  assert.equal(seatingCapacity(venue, 'UNDECIDED'), null);
});
test('editing retains intentionally empty services and the actual sent dates, name and layout', () => {
  const result = initialProposalDraft({ eventName: 'Original', eventDate: '2027-01-01', requestedCategories: ['av'], proposal: JSON.stringify({ ...draft, categories: [], vendorShortlist: { av: [{ id: 14 }] } }) }, true);
  assert.deepEqual(result.categories, []);
  assert.equal(result.eventName, draft.eventName);
  assert.equal(result.eventDate, draft.eventDate);
  assert.deepEqual(result.vendorShortlist.av, [14]);
});
test('meeting and exhibition windows include setup, takedown, minimum duration and calendar boundaries', () => {
  assert.deepEqual(proposedWindow(draft, venue, 'meeting'), { from: '2027-02-27', through: '2027-03-01', days: 3 });
  assert.deepEqual(proposedWindow({ ...draft, eventDate: '2028-02-28' }, venue, 'exhibition'), { from: '2028-02-27', through: '2028-03-04', days: 7 });
  assert.equal(proposedWindow({ ...draft, endDate: '2027-01-01' }, venue, 'meeting'), null);
});
test('sending is blocked on stale, failed or in-flight availability and on capacity, price and date errors', () => {
  assert.deepEqual(proposalChecks(draft, venue, { checked: true }), {});
  assert.ok(proposalChecks(draft, venue, { checked: false }).venue);
  assert.ok(proposalChecks(draft, venue, { checked: true, loading: true }).venue);
  assert.ok(proposalChecks(draft, venue, { checked: true, error: 'offline' }).venue);
  assert.match(proposalChecks({ ...draft, expectedAttendees: 200 }, venue, { checked: true }).venue, /132/);
  const errors = proposalChecks({ ...draft, customPrice: '0', terms: ' ', eventDate: '2027-02-30', tableSetup: 'UNDECIDED' }, venue, { checked: true });
  for (const field of ['customPrice', 'terms', 'eventDate', 'tableSetup']) assert.ok(errors[field]);
});
test('the payload preserves an empty service list, drops removed-service vendors and retains priority and version', () => {
  const result = proposalPayload({ ...draft, categories: ['av'], vendorShortlist: { av: [7, '9', 7, 'bad'], security: [11] } }, venue, 4);
  assert.deepEqual(result.vendorShortlist, { av: [7, 9] });
  assert.equal(result.expectedVersion, 4);
  assert.equal(JSON.parse(result.venueDetails).capacity, 132);
  assert.deepEqual(proposalPayload({ ...draft, vendorShortlist: { av: [7] } }, venue, 4).categories, []);
  assert.deepEqual(proposalPayload({ ...draft, vendorShortlist: { av: [7] } }, venue, 4).vendorShortlist, {});
});
