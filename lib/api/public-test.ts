/**
 * Public (no-login) candidate test actions. These go through dedicated
 * write-once server endpoints instead of a raw PATCH on the generic resource
 * API — so a finished attempt can't be resubmitted/overwritten and only the
 * known result fields are accepted. The invite token is the credential.
 */
import { http } from '@/lib/http/client';

export const startTest = (token: string) =>
  http.post(`/public/test/${encodeURIComponent(token)}/start`, {});

export const flagTestViolation = (token: string) =>
  http.post<{ violations: number }>(`/public/test/${encodeURIComponent(token)}/violation`, {});

/** Submit the attempt. `iqRecord` (IQ tests only) is persisted server-side and
 *  bound to the invite's candidate. Throws (409) if already submitted. */
export const submitTest = (
  token: string,
  result: Record<string, unknown>,
  iqRecord?: object,
) => http.post(`/public/test/${encodeURIComponent(token)}/submit`, { ...result, iqRecord });
