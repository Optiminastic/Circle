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
import {
  DocExtraction,
  DocRequest,
  DocSubmission,
  EducationRecord,
  EmploymentRecord,
  PermanentAddress,
  ReferenceContact,
} from '@/types';
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
  fields?: Record<string, string>,
): Promise<DocSubmission> {
  const res = await fetch(
    `${apiBase()}/api/doc-requests/${encodeURIComponent(token)}/submissions/${encodeURIComponent(docType)}/confirm`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not confirm the details (${res.status})`);
  }
  return res.json();
}

/** Save the candidate's bank details onto the request (PATCH the JSONB record). */
export const saveDocRequestBankDetails = (
  token: string,
  bankDetails: DocRequest['bankDetails'],
): Promise<DocRequest> =>
  patchDocRequest(token, { bankDetails }, 'Could not save bank details');

/** Patch one of the candidate's own fields on their request.
 *
 *  The backend allowlists which keys an unauthenticated (token-only) PATCH may
 *  touch, so this cannot reach `submissions` or `status` however it is called.
 */
async function patchDocRequest(
  token: string,
  changes: Partial<DocRequest>,
  failure: string,
): Promise<DocRequest> {
  const res = await fetch(`${apiBase()}/api/doc-requests/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `${failure} (${res.status})`);
  }
  return res.json();
}

/** Save the candidate's EPFO UAN, used by OnGrid's employment history check. */
export const saveDocRequestUan = (token: string, uan: string): Promise<DocRequest> =>
  patchDocRequest(token, { uan }, 'Could not save your UAN');

/** Record that this is the candidate's first job, so the employment-history and
 *  past-employer sections stop being asked for. */
export const saveDocRequestIsFresher = (
  token: string,
  isFresher: boolean,
): Promise<DocRequest> =>
  patchDocRequest(token, { isFresher }, 'Could not save your answer');

/** Save the qualification that education verification will confirm. */
export const saveDocRequestEducation = (
  token: string,
  education: EducationRecord,
): Promise<DocRequest> =>
  patchDocRequest(token, { education }, 'Could not save your qualification details');

/** Save the past employment that employment verification will confirm. */
export const saveDocRequestEmployment = (
  token: string,
  employment: EmploymentRecord,
): Promise<DocRequest> =>
  patchDocRequest(token, { employment }, 'Could not save your employment details');

/** Save the permanent address that address verification will visit. */
export const saveDocRequestPermanentAddress = (
  token: string,
  permanentAddress: PermanentAddress,
): Promise<DocRequest> =>
  patchDocRequest(token, { permanentAddress }, 'Could not save your permanent address');

/** Save the candidate's OnGrid consent onto the request. */
export const saveDocRequestConsent = (
  token: string,
  consent: { agreed: boolean; text: string; at: string },
): Promise<DocRequest> => patchDocRequest(token, { consent }, 'Could not save consent');

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
export const saveDocRequestReferences = (
  token: string,
  references: ReferenceContact[],
): Promise<DocRequest> => patchDocRequest(token, { references }, 'Could not save references');
