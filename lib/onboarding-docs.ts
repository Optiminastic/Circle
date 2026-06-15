/**
 * Shared definition of the joining documents collected through the public
 * onboarding upload portal. Used by HR (when creating a request) and by the
 * candidate-facing portal so both agree on what's required.
 */
import { RequiredDocType } from '@/types';

export interface RequiredDocDef {
  type: RequiredDocType;
  label: string;
  hint: string;
}

export const REQUIRED_DOCS: RequiredDocDef[] = [
  { type: 'Aadhaar card', label: 'Aadhaar card', hint: 'Front & back, clearly readable' },
  { type: 'PAN card', label: 'PAN card', hint: 'A clear photo or scan' },
  { type: 'Address proof', label: 'Address proof', hint: 'Utility bill, rent agreement, etc.' },
  { type: 'Education certificates', label: 'Education certificates', hint: 'Highest qualification' },
  { type: 'Experience letter', label: 'Experience / relieving letter', hint: 'From your last employer' },
  { type: 'Cancelled cheque', label: 'Cancelled cheque', hint: 'Matching the bank details below' },
  { type: 'Passport photo', label: 'Passport-size photo', hint: 'Recent, plain background' },
];

export const REQUIRED_DOC_TYPES: string[] = REQUIRED_DOCS.map(d => d.type);

/**
 * A verified document is locked: HR has approved it, so the candidate can no
 * longer replace it and HR can no longer re-review it. Approval = lock.
 */
export const isSubmissionLocked = (sub?: { status?: string } | null): boolean =>
  sub?.status === 'Verified';

/** Link a candidate uses to reach their upload portal. */
export const docPortalPath = (token: string) => `/onboarding-docs/${token}`;

/** Hours a request link stays valid before it expires. */
export const DOC_REQUEST_TTL_HOURS = 24;
