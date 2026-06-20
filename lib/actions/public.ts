'use server';

/**
 * Server actions for the public job-application flow.
 *
 * The browser calls THESE (same-origin server actions) — it never touches the
 * FastAPI backend directly, so no `/api/public/*` endpoint shows up in the
 * Network tab and a copied cURL can't replay it (the backend rejects calls
 * without the internal token, which only this server holds). All validation,
 * OTP generation/verification and trust-sensitive fields stay on the backend.
 */
import { backendPost } from '@/lib/server/backend';
import type { ApplicationInput } from '@/lib/api/public';

/** Pull the backend's `detail` message off a non-OK response, else a fallback. */
async function detail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
  } catch {
    /* non-JSON body */
  }
  if (res.status === 429) return 'Too many requests. Please wait a minute and try again.';
  return fallback;
}

/** Whether this email already applied to this posting (one application per role). */
export async function checkAppliedAction(jobId: string, email: string): Promise<{ applied: boolean }> {
  try {
    const res = await backendPost('/api/public/check-applied', { json: { jobId, email } });
    if (!res.ok) return { applied: false };
    const body = await res.json();
    return { applied: Boolean(body?.applied) };
  } catch {
    // Don't block the applicant on a check failure — apply still enforces it.
    return { applied: false };
  }
}

/** Request a 4-digit email-verification code (sent by the backend). */
export async function requestOtpAction(
  email: string,
): Promise<{ ok: boolean; devCode?: string; error?: string }> {
  try {
    const res = await backendPost('/api/public/otp/request', { json: { email } });
    if (!res.ok) return { ok: false, error: await detail(res, 'Could not send the verification code.') };
    const body = await res.json().catch(() => ({}));
    // `devCode` is a backend dev-only convenience (no email transport); only ever
    // surfaced outside production, never in a real deployment.
    const devCode = process.env.NODE_ENV !== 'production' ? body?.devCode : undefined;
    return { ok: true, devCode };
  } catch {
    return { ok: false, error: 'Could not send the verification code.' };
  }
}

/** Verify the emailed code; on success the backend marks the email verified. */
export async function verifyOtpAction(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await backendPost('/api/public/otp/verify', { json: { email, code } });
    if (!res.ok) return { ok: false, error: await detail(res, 'Verification failed.') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Verification failed.' };
  }
}

/** Submit the application (resume + details) as one atomic, server-validated call. */
export async function submitApplicationAction(
  input: ApplicationInput,
  resume: File,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const form = new FormData();
    form.append('payload', JSON.stringify(input));
    form.append('resume', resume);
    const res = await backendPost('/api/public/apply', { form });
    if (!res.ok) {
      return { ok: false, error: await detail(res, 'Could not submit your application. Please try again.') };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not submit your application. Please try again.' };
  }
}
