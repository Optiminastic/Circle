/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which onboarding steps a person actually has.
 *
 * Interns do not follow the full-time path. They get one letter instead of two,
 * a narrower document set, a plain joining-date email with no form to fill in,
 * and a mailbox but no company laptop. Everything else - documents, BGV, first
 * day, conversion to the directory - is the same machinery.
 *
 * Step membership lives here because two views need to agree on it: the stepper
 * on the onboarding workspace and the progress bar on the onboarding list. They
 * already derived it separately, in a different order and with slightly
 * different conditions. Each may still decide how to *render* a step; which
 * steps exist, and what fraction of them is done, is settled here.
 */
import type { Employee, Job, OnboardingChecklist, OnboardingTrack } from '@/types';

export type { OnboardingTrack };

/** The full-time path, in the order the stepper has always shown it. */
export const EMPLOYEE_STEPS = [
  'Offer letter',
  'Signed offer received',
  'Joining Documents',
  'Background verification',
  'Joining date confirmation',
  'Allocation of mail, system & desk',
  'First day',
  'Appointment letter',
  'Signed appointment letter',
  'Employee',
] as const;

/**
 * The intern path. Shorter by design, not by omission:
 *  - one letter, because an intern has no appointment letter to follow it
 *  - a joining-date email rather than the welcome form (no meal, plant or photo)
 *  - a mailbox only, because they bring their own laptop
 */
export const INTERN_STEPS = [
  'Internship letter',
  'Internship letter received',
  'Joining Documents',
  'Background verification',
  'Joining date',
  'Allocation of mail',
  'First day',
  'Employee',
] as const;

export type OnboardingStepLabel = (typeof EMPLOYEE_STEPS)[number] | (typeof INTERN_STEPS)[number];

const TRACK_STEPS: Record<OnboardingTrack, readonly OnboardingStepLabel[]> = {
  employee: EMPLOYEE_STEPS,
  intern: INTERN_STEPS,
};

/** The ordered steps for a track. */
export const stepsFor = (track: OnboardingTrack): readonly OnboardingStepLabel[] => TRACK_STEPS[track];

/** Is this step part of that track at all? */
export const hasStep = (track: OnboardingTrack, label: string): boolean =>
  (TRACK_STEPS[track] as readonly string[]).includes(label);

/**
 * Which track this onboarding is on.
 *
 * The stored value wins. The posting only supplies the default, because it can
 * be edited or closed long after onboarding begins - and the onboarding record
 * outlives it (`candidate_handoff.py` already falls back to it once the
 * candidate row is gone). Derive once, persist, then stop asking.
 *
 * Anything unrecognised is a full-time hire, which is correct for every record
 * created before this existed.
 */
export function resolveTrack(
  checklist: Pick<OnboardingChecklist, 'track'> | undefined,
  job?: Pick<Job, 'employmentType'>,
): OnboardingTrack {
  const stored = checklist?.track;
  if (stored === 'intern' || stored === 'employee') return stored;
  return job?.employmentType === 'Internship' ? 'intern' : 'employee';
}

/**
 * How far through its own track this onboarding is.
 *
 * Counted against that track's steps only. Counting an intern out of the
 * employee list is what left them stuck below 100% however much they finished.
 * A step with no entry is not done; a step outside the track is not counted.
 */
export function percentFor(track: OnboardingTrack, done: Record<string, boolean>): number {
  const steps = TRACK_STEPS[track];
  const finished = steps.filter(step => done[step] === true).length;
  return Math.round((finished / steps.length) * 100);
}

/**
 * What this person becomes in the employee directory.
 *
 * Jobs say 'Internship', employees say 'Intern'. The two vocabularies meet
 * here and nowhere else. `undefined` leaves the field unset, which is how every
 * full-time hire has always been written.
 */
export const internEmploymentType = (track: OnboardingTrack): Employee['employmentType'] =>
  track === 'intern' ? 'Intern' : undefined;
