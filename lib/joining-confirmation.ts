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

/** Create the 30-day confirmation request and return it (its id is the link token). */
export async function createJoiningConfirmationRequest(input: {
  candidateId: string;
  candidateName: string;
  email: string;
  proposedDate: string;
}): Promise<JoiningConfirmation> {
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
}
