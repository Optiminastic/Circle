/**
 * Public careers — shared application shape.
 *
 * The apply flow no longer calls the backend from the browser: every operation
 * (email check, OTP request/verify, submit) goes through the server actions in
 * `lib/actions/public.ts`, which reach the hardened `/api/public/*` endpoints
 * server-side with the internal token. This module only carries the input type.
 */
/**
 * Where the applicant heard about the role. A CLOSED set: the value lands on the
 * candidate's `sourceOfApplication`, an HR pipeline field, so the backend accepts
 * only these exact strings (see ApplicationIn.source in be/app/api/routes/public.py
 * — keep the two lists in step).
 */
export const APPLICATION_SOURCES = ['Job Posting', 'Careers', 'Referral', 'Other'] as const;

export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

/** The one source that requires naming a person. */
export const REFERRAL_SOURCE: ApplicationSource = 'Referral';

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
  gender?: string;
  currentCompany?: string;
  source: ApplicationSource;
  /** Who referred them — required when `source` is 'Referral', empty otherwise. */
  referredBy?: string;
  resumeUrl?: string;
  responses?: Record<string, string>;
}
