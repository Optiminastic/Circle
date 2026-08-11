/**
 * Signed-appointment-letter upload link. When HR emails the appointment letter,
 * we create a short-lived (72h) doc-request whose single required doc is the
 * signed copy, and send the candidate a public link to upload it. The upload
 * reuses the existing public doc-request upload endpoint; HR then sees the file
 * in the candidate's documents. The unguessable token in the URL is the
 * credential. Once expired, HR can re-activate the same link from the
 * Appointment letter step. Mirrors lib/sign-offer.ts exactly.
 */
import { DocRequest } from '@/types';
import { repositories } from '@/lib/api/repositories';

export const SIGN_APPOINTMENT_TTL_HOURS = 72;
export const SIGNED_APPOINTMENT_DOC = 'Signed Appointment Letter';

/** Public page the candidate uses to upload their signed appointment letter. */
export const signAppointmentPath = (token: string) => `/sign-appointment/${token}`;

/** Create the 72h upload request and return it (its id is the link token). */
export async function createSignAppointmentRequest(input: {
  candidateId: string;
  candidateName: string;
  email: string;
}): Promise<DocRequest> {
  const now = new Date();
  const req: DocRequest = {
    id: `SAL-${crypto.randomUUID()}`,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    email: input.email,
    kind: 'signed-appointment',
    requiredDocs: [SIGNED_APPOINTMENT_DOC],
    submissions: [],
    status: 'Pending',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SIGN_APPOINTMENT_TTL_HOURS * 3600 * 1000).toISOString(),
  };
  await repositories.docRequests.create(req);
  return req;
}
