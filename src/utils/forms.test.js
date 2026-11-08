import test from 'node:test';
import assert from 'node:assert/strict';
import { proposalDraft } from './proposals.js';
import { normalizeVendor, vendorUpdate } from './vendors.js';

test('opening an existing proposal preserves agreed price and enriched vendor choices', () => {
  const draft = proposalDraft({ venueId: 9, price: 123456, terms: 'Agreed terms', vendorShortlist: [{ category: 'av', vendors: [{ id: 15, companyName: 'AV' }] }] });
  assert.equal(draft.customPrice, '123456');
  assert.equal(draft.venueId, '9');
  assert.deepEqual(draft.vendorShortlist, { av: [15] });
  assert.equal(proposalDraft({ price: 0 }).customPrice, '0');
});
test('legacy proposal shortlists retain numeric IDs and never convert names into invalid IDs', () => {
  assert.deepEqual(proposalDraft({ vendorShortlist: { av: [4, '5', 'Company', null], security: 'invalid' } }).vendorShortlist, { av: [4, 5], security: [] });
});
test('API vendor activation is shown consistently, including an explicit inactive flag', () => {
  assert.equal(normalizeVendor({ active: true }).isActive, true);
  assert.equal(normalizeVendor({ active: false, isActive: true }).isActive, false);
  assert.equal(normalizeVendor({ isActive: true }).isActive, true);
});
test('vendor profile updates use vendor fields without copying account credentials or identity', () => {
  assert.deepEqual(vendorUpdate({ companyName: ' Company ', serviceCategory: 'av', email: ' company@example.com ', phone: ' 123 ', description: 'Services', insuranceExpiryDate: '', id: 9, userId: 1, password: 'private' }), {
    companyName: 'Company', serviceCategory: 'av', email: 'company@example.com', phone: '123', description: 'Services', insuranceExpiryDate: null,
  });
});
