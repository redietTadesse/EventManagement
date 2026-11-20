import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTables, tableDistribution } from './tablePlan.js';

test('balanced table estimates seat each guest exactly once and respect the requested maximum', () => {
  for (const guests of [1,7,10,59,60,61,98,160,4200]) {
    for (const places of [4,5,6,8,10]) {
      const plan = estimateTables(guests,places);
      assert.equal(plan.tables, Math.ceil(guests/places));
      assert.equal(plan.groups.reduce((sum,g) => sum+g.tables*g.guests,0),guests);
      assert.ok(plan.groups.every(g => g.tables > 0 && g.guests <= places));
    }
  }
  assert.equal(tableDistribution(estimateTables(98, 8)), '6 tables of 7 and 7 tables of 8');
  assert.equal(estimateTables('', 8), null);
  assert.equal(estimateTables(160, null), null);
});
