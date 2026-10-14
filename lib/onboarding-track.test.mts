/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which onboarding steps a person has, and which track they are on.
 *
 * Run with `pnpm test` (Node's built-in runner - no test dependency).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPLOYEE_STEPS,
  INTERN_STEPS,
  internEmploymentType,
  percentFor,
  resolveTrack,
  stepsFor,
} from './onboarding-track.ts';

// -- which steps exist ------------------------------------------------------

test('an intern has no appointment letter and no signed appointment', () => {
  assert.ok(!INTERN_STEPS.includes('Appointment letter' as never));
  assert.ok(!INTERN_STEPS.includes('Signed appointment letter' as never));
});

test('an intern gets the internship letter pair instead of the offer pair', () => {
  assert.deepEqual(INTERN_STEPS.slice(0, 2), ['Internship letter', 'Internship letter received']);
  assert.ok(!INTERN_STEPS.includes('Offer letter' as never));
});

test('an intern allocates mail only, not system and desk', () => {
  assert.ok(INTERN_STEPS.includes('Allocation of mail' as never));
  assert.ok(!INTERN_STEPS.includes('Allocation of mail, system & desk' as never));
});

test('both tracks still end at the employee directory', () => {
  assert.equal(EMPLOYEE_STEPS.at(-1), 'Employee');
  assert.equal(INTERN_STEPS.at(-1), 'Employee');
});

test('the employee track is unchanged: the same ten steps as before', () => {
  assert.equal(EMPLOYEE_STEPS.length, 10);
});

test('stepsFor returns the matching table', () => {
  assert.deepEqual(stepsFor('intern'), INTERN_STEPS);
  assert.deepEqual(stepsFor('employee'), EMPLOYEE_STEPS);
});

// -- resolving the track ----------------------------------------------------

test('a stored track wins over the posting', () => {
  // The posting can be edited or closed long after onboarding starts.
  const job = { employmentType: 'Full-time' };
  assert.equal(resolveTrack({ track: 'intern' }, job), 'intern');
  assert.equal(resolveTrack({ track: 'employee' }, { employmentType: 'Internship' }), 'employee');
});

test('with no stored track it falls back to the posting', () => {
  assert.equal(resolveTrack({}, { employmentType: 'Internship' }), 'intern');
  assert.equal(resolveTrack({}, { employmentType: 'Full-time' }), 'employee');
});

test('an unknown or missing posting is treated as a full-time hire', () => {
  // Every record that predates this feature lands here, which is correct:
  // they were all hired on the employee track.
  assert.equal(resolveTrack({}, undefined), 'employee');
  assert.equal(resolveTrack({}), 'employee');
  assert.equal(resolveTrack({ track: 'nonsense' as never }, undefined), 'employee');
});

// -- progress ---------------------------------------------------------------

test('an intern who finished every intern step reads 100%', () => {
  // The regression this guards: counting intern progress out of the employee
  // step list left them permanently short of 100 in the onboarding list.
  const done = Object.fromEntries(INTERN_STEPS.map(s => [s, true]));
  assert.equal(percentFor('intern', done), 100);
});

test('steps outside the track are ignored, done or not', () => {
  const done = Object.fromEntries(INTERN_STEPS.map(s => [s, true]));
  assert.equal(percentFor('intern', { ...done, 'Appointment letter': false }), 100);
  assert.equal(percentFor('employee', { 'Internship letter': true }), 0);
});

test('a missing entry counts as not done, never as done', () => {
  assert.equal(percentFor('intern', {}), 0);
});

test('progress is a proportion of that track, not of the employee track', () => {
  // 4 of 8 intern steps is 50%, even though 4 of 10 employee steps is 40%.
  const done = Object.fromEntries(INTERN_STEPS.slice(0, 4).map(s => [s, true]));
  assert.equal(percentFor('intern', done), 50);
});

// -- directory vocabulary ---------------------------------------------------

test('the job word becomes the employee word', () => {
  // Jobs say 'Internship', employees say 'Intern'. One boundary, here.
  assert.equal(internEmploymentType('intern'), 'Intern');
  assert.equal(internEmploymentType('employee'), undefined);
});
