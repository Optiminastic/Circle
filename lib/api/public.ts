/**
 * Public careers — shared application shape.
 *
 * The apply flow no longer calls the backend from the browser: every operation
 * (email check, OTP request/verify, submit) goes through the server actions in
 * `lib/actions/public.ts`, which reach the hardened `/api/public/*` endpoints
 * server-side with the internal token. This module only carries the input type.
 */
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
