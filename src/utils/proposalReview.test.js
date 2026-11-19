import test from 'node:test';
import assert from 'node:assert/strict';
import { compareProposals, proposalDate, proposalDateRange, proposalMoney, proposalVendors, readProposal, savedProposalVersions } from './proposalReview.js';

const original = {
  eventName: 'Medical Equipment Exhibition', eventType: 'exhibition',
  venueId: 3, venue: 'Meeting Room 03', eventDate: '2027-02-20', endDate: '2027-02-21',
  expectedAttendees: 100, tableSetup: 'CLASSROOM', price: 50000,
  categories: ['av', 'security'], pricingTier: 'standard', terms: 'Pay within seven days.\nPrice covers the agreed services.',
  vendorShortlist: [{ category: 'av', vendors: [{ id: 10, companyName: 'AICC AV', rating: 4 }] }],
};

test('compares sent versions and identifies the actual business changes and price difference', () => {
  const revised = { ...original, venueId: 8, venue: 'Meeting Room 08', price: 70000, tableSetup: 'BANQUET', expectedAttendees: 200 };
  const result = compareProposals(JSON.stringify(revised), JSON.stringify(original));
  assert.equal(result.available, true);
  assert.deepEqual(result.changes.map(change => change.key), ['venue', 'expectedAttendees', 'tableSetup', 'price']);
  assert.equal(result.priceDelta, 20000);
  assert.deepEqual(result.changes.find(change => change.key === 'price'), { key: 'price', label: 'Quoted total', before: 'ETB 50,000', after: 'ETB 70,000' });
});

test('only earlier saved versions are eligible, sorted by version rather than API order or date', () => {
  const versions = [
    { revisionNumber: 1, createdAt: '2028-01-01' }, { revisionNumber: 3 }, { revisionNumber: 2 },
    { revisionNumber: 4 }, { revisionNumber: 0 }, { revisionNumber: 'bad' }, null,
  ];
  assert.deepEqual(savedProposalVersions(versions, 3).map(version => version.revisionNumber), [2, 1]);
  assert.equal(versions[0].revisionNumber, 1);
  assert.deepEqual(savedProposalVersions(null, 3), []);
});

test('does not fabricate earlier terms when a saved snapshot is unreadable or missing', () => {
  for (const invalid of [null, 'bad json', '[]', '"text"']) {
    assert.equal(readProposal(invalid), null);
    assert.equal(compareProposals(original, invalid).available, false);
  }
  const result = compareProposals(original, { venue: original.venue, price: original.price });
  assert.deepEqual(result.changes, []);
  assert.ok(result.missing.includes('Event dates'));
  assert.equal(result.priceDelta, null);
  assert.equal(compareProposals(original, '{}').available, false);
});

test('ignores new send timestamps, refreshed ratings, category order, and equivalent price representations', () => {
  const current = {
    ...original, price: '50000', categories: ['security', 'av'], sentDate: '2027-01-05', expiryDate: '2027-01-12',
    terms: original.terms.replaceAll('\n', '\r\n'),
    vendorShortlist: [{ category: 'av', vendors: [{ id: 10, companyName: 'AICC AV', rating: 5, description: 'Updated profile' }] }],
  };
  assert.deepEqual(compareProposals(current, original).changes, []);
});

test('detects removing all services and all suggested vendors without substituting defaults', () => {
  const result = compareProposals({ ...original, categories: [], vendorShortlist: [] }, original);
  assert.deepEqual(result.changes.map(change => change.key), ['categories', 'vendorShortlist']);
  assert.equal(result.changes[0].after, 'No services selected');
  assert.equal(result.changes[1].after, 'No vendors suggested');
});

test('preserves vendor priority changes within a service but ignores service group order', () => {
  const first = { ...original, vendorShortlist: [{ category: 'av', vendors: [{ id: 1, companyName: 'First' }, { id: 2, companyName: 'Second' }] }, { category: 'security', vendors: [{ id: 3, companyName: 'Security' }] }] };
  const reorderedGroups = { ...first, vendorShortlist: [...first.vendorShortlist].reverse() };
  assert.deepEqual(compareProposals(first, reorderedGroups).changes, []);
  const swapped = { ...first, vendorShortlist: [{ ...first.vendorShortlist[0], vendors: [...first.vendorShortlist[0].vendors].reverse() }, first.vendorShortlist[1]] };
  assert.equal(compareProposals(swapped, first).changes[0].key, 'vendorShortlist');
});

test('reads legacy vendor shortlists without displaying numeric placeholders as actual vendor identities', () => {
  assert.deepEqual(proposalVendors({ vendorShortlist: { av: ['Habesha AV', 'Demo AV'], security: [15] } }), [
    { category: 'av', vendors: [{ id: undefined, name: 'Habesha AV' }, { id: undefined, name: 'Demo AV' }] },
    { category: 'security', vendors: [{ id: 15, name: 'Vendor #15' }] },
  ]);
});

test('detects date duration changes and treats an omitted single-day end as the start date', () => {
  const oneDay = { ...original, endDate: original.eventDate };
  const legacy = { ...oneDay }; delete legacy.endDate;
  assert.deepEqual(compareProposals(oneDay, legacy).changes, []);
  assert.equal(compareProposals(original, oneDay).changes[0].key, 'eventDate');
  assert.equal(proposalDateRange(oneDay), '20 Feb 2027');
  assert.equal(proposalDateRange(original), '20 Feb 2027 – 21 Feb 2027');
  assert.equal(proposalDate('2027-02-30'), 'Not recorded');
});

test('preserves full multi-line terms and identifies a reduced quote correctly', () => {
  const terms = 'Updated payment instructions.\nCancellation terms still apply.\nContact the coordinator.';
  const result = compareProposals({ ...original, terms, price: 40000 }, original);
  assert.equal(result.priceDelta, -10000);
  assert.equal(result.changes.find(change => change.key === 'terms').after, terms);
});

test('never displays missing or invalid prices as zero or produces an invented price difference', () => {
  for (const value of [null, undefined, '', 'not a price']) {
    assert.equal(proposalMoney(value), 'Not recorded');
    assert.equal(compareProposals({ ...original, price: value }, original).priceDelta, null);
  }
  assert.equal(proposalMoney(0), 'ETB 0');
});

test('venue IDs are compared consistently without treating legacy missing IDs as a room change', () => {
  assert.deepEqual(compareProposals({ ...original, venueId: '3' }, original).changes, []);
  const legacy = { ...original }; delete legacy.venueId;
  assert.deepEqual(compareProposals(original, legacy).changes, []);
});
