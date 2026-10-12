/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which IQ attempt is "the" result, and what came before it.
 *
 * A candidate can sit the IQ test more than once: the invite is write-once
 * (`POST /api/public/test/{token}/submit` 409s on a second submission), so a
 * retake means HR sent a fresh invite and the submission created a *second*
 * `iq-tests` row. The backend lists rows `ORDER BY created_at ASC`, so the
 * first element of that list is the OLDEST attempt.
 *
 * Reading `iqTests[0]` therefore reports the candidate's first attempt for
 * ever. That is what happened in production: the detail page showed a retake's
 * timestamp above the original attempt's score and verdict, and the stale
 * verdict also drove the Passed/Failed pill and the score quoted to the
 * candidate in their outcome email.
 *
 * Every view must get its attempt from here, so none of them can disagree.
 */

/** The shape this module needs. Generic so callers keep their own row type. */
export interface IqAttemptLike {
  candidateId: string;
  testDate?: string;
}

/**
 * This candidate's attempts, newest first. Never mutates `all`.
 *
 * Ties break towards the row the backend returned last: equal `testDate`s mean
 * equal clocks, and `created_at ASC` makes the later row the later attempt.
 */
export function iqAttempts<T extends IqAttemptLike>(all: readonly T[], candidateId: string): T[] {
  return all
    .map((attempt, index) => ({ attempt, index }))
    .filter(({ attempt }) => attempt.candidateId === candidateId)
    .sort((a, b) => {
      const byDate = (b.attempt.testDate ?? '').localeCompare(a.attempt.testDate ?? '');
      return byDate !== 0 ? byDate : b.index - a.index;
    })
    .map(({ attempt }) => attempt);
}
