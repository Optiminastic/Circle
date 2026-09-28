/**
 * Public document-portal client. The upload is multipart (FormData), so like the
 * documents client it talks to the API directly rather than via the JSON
 * HttpClient. These calls are unauthenticated by design — the unguessable,
 * expiring token in the URL is the credential.
 *
 * The two HR calls at the bottom are the exception: they send the session cookie
 * and the server requires it, because the token alone must never be enough to
 * approve an identity document.
 */
import { DocExtraction, DocRequest, DocSubmission, ReferenceContact } from '@/types';
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

/** The candidate confirms the values read off their own document.
 *  Token-gated like the upload. Records a timestamp only - it cannot verify. */
export async function confirmSubmission(
  token: string,
  docType: string,
): Promise<DocSubmission> {
  const res = await fetch(
    `${apiBase()}/api/doc-requests/${encodeURIComponent(token)}/submissions/${encodeURIComponent(docType)}/confirm`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not confirm the details (${res.status})`);
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

// --- HR-only (session required) ----------------------------------------------

function submissionUrl(requestId: string, docType: string, action: string): string {
  return `${apiBase()}/api/doc-requests/${encodeURIComponent(requestId)}/submissions/${encodeURIComponent(docType)}/${action}`;
}

export interface ExtractResponse {
  ok: boolean;
  reason?: 'ocr_not_configured';
  extraction?: DocExtraction;
}

/** Read the uploaded document and pre-fill its values. Runs OCR server-side, so
 *  it can take a few seconds on first call. */
export async function extractSubmissionFields(
  requestId: string,
  docType: string,
): Promise<ExtractResponse> {
  const res = await fetch(submissionUrl(requestId, docType, 'extract'), {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not read the document (${res.status})`);
  }
  return res.json();
}

/** HR's decision on one document, plus any corrections to its extracted values.
 *  Correcting and approving are one call so values can't be approved unsaved. */
export async function reviewSubmission(params: {
  requestId: string;
  docType: string;
  status: 'Verified' | 'Rejected';
  reason?: string;
  fields?: Record<string, string>;
}): Promise<DocRequest> {
  const res = await fetch(submissionUrl(params.requestId, params.docType, 'review'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: params.status,
      reason: params.reason,
      fields: params.fields,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not save the review (${res.status})`);
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
