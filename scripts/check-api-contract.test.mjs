import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCalls, checkCalls } from './check-api-contract.mjs';

const spec = { paths: { '/api/v1/vendors/{id}/performance': { get: {} }, '/api/auth/login': { post: {} } } };
test('checks templates, local paths, branches, query strings and auth prefix', () => {
  const calls = collectCalls("const path = `/vendors/${id}/performance`; api.get(path + '?days=' + days); authApi.post('/auth/login');");
  assert.equal(checkCalls(calls, spec).failures.length, 0);
});
test('rejects a missing route and the wrong HTTP verb', () => {
  const calls = collectCalls("api.get(`/vendors/${id}/missing`); api.patch(`/vendors/${id}/performance`);");
  assert.equal(checkCalls(calls, spec).failures.length, 2);
});
test('fails unresolved URLs rather than silently skipping them', () => {
  assert.equal(checkCalls(collectCalls('api.get(dynamicUrl);'), spec).failures.length, 1);
});
test('does not match a literal route to an arbitrary dynamic suffix', () => {
  assert.equal(checkCalls(collectCalls('api.get(`/vendors/${id}/${action}`);'), spec).failures.length, 1);
});
