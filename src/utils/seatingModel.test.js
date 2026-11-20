import test from 'node:test';
import assert from 'node:assert/strict';
import { seatingModel, projectRoom } from './seatingModel.js';
import { SEATING } from './proposalBuilder.js';

test('all six seating choices produce distinct rooms that rotate and remain visible from above', () => {
  const layouts = new Set();
  for (const [key] of SEATING) {
    const model = seatingModel(key);
    const front = projectRoom(model,28,false);
    const turned = projectRoom(model,-60,false);
    const overhead = projectRoom(model,28,true);
    for (const view of [front,turned,overhead]) {
      assert.ok(view.faces.length > 10);
      assert.ok(view.faces.every(face => !/NaN|Infinity/.test(face.points)));
    }
    assert.notEqual(front.faces[0].points, turned.faces[0].points);
    layouts.add(front.faces.map(face => face.points).join('|'));
  }
  assert.equal(layouts.size,6);
});
