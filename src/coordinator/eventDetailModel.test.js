import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServiceRows, eventActions, latestOfferHandoff, nextEventAction, parseSelection, venueReservation } from './eventDetailModel.js';

test('the offer comparison highlights a pending replacement and ignores a repeat offer to the same vendor', () => {
  const rows = buildServiceRows(['av', 'security', 'media'], [
    { id: 1, serviceCategory: 'av', vendorId: 1, status: 'DECLINED' },
    { id: 2, serviceCategory: 'av', vendorId: 2, status: 'PENDING' },
    { id: 3, serviceCategory: 'security', vendorId: 3, status: 'EXPIRED' },
    { id: 4, serviceCategory: 'security', vendorId: 3, status: 'PENDING' },
    { id: 5, serviceCategory: 'media', vendorId: 4, status: 'DECLINED' },
    { id: 6, serviceCategory: 'media', vendorId: 5, status: 'ACCEPTED' },
  ]);
  const handoff = latestOfferHandoff(rows);
  assert.equal(handoff.category, 'av');
  assert.equal(handoff.previous.id, 1);
  assert.equal(handoff.current.id, 2);
  assert.equal(latestOfferHandoff([rows[1]]), null);
});

const context = { status: 'AWAITING_VENDORS', vendorsKnown: true, venueKnown: true, venueNeedsAttention: false, tasksKnown: true, tasksRemaining: 0 };

test('required services have one row each and use the latest offer, regardless of response order', () => {
  const rows = buildServiceRows(['av', 'security', 'av'], [
    { id: 20, serviceCategory: 'av', status: 'PENDING', vendorName: 'Replacement AV' },
    { id: 5, serviceCategory: 'av', status: 'DECLINED', vendorName: 'First AV' },
    { id: 30, serviceCategory: 'catering', status: 'ACCEPTED' },
  ]);
  assert.deepEqual(rows.map(row => row.category), ['av', 'security']);
  assert.equal(rows[0].current.vendorName, 'Replacement AV');
  assert.equal(rows[0].attempts.length, 2);
  assert.equal(rows[0].state, 'pending');
  assert.equal(rows[1].state, 'exhausted');
});

test('a previous decline followed by a pending replacement is handled automatically', () => {
  const rows = buildServiceRows(['av'], [
    { id: 1, serviceCategory: 'av', status: 'DECLINED' },
    { id: 2, serviceCategory: 'av', status: 'PENDING', expiresAt: '2027-01-18T12:00:00' },
  ]);
  const action = nextEventAction({ ...context, rows });
  assert.equal(action.kind, 'waiting');
  assert.match(action.description, /replacement after a decline or expiry/);
  assert.equal(action.action, 'View pending offers');
});

test('an unclaimed pool offer takes priority over another pending service', () => {
  const rows = buildServiceRows(['av', 'security'], [
    { id: 1, serviceCategory: 'av', status: 'PENDING' },
    { id: 2, serviceCategory: 'security', status: 'OPEN' },
  ]);
  const action = nextEventAction({ ...context, rows });
  assert.equal(action.kind, 'intervene');
  assert.equal(action.category, 'security');
  assert.equal(action.action, 'Review alternatives');
  assert.match(action.description, /not been claimed/);
});

test('expired, declined, cancelled and absent offers require review; accepted services do not', () => {
  for (const status of ['EXPIRED', 'DECLINED', 'CANCELLED', null]) {
    const rows = buildServiceRows(['av'], status ? [{ id: 1, serviceCategory: 'av', status }] : []);
    assert.equal(nextEventAction({ ...context, rows }).kind, 'intervene');
  }
  for (const status of ['ACCEPTED', 'COMPLETED']) {
    const rows = buildServiceRows(['av'], [{ id: 1, serviceCategory: 'av', status }]);
    assert.equal(rows[0].state, 'resolved');
    assert.equal(nextEventAction({ ...context, rows }).kind, 'ready');
  }
});

