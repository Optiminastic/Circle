/**
 * Signed-internship-letter upload link. When HR emails the internship letter,
 * we create a short-lived (72h) doc-request whose single required doc is the
 * signed copy, and send the intern a public link to upload it. The upload
 * reuses the existing public doc-request upload endpoint; HR then sees the file
 * in the candidate's documents. The unguessable token in the URL is the
 * credential. Once expired, HR can re-activate the same link from the
 * Internship letter step. Mirrors lib/sign-offer.ts exactly.
 *
 * This is the intern track's only letter - there is no appointment letter to
 * follow it. The backend lists `signed-internship` in `LETTER_KINDS`, so the
 * link carries no background-verification consent box and nothing uploaded
 * through it is ever sent to OnGrid.
 */
import { DocRequest } from '@/types';
import { repositories } from '@/lib/api/repositories';

export const SIGN_INTERNSHIP_TTL_HOURS = 72;
export const SIGNED_INTERNSHIP_DOC = 'Signed Internship Letter';

/** Public page the intern uses to upload their signed internship letter. */
export const signInternshipPath = (token: string) => `/sign-internship/${token}`;

/** Create the 72h upload request and return it (its id is the link token). */
export async function createSignInternshipRequest(input: {
  candidateId: string;
  candidateName: string;
  email: string;
}): Promise<DocRequest> {
  const now = new Date();
  const req: DocRequest = {
    id: `SIL-${crypto.randomUUID()}`,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    email: input.email,
    kind: 'signed-internship',
    requiredDocs: [SIGNED_INTERNSHIP_DOC],
    submissions: [],
    status: 'Pending',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SIGN_INTERNSHIP_TTL_HOURS * 3600 * 1000).toISOString(),
  };
  await repositories.docRequests.create(req);
  return req;
}
