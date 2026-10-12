/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression test for the retake bug: a candidate sat the IQ test twice and
 * the detail page kept reporting his first attempt, because the backend lists
 * `iq-tests` oldest-first and the page read element [0].
 *
 * Run with `pnpm test` (Node's built-in runner - no test dependency).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iqAttempts } from './iq-attempts.ts';

type Row = { id: string; candidateId: string; testDate: string; score: number; status: string };
const row = (id: string, testDate: string, score: number, status: string, candidateId = 'c1'): Row => ({
  id, candidateId, testDate, score, status,
});

/** Exactly how the backend returns them: ORDER BY created_at ASC. */
const asBackendReturnsThem = [
  row('a1', '2026-10-12T10:00:00+00:00', 76, 'Failed'),
  row('a2', '2026-10-12T15:28:00+00:00', 100, 'Passed'),
];

test('reports the newest attempt, not the one the backend returned first', () => {
  assert.equal(iqAttempts(asBackendReturnsThem, 'c1')[0].id, 'a2');
});

test('a retake that passed is no longer reported as Failed', () => {
  assert.equal(iqAttempts(asBackendReturnsThem, 'c1')[0].status, 'Passed');
});

test('keeps every attempt, so a retake cannot quietly replace a result', () => {
  assert.deepEqual(iqAttempts(asBackendReturnsThem, 'c1').map(r => r.id), ['a2', 'a1']);
});

test('never mixes in another candidate', () => {
  const other = row('zz', '2026-10-12T23:00:00+00:00', 200, 'Passed', 'c2');
  assert.deepEqual(iqAttempts([...asBackendReturnsThem, other], 'c1').map(r => r.id), ['a2', 'a1']);
});

test('an undated row never outranks a dated one', () => {
  const undated = { id: 'nd', candidateId: 'c1', score: 0, status: 'Failed' };
  assert.equal(iqAttempts([undated, ...asBackendReturnsThem], 'c1')[0].id, 'a2');
});

test('identical timestamps fall back to the later-written row', () => {
  const tied = [
    row('t1', '2026-10-12T15:28:00+00:00', 76, 'Failed'),
    row('t2', '2026-10-12T15:28:00+00:00', 100, 'Passed'),
  ];
  assert.equal(iqAttempts(tied, 'c1')[0].id, 't2');
});

test('does not mutate the caller’s array', () => {
  const input = [...asBackendReturnsThem];
  iqAttempts(input, 'c1');
  assert.equal(input[0].id, 'a1');
});
