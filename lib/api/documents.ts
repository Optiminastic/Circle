/**
 * Document storage client — multipart uploads need FormData (not the JSON
 * HttpClient), so these talk to the API directly but stay isolated here.
 *
 * These endpoints are HR-only (require a dashboard session), so every request
 * sends the httpOnly session cookie (`credentials: 'include'`), same as the
 * shared http client — otherwise the backend replies 401.
 */

import { apiBase } from '@/lib/api-base';
import { readErrorDetail } from '@/lib/http/error-detail';

export interface DocumentMeta {
  id: string;
  entityType: string;
  entityId: string;
  category: string;
  fileName: string;
  contentType?: string;
  size: number;
  storageKey: string;
  uploadedAt: string;
}

export async function listDocuments(entityType: string, entityId: string): Promise<DocumentMeta[]> {
  const qs = `entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`;
  const res = await fetch(`${apiBase()}/api/documents?${qs}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load documents');
  return res.json();
}

export async function uploadDocument(params: {
  entityType: string;
  entityId: string;
  category: string;
  file: File;
}): Promise<DocumentMeta> {
  const fd = new FormData();
  fd.append('entityType', params.entityType);
  fd.append('entityId', params.entityId);
  fd.append('category', params.category);
  fd.append('file', params.file);
  const res = await fetch(`${apiBase()}/api/documents`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait a minute and try again.');
    }
    throw new Error(await readErrorDetail(res, `Upload failed (${res.status})`));
  }
  return res.json();
}

export async function importDriveDocument(params: {
  entityType: string;
  entityId: string;
  category: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  accessToken: string;
}): Promise<DocumentMeta> {
  const res = await fetch(`${apiBase()}/api/documents/from-drive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, `Drive import failed (${res.status})`));
  }
  return res.json();
}

/** Direct URL that streams a document inline (opens in a tab, no download). */
export function documentPreviewUrl(id: string): string {
  return `${apiBase()}/api/documents/${id}/preview`;
}

/**
 * A short-lived link to the stored file.
 *
 * `download` asks the server to presign it as an attachment, which is what
 * makes a browser save the file instead of rendering it. Without it the link is
 * inline, and what happens then depends on the file type: a PDF opens in the
 * browser's own viewer (which has a download button) while an image is just
 * painted on the page (which has not).
 */
export async function getDocumentUrl(
  id: string,
  opts?: { download?: boolean },
): Promise<{ url: string; fileName: string }> {
  const query = opts?.download ? '?download=true' : '';
  const res = await fetch(`${apiBase()}/api/documents/${id}/url${query}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to get download link');
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api/documents/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) throw new Error('Delete failed');
}

/** Move a candidate's resume + joining documents into the employee's own S3
 *  folder/entity (called once, right after converting them into an employee). */
export async function promoteCandidateDocuments(
  candidateId: string,
  employeeId: string,
): Promise<{ migrated: number }> {
  const res = await fetch(
    `${apiBase()}/api/candidates/${candidateId}/promote-documents/${employeeId}`,
    { method: 'POST', credentials: 'include' },
  );
  if (!res.ok) throw new Error('Failed to move candidate documents to the employee record');
  return res.json();
}
