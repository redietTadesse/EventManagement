import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryChoice } from './vendorRecovery.js';
test('a recovery offer addresses the chosen eligible vendor, not the previous failed vendor', () => {
  const vendors = [{ vendorId: 51, companyName: 'New AV' }, { id: 82, companyName: 'Backup AV' }];
  const choice = recoveryChoice(vendors, '82', '  Confirmed by phone  ', false, '');
  assert.equal(choice.vendorId, 82);
  assert.equal(choice.reason, 'Confirmed by phone');
  assert.equal(choice.ready, true);
  assert.equal(recoveryChoice(vendors, 15, 'Previous vendor', false, '').ready, false);
});
test('an eligibility refresh, failure, removed candidate or missing reason blocks the offer', () => {
  const vendors = [{ id: 82 }];
  assert.equal(recoveryChoice(vendors, 82, 'Reason', true, '').ready, false);
  assert.equal(recoveryChoice(vendors, 82, 'Reason', false, 'unavailable').ready, false);
  assert.equal(recoveryChoice([], 82, 'Reason', false, '').ready, false);
  assert.equal(recoveryChoice(vendors, 82, '  ', false, '').ready, false);
});
