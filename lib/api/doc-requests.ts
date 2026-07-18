/**
 * Public document-portal client. The upload is multipart (FormData), so like the
 * documents client it talks to the API directly rather than via the JSON
 * HttpClient. These calls are unauthenticated by design — the unguessable,
 * expiring token in the URL is the credential.
 */
import { DocRequest, DocSubmission, ReferenceContact } from '@/types';
import { apiBase } from '@/lib/api-base';

/** Fetch a request by its public token (used by the portal page). */
export async function getDocRequest(token: string): Promise<DocRequest> {
  const res = await fetch(`${apiBase()}/api/doc-requests/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('This upload link is invalid or has been removed.');
  return res.json();
}

/** Upload one document against a request. Server enforces token validity + 24h expiry. */
export async function uploadRequestDocument(params: {
  token: string;
  docType: string;
  file: File;
}): Promise<DocSubmission> {
  const fd = new FormData();
  fd.append('docType', params.docType);
  fd.append('file', params.file);
  const res = await fetch(
    `${apiBase()}/api/doc-requests/${encodeURIComponent(params.token)}/upload`,
    { method: 'POST', body: fd },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Upload failed (${res.status})`);
  }
  return res.json();
}

/** Save the candidate's bank details onto the request (PATCH the JSONB record). */
export async function saveDocRequestBankDetails(
  token: string,
  bankDetails: DocRequest['bankDetails'],
): Promise<DocRequest> {
  const res = await fetch(`${apiBase()}/api/doc-requests/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bankDetails }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not save bank details (${res.status})`);
  }
  return res.json();
}

/** Save the candidate's OnGrid consent onto the request. */
export async function saveDocRequestConsent(
  token: string,
  consent: { agreed: boolean; text: string; at: string },
): Promise<DocRequest> {
  const res = await fetch(`${apiBase()}/api/doc-requests/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not save consent (${res.status})`);
  }
  return res.json();
}

/** Save the candidate's past-employer references onto the request. */
export async function saveDocRequestReferences(
  token: string,
  references: ReferenceContact[],
): Promise<DocRequest> {
  const res = await fetch(`${apiBase()}/api/doc-requests/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ references }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not save references (${res.status})`);
  }
  return res.json();
}