test('unverified offers, reservations and task failures cannot appear ready', () => {
  assert.equal(nextEventAction({ ...context, rows: [], vendorsKnown: false }).kind, 'unknown');
  assert.equal(nextEventAction({ ...context, rows: [], venueKnown: false }).kind, 'venue');
  assert.equal(nextEventAction({ ...context, rows: [], tasksKnown: false }).kind, 'tasks');
  assert.equal(nextEventAction({ ...context, rows: [], tasksRemaining: 2 }).kind, 'tasks');
});

test('terminal events show history instead of offering to fix historical declines', () => {
  for (const status of ['CANCELLED', 'COMPLETED', 'CLOSED', 'PROPOSAL_REJECTED']) {
    const rows = buildServiceRows(['av'], [{ id: 1, serviceCategory: 'av', status: 'CANCELLED' }]);
    const action = nextEventAction({ ...context, status, rows });
    assert.equal(action.kind, 'closed');
    assert.equal(action.target, 'history');
  }
});

test('coordinator Cancel and Complete match the actual lifecycle transition table', () => {
  const statuses = ['INQUIRY_SUBMITTED', 'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'CLOSED', 'EVENT_CREATED', 'AWAITING_VENDORS', 'NEEDS_COORDINATOR', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  assert.deepEqual(statuses.filter(status => eventActions(status, 'COORDINATOR').cancel), ['AWAITING_VENDORS', 'NEEDS_COORDINATOR', 'CONFIRMED']);
  assert.deepEqual(statuses.filter(status => eventActions(status, 'COORDINATOR').complete), ['CONFIRMED']);
  assert.equal(eventActions('CONFIRMED', 'ADMIN').cancel, false);
  assert.equal(eventActions('CONFIRMED', 'VENDOR').complete, false);
  assert.equal(eventActions('CONFIRMED', undefined).cancel, false);
});

test('selection evidence uses the chosen vendor from the recorded snapshot, not the first candidate', () => {
  const result = parseSelection({ vendorId: 20, decisionSnapshot: JSON.stringify({
    selectedVendorId: 20, reasoning: 'Client preferred', considered: [
      { vendorId: 10, score: 95 }, { vendorId: 20, score: null },
    ],
  }) });
  assert.equal(result.selected.vendorId, 20);
  assert.equal(result.selected.score, null);
  assert.equal(result.snapshot.reasoning, 'Client preferred');
  assert.deepEqual(parseSelection({ decisionSnapshot: 'invalid json' }), { snapshot: null, selected: null });
});

test('a reservation requires every calendar day; holds, cancellations and another event do not count', () => {
  const bookings = [
    { eventId: 8, bookingDate: '2028-02-27', status: 'CONFIRMED' },
    { eventId: 8, bookingDate: '2028-02-28', status: 'CONFIRMED' },
    { eventId: 8, bookingDate: '2028-02-28', status: 'CONFIRMED' },
    { eventId: 8, bookingDate: '2028-02-29', status: 'HELD' },
    { eventId: 8, bookingDate: '2028-03-01', status: 'CANCELLED' },
    { eventId: 9, bookingDate: '2028-02-29', status: 'CONFIRMED' },
  ];
  assert.deepEqual(venueReservation(bookings, 8, '2028-02-28', '2028-03-01'), {
    requiredDays: 3, confirmedDates: ['2028-02-28'], bookedDates: ['2028-02-27', '2028-02-28'], complete: false,
  });
  assert.equal(venueReservation([...bookings,
    { eventId: 8, bookingDate: '2028-02-29', status: 'CONFIRMED' },
    { eventId: 8, bookingDate: '2028-03-01', status: 'CONFIRMED' },
  ], 8, '2028-02-28', '2028-03-01').complete, true);
  assert.equal(venueReservation([], 8, undefined, undefined).complete, false);
});
