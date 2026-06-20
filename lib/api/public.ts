/**
 * Public careers API — the single, hardened endpoint a job applicant uses.
 *
 * Submits the resume + application together to `POST /api/public/apply`, which
 * validates everything server-side (strict schema, PDF check, rate limit) and
 * sets all trust-sensitive fields itself. The browser sends only the form data.
 */
import { apiBase } from '@/lib/api-base';
import { http, ApiError } from '@/lib/http/client';

export interface ApplicationInput {
  jobId: string;
  fullName: string;
  email: string;
  phone: string; // 10 digits (server prefixes +91)
  currentDesignation: string;
  currentCtc: string;
  expectedCtc: string;
  totalExperienceYears: number;
  noticePeriodDays: number;
  linkedInUrl: string;
  coverNote: string;
  location?: string;
  currentCompany?: string;
  resumeUrl?: string;
  responses?: Record<string, string>;
}

export async function submitApplication(input: ApplicationInput, resume: File): Promise<void> {
  const fd = new FormData();
  fd.append('payload', JSON.stringify(input));
  fd.append('resume', resume);

  const res = await fetch(`${apiBase()}/api/public/apply`, { method: 'POST', body: fd });
  if (!res.ok) await throwApiError(res, 'Submission failed');
}

/** Turn a non-OK response into an Error carrying the server's `detail` message. */
async function throwApiError(res: Response, fallback: string): Promise<never> {
  if (res.status === 429) {
    throw new Error('Too many requests. Please wait a minute and try again.');
  }
  let detail = `${fallback} (${res.status})`;
  try {
    const body = await res.json();
    // Our handlers return a string `detail`; FastAPI's own 422 returns a list.
    if (typeof body?.detail === 'string') detail = body.detail;
  } catch {
    /* non-JSON body */
  }
  throw new Error(detail);
}

/**
 * Request a 4-digit email-verification code. Uses the same `http` client as the
 * (working) HR notification emails. Returns `devCode` only in local setups where
 * no email transport is configured (so the flow is testable).
 */
export async function requestEmailOtp(email: string): Promise<{ devCode?: string }> {
  try {
    return await http.post<{ devCode?: string }>('/public/otp/request', { email });
  } catch (e) {
    throw new Error(e instanceof ApiError ? e.detail : 'Could not send the verification code.');
  }
}

/** Verify the emailed code. Throws with the server's message if it fails. */
export async function verifyEmailOtp(email: string, code: string): Promise<void> {
  try {
    await http.post('/public/otp/verify', { email, code });
  } catch (e) {
    throw new Error(e instanceof ApiError ? e.detail : 'Verification failed.');
  }
}

/** Whether this email has already applied to this posting (one per role). */
export async function checkAlreadyApplied(jobId: string, email: string): Promise<boolean> {
  try {
    const res = await http.post<{ applied?: boolean }>('/public/check-applied', { jobId, email });
    return Boolean(res?.applied);
  } catch {
    // Don't block the applicant on a check failure — the apply endpoint still
    // enforces uniqueness server-side as the source of truth.
    return false;
  }
}
