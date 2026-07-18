/**
 * Signed-offer-letter upload link. When HR emails the offer letter, we create a
 * short-lived (72h) doc-request whose single required doc is the signed copy, and
 * send the candidate a public link to upload it. The upload reuses the existing
 * public doc-request upload endpoint; HR then sees the file in the candidate's
 * documents. The unguessable token in the URL is the credential. Once expired, HR
 * can re-activate the same link from the Offer letter step.
 */
import { DocRequest } from '@/types';
import { repositories } from '@/lib/api/repositories';

export const SIGN_OFFER_TTL_HOURS = 72;
export const SIGNED_OFFER_DOC = 'Signed Offer Letter';

/** Public page the candidate uses to upload their signed offer letter. */
export const signOfferPath = (token: string) => `/sign-offer/${token}`;

/** Create the 72h upload request and return it (its id is the link token). */
export async function createSignOfferRequest(input: {
  candidateId: string;
  candidateName: string;
  email: string;
}): Promise<DocRequest> {
  const now = new Date();
  const req: DocRequest = {
    id: `SOL-${crypto.randomUUID()}`,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    email: input.email,
    kind: 'signed-offer',
    requiredDocs: [SIGNED_OFFER_DOC],
    submissions: [],
    status: 'Pending',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SIGN_OFFER_TTL_HOURS * 3600 * 1000).toISOString(),
  };
  await repositories.docRequests.create(req);
  return req;
}
