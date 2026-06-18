/**
 * Public careers API — the single, hardened endpoint a job applicant uses.
 *
 * Submits the resume + application together to `POST /api/public/apply`, which
 * validates everything server-side (strict schema, PDF check, rate limit) and
 * sets all trust-sensitive fields itself. The browser sends only the form data.
 */
import { apiBase } from '@/lib/api-base';

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
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait a minute and try again.');
    }
    // The endpoint returns { detail: "..." } for validation errors.
    let detail = `Submission failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON body */
    }
    throw new Error(detail);
  }
}
