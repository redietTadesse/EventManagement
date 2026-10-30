import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttentionItems, countLifecycleStages, createRequestTracker, lifecycleStages, makeDateRange, mergeDashboardResults, metricDisplay } from './dashboardModel.js';

test('date range includes exactly the selected local calendar days', () => {
  assert.deepEqual(makeDateRange(new Date(2026, 9, 30, 23, 50), 7), { startDate: '2026-10-30', endDate: '2026-11-05' });
  assert.deepEqual(makeDateRange(new Date(2026, 11, 31), 1), { startDate: '2026-12-31', endDate: '2026-12-31' });
});

test('a newer period request supersedes in-flight requests and invalidation handles unmount', () => {
  const tracker = createRequestTracker();
  const oldPeriod = tracker.begin();
  const newPeriod = tracker.begin();
  assert.equal(tracker.isLatest(oldPeriod), false);
  assert.equal(tracker.isLatest(newPeriod), true);
  tracker.invalidate();
  assert.equal(tracker.isLatest(newPeriod), false);
});

test('multiple open assignments remain separate while event-level overlap is represented once', () => {
  const items = buildAttentionItems({
    needsCoordinatorEvents: [{ id: 10, name: 'Conference' }, { id: 20, name: 'Gala' }],
    openAssignments: [
      { id: 1, eventId: 10, serviceCategory: 'Audio' },
      { id: 2, eventId: 10, serviceCategory: 'Catering' },
      { id: 3, eventId: 20, serviceCategory: 'Lighting' },
      { id: 3, eventId: 20, serviceCategory: 'Lighting' },
    ],
  });
  assert.deepEqual(items.map(({ id }) => id), ['assignment:1', 'assignment:2', 'assignment:3']);
});

test('an inquiry returned in overlapping attention categories is represented once', () => {
  const items = buildAttentionItems(
    { staleProposals: [{ id: 4, clientName: 'Client', eventType: 'Meeting' }] },
    [{ id: 4, status: 'INQUIRY_SUBMITTED', clientName: 'Client', eventType: 'Meeting' }],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'inquiry:4');
  assert.match(items[0].detail, /Proposal/);
});

test('each EventStatus belongs to exactly one pipeline stage', () => {
  const eventStatuses = ['INQUIRY_SUBMITTED', 'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'CLOSED', 'EVENT_CREATED', 'AWAITING_VENDORS', 'NEEDS_COORDINATOR', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const mappings = lifecycleStages.flatMap((stage) => stage.statuses);
  assert.deepEqual([...mappings].sort(), [...eventStatuses].sort());
  assert.equal(new Set(mappings).size, eventStatuses.length);
  assert.equal(countLifecycleStages(Object.fromEntries(eventStatuses.map((status) => [status, 1]))).reduce((sum, stage) => sum + stage.count, 0), eventStatuses.length);
});

test('initial metrics stay unknown and partial failures retain prior section data', () => {
  assert.equal(metricDisplay(0, false), '—');
  assert.equal(metricDisplay(0, true), 0);
  const merged = mergeDashboardResults([
    { status: 'rejected', reason: new Error('stats offline') },
    { status: 'fulfilled', value: { openAssignments: [] } },
    { status: 'rejected', reason: new Error('history offline') },
    { status: 'fulfilled', value: [] },
    { status: 'fulfilled', value: [{ eventId: 8 }] },
  ], { stats: { activeVendors: 3 }, exceptions: null, history: [{ id: 1 }], inquiries: [], events: [] }, { stats: true, exceptions: false, history: true, inquiries: false, events: false });
  assert.equal(merged.data.stats.activeVendors, 3);
  assert.deepEqual(merged.data.history, [{ id: 1 }]);
  assert.equal(merged.data.events[0].eventId, 8);
  assert.equal(merged.loaded.events, true);
  assert.match(merged.errors.stats, /offline/);
});
