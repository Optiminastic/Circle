/**
 * Exit-handover portal client. The public, token-gated calls (used by the
 * employee-facing page) talk to the API directly — the unguessable, expiring
 * token in the URL is the credential, like the onboarding-docs portal. The HR
 * reveal/purge calls go through the JSON http client.
 */
import { apiBase } from '@/lib/api-base';
import { http } from '@/lib/http/client';

export interface HandoverDoc {
  documentId: string;
  fileName: string;
  uploadedAt: string;
  size: number;
}

export interface HandoverPortal {
  employeeName: string;
  lastWorkingDay: string;
  expiresAt: string;
  expired: boolean;
  credentialsSubmitted: boolean;
  documents: HandoverDoc[];
  status: string;
}

export interface ExtraCredential {
  key: string;
  value: string;
}

export interface HandoverReveal {
  workEmail: string;
  password: string;
  extras: ExtraCredential[];
  submittedAt: string | null;
  documents: HandoverDoc[];
  status: string;
}

const portalUrl = (token: string) => `${apiBase()}/api/exit-handovers/portal/${encodeURIComponent(token)}`;

/** Public: read the handover link's status (never returns credentials). */
export async function getHandoverPortal(token: string): Promise<HandoverPortal> {
  const res = await fetch(portalUrl(token), { cache: 'no-store' });
  if (!res.ok) throw new Error('This handover link is invalid or has been removed.');
  return res.json();
}

/** Public: submit work credentials. The password is encrypted server-side. */
export async function submitHandoverCredentials(
  token: string,
  workEmail: string,
  password: string,
  extras: ExtraCredential[] = [],
): Promise<void> {
  const res = await fetch(`${portalUrl(token)}/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workEmail, password, extras }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not submit credentials (${res.status})`);
  }
}

/** Public: upload one handover document/file. */
export async function uploadHandoverDocument(token: string, file: File): Promise<void> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${portalUrl(token)}/upload`, { method: 'POST', body: fd });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Upload failed (${res.status})`);
  }
}

/** HR: reveal the decrypted credentials + uploaded files for an employee. */
export function revealHandover(employeeId: string): Promise<HandoverReveal> {
  return http.get<HandoverReveal>(`/exit-handovers/${encodeURIComponent(employeeId)}/reveal`);
}

/** HR: purge the stored credentials once the handover is complete. */
export function purgeHandover(employeeId: string): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>(`/exit-handovers/${encodeURIComponent(employeeId)}/purge`, {});
}
