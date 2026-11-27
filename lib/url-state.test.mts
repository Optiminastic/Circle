/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useUrlState was reworked to write the URL via the raw History API instead
 * of `router.replace`, to skip a Next.js App Router RSC round-trip that was
 * pure overhead on every pagination/filter click (observed live: 1.25s,
 * slower than the actual data fetch it was paired with - see
 * docs/PRODUCTION_PERFORMANCE_FIX_REPORT.md). `deriveState` is the pure
 * piece of that hook - parsing the committed URL back into typed state - and
 * is the part a plain Node test can cover without a React/Next.js harness.
 *
 * Run with `pnpm test` (Node's built-in runner - no test dependency).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveState } from './url-state.ts';

const defaults = { page: 1, limit: 15, search: '', department: 'All' };

test('an empty query string resolves to exactly the defaults', () => {
  assert.deepEqual(deriveState(defaults, new URLSearchParams('')), defaults);
});

test('a present param overrides its default, others stay default', () => {
  assert.deepEqual(deriveState(defaults, new URLSearchParams('page=3')), {
    ...defaults,
    page: 3,
  });
});

test('numeric defaults are parsed back to numbers, not left as strings', () => {
  const state = deriveState(defaults, new URLSearchParams('page=3&limit=50'));
  assert.equal(typeof state.page, 'number');
  assert.equal(typeof state.limit, 'number');
  assert.equal(state.page, 3);
  assert.equal(state.limit, 50);
});

test('string params are left as-is', () => {
  const state = deriveState(defaults, new URLSearchParams('search=mahesh&department=Design'));
  assert.equal(state.search, 'mahesh');
  assert.equal(state.department, 'Design');
});

test('a param not in defaults is ignored entirely', () => {
  assert.deepEqual(deriveState(defaults, new URLSearchParams('page=2&somethingElse=x')), {
    ...defaults,
    page: 2,
  });
});
