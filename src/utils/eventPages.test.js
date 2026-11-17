import test from 'node:test';
import assert from 'node:assert/strict';
import { eventPage } from './eventPages.js';
test('event pages show newest first, never lose records and limit pages to 15', () => {
  const rows = Array.from({length: 32}, (_, i) => ({ id: i + 1, createdAt: '2026-11-15' }));
  const first = eventPage(rows, 1), second = eventPage(rows, 2), last = eventPage(rows, 99);
  assert.equal(first.rows.length, 15);
  assert.equal(first.rows[0].id, 32);
  assert.equal(last.current, 3);
  assert.equal(last.rows.length, 2);
  assert.equal(new Set([...first.rows, ...second.rows, ...last.rows].map(row => row.id)).size, 32);
  assert.equal(rows[0].id, 1);
});
