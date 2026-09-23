/**
 * Joining-date confirmation link. When HR sends the joining-date welcome
 * email, we create a 30-day record HR-owned except for the candidate's own
 * response fields, and send the candidate a public link to confirm/decline
 * their joining date and pick a meal + welcome-plant preference. The
 * unguessable token in the URL is the credential — mirrors
 * `createSignOfferRequest` in lib/sign-offer.ts. HR sees the response on the
 * onboarding stepper and acts on it manually (it never auto-changes the
 * official joining date).
 */
import { JoiningConfirmation } from '@/types';
import { repositories } from '@/lib/api/repositories';

export const JOINING_CONFIRMATION_TTL_DAYS = 30;

/** Public page the candidate uses to respond. */
export const joiningConfirmationPath = (token: string) => `/joining-confirmation/${token}`;

/**
 * In-flight requests, keyed by candidate + proposed date.
 *
 * The caller creates the link from a `useEffect` when the modal opens, and
 * React StrictMode runs effects twice on mount in development. Both runs fire
 * this function before either finishes, so a plain "look for an existing one
 * first" check still races and writes two rows. Sharing the promise makes the
 * second caller await the first instead.
 */
const inFlight = new Map<string, Promise<JoiningConfirmation>>();

/**
 * Get the 30-day confirmation request for this candidate + date, creating one
 * only if there isn't already a live, unanswered request to reuse (its id is
 * the link token).
 *
 * Reuse matters because the link is minted when the modal OPENS, not when the
 * email is sent: without it, every time HR opened the dialog to look at the
 * draft and closed it again, an orphan row was written. Reusing also means a
 * re-send keeps the same URL, so a link the candidate already has stays valid.
 * A request that has been answered is never reused - that would let a second
 * submission overwrite the candidate's recorded preferences.
 */
export async function createJoiningConfirmationRequest(input: {
  candidateId: string;
  candidateName: string;
  email: string;
  proposedDate: string;
}): Promise<JoiningConfirmation> {
  const key = `${input.candidateId}|${input.proposedDate}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async (): Promise<JoiningConfirmation> => {
    try {
      const all = await repositories.joiningConfirmations.list();
      const now = Date.now();
      const reusable = all
        .filter(
          j =>
            j.candidateId === input.candidateId &&
            j.proposedDate === input.proposedDate &&
            !j.respondedAt &&
            Date.parse(j.expiresAt) > now,
        )
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
      if (reusable) return reusable;
    } catch {
      // Listing failed - fall through and create, so a transient read error
      // never blocks HR from sending the email.
    }

    const now = new Date();
    const req: JoiningConfirmation = {
      id: `JCF-${crypto.randomUUID()}`,
      candidateId: input.candidateId,
      candidateName: input.candidateName,
      email: input.email,
      proposedDate: input.proposedDate,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + JOINING_CONFIRMATION_TTL_DAYS * 86400 * 1000).toISOString(),
    };
    await repositories.joiningConfirmations.create(req);
    return req;
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}
