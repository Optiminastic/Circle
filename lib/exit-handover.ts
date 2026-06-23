/**
 * Shared helpers for the public exit-handover link an exiting employee uses to
 * submit their work credentials + handover files. Mirrors the onboarding-docs
 * token flow.
 */

/** How long a handover link stays valid. */
export const EXIT_HANDOVER_TTL_HOURS = 72;

/** Public portal path for a handover token. */
export const exitHandoverPath = (token: string) => `/exit-handover/${token}`;

/** An unguessable token for a new handover link. */
export function newHandoverToken(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `EXH-${rand.slice(0, 24)}`;
}
