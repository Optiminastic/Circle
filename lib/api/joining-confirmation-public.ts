/**
 * Public joining-confirmation portal client. Unauthenticated by design — the
 * unguessable, expiring token in the URL is the credential. Mirrors
 * lib/api/doc-requests.ts's direct-fetch pattern (used by every other
 * candidate-portal public page: sign-offer, onboarding-docs).
 */
import { JoiningConfirmation } from '@/types';
import { apiBase } from '@/lib/api-base';

/** Fetch a confirmation by its public token (used by the portal page). */
export async function getJoiningConfirmation(token: string): Promise<JoiningConfirmation> {
  const res = await fetch(`${apiBase()}/api/joining-confirmations/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('This link is invalid or has been removed.');
  return res.json();
}

/** Save the candidate's response (joining-date answer + meal/plant preference). */
export async function submitJoiningConfirmationResponse(
  token: string,
  changes: Pick<
    JoiningConfirmation,
    'canJoin' | 'suggestedDate' | 'meal' | 'plantChoice' | 'introduction' | 'respondedAt'
  >,
): Promise<JoiningConfirmation> {
  const res = await fetch(`${apiBase()}/api/joining-confirmations/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not save your response (${res.status})`);
  }
  return res.json();
}

/**
 * Upload the candidate's welcome photo. Multipart, same shape as
 * `uploadRequestDocument` in lib/api/doc-requests.ts -- the token in the URL is
 * the credential, and the server records the document and stamps its id onto
 * the confirmation.
 */
export async function uploadJoiningPhoto(
  token: string,
  file: File,
): Promise<{ documentId: string; fileName: string; size: number }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(
    `${apiBase()}/api/joining-confirmations/${encodeURIComponent(token)}/photo`,
    { method: 'POST', body: fd },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not upload your photo (${res.status})`);
  }
  return res.json();
}
