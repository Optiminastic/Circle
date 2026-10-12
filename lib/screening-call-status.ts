/**
 * What a screening call's status means, with no transport attached.
 *
 * Split from `lib/api/screening-calls` so these rules can be exercised
 * directly: that module imports the HTTP client, which drags in the whole
 * app just to ask whether a call has gone stale.
 */

import type { ScreeningCall } from '@/lib/api/screening-calls';

export type ScreeningCallMode = 'phone' | 'web';

export type ScreeningCallStatus =
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'no-answer'
  | 'declined';

/** Still with the voice provider — the only states worth polling through. */
export const ACTIVE_CALL_STATUSES: readonly ScreeningCallStatus[] = [
  'queued',
  'ringing',
  'in-progress',
];

export const isCallActive = (status: ScreeningCallStatus): boolean =>
  ACTIVE_CALL_STATUSES.includes(status);

/**
 * How long an active call can go unreported before it is treated as lost.
 *
 * The result arrives by webhook, and a webhook can simply never come - the
 * provider dropped it, the deploy was mid-restart, the URL was wrong. Without
 * this the card says "Dialling..." for ever and HR waits on something that is
 * never going to land.
 *
 * Mirrors `_QUEUED_STALE_AFTER` / `_STALE_AFTER` in `screening_calls.py`,
 * which already stop a lost call blocking the next one. Kept in step by hand:
 * two numbers, both about display, and the server does not publish them.
 */
export const QUEUED_STALE_AFTER_MS = 3 * 60_000;
export const ACTIVE_STALE_AFTER_MS = 14 * 60_000;

/** An active call old enough that no result is coming. */
export function isCallStale(call: ScreeningCall, now: number = Date.now()): boolean {
  if (!isCallActive(call.status)) return false;
  const started = Date.parse(call.startedAt);
  if (Number.isNaN(started)) return false;
  const window = call.status === 'queued' ? QUEUED_STALE_AFTER_MS : ACTIVE_STALE_AFTER_MS;
  return now - started > window;
}
