/**
 * Shared definition of the joining documents collected through the public
 * onboarding upload portal. Used by HR (when creating a request) and by the
 * candidate-facing portal so both agree on what's required.
 *
 * HR picks the items per candidate; the chosen `type`s are stored on
 * DocRequest.requiredDocs and the portal renders a card for each. Most items are
 * file uploads (`kind: 'file'`); 'Bank details' and 'Reference contacts' are
 * forms instead.
 */
import { RequiredDocType } from '@/types';

/** How the portal collects the item. */
export type DocItemKind = 'file' | 'bank' | 'references';

export interface RequiredDocDef {
  type: RequiredDocType;
  label: string;
  hint: string;
  kind: DocItemKind;
  /** Ticked by default in the "Request documents" picker. */
  defaultSelected: boolean;
  /** Nice-to-have: the candidate may skip it without blocking completion. */
  optional?: boolean;
}

/** The non-file items, referenced by both the picker and the portal. */
export const BANK_DOC_TYPE: RequiredDocType = 'Bank details';
export const REFERENCES_DOC_TYPE: RequiredDocType = 'Reference contacts';

/** References the portal shows initially — the candidate can add more. */
export const REFERENCE_COUNT = 1;

export const REQUIRED_DOCS: RequiredDocDef[] = [
  { type: 'Aadhaar card', label: 'Aadhaar card', hint: 'Front & back, clearly readable', kind: 'file', defaultSelected: true },
  { type: 'PAN card', label: 'PAN card', hint: 'A clear photo or scan', kind: 'file', defaultSelected: true },
  { type: 'Address proof', label: 'Address proof', hint: 'Utility bill, rent agreement, etc.', kind: 'file', defaultSelected: true },
  { type: 'Education certificates', label: 'Education certificates', hint: 'Highest qualification', kind: 'file', defaultSelected: true },
  { type: 'Passport photo', label: 'Passport-size photo', hint: 'Recent, plain background', kind: 'file', defaultSelected: true },
  { type: BANK_DOC_TYPE, label: 'Bank details', hint: 'Account number & IFSC, for salary', kind: 'bank', defaultSelected: true },

  { type: 'Experience letter', label: 'Experience / relieving letter', hint: 'From your last employer', kind: 'file', defaultSelected: false },
  { type: 'Cancelled cheque', label: 'Cancelled cheque', hint: 'Matching your bank details', kind: 'file', defaultSelected: false },
  { type: 'Offer/appraisal letter', label: 'Current company offer / appraisal letter', hint: 'Most recent one', kind: 'file', defaultSelected: false },
  { type: 'Salary slips', label: 'Last 3 months salary slips', hint: 'From your current employer', kind: 'file', defaultSelected: false },
  { type: 'Resignation letter', label: 'Resignation letter / acceptance mail', hint: 'Proof of resignation', kind: 'file', defaultSelected: false },
  { type: 'Current offer letter', label: 'Current offer letter (if any)', hint: 'Any other offer in hand', kind: 'file', defaultSelected: false, optional: true },
  {
    type: REFERENCES_DOC_TYPE,
    label: 'Reference contacts from past org',
    hint: 'Organization name, email & contact number',
    kind: 'references',
    defaultSelected: false,
  },
];

/** Every item HR can request. */
export const REQUIRED_DOC_TYPES: string[] = REQUIRED_DOCS.map(d => d.type);

/** Ticked when the "Request documents" modal opens. */
export const DEFAULT_REQUIRED_DOC_TYPES: string[] = REQUIRED_DOCS.filter(d => d.defaultSelected).map(
  d => d.type,
);

export const docDefByType = (type: string): RequiredDocDef | undefined =>
  REQUIRED_DOCS.find(d => d.type === type);

/** Resolve stored `requiredDocs` to their definitions, in catalogue order. */
export const docDefsFor = (types: string[] | undefined): RequiredDocDef[] =>
  REQUIRED_DOCS.filter(d => (types ?? DEFAULT_REQUIRED_DOC_TYPES).includes(d.type));

/**
 * Only the file-upload items out of `requiredDocs` — the ones a DocSubmission
 * can satisfy. 'Bank details' / 'Reference contacts' are forms and never have a
 * submission, so completion checks must not expect one.
 */
export const fileDocTypes = (types: string[] | undefined): string[] =>
  docDefsFor(types)
    .filter(d => d.kind === 'file')
    .map(d => d.type);

/**
 * File items that MUST be submitted+verified for the request to be complete —
 * i.e. the file items minus the optional ones (e.g. "Current offer letter (if
 * any)"). Use this for completion/gating; use `fileDocTypes` for rendering the
 * upload cards (the optional item still appears, it just doesn't block).
 */
export const requiredFileDocTypes = (types: string[] | undefined): string[] =>
  docDefsFor(types)
    .filter(d => d.kind === 'file' && !d.optional)
    .map(d => d.type);

/** Did HR ask for bank details on this request? */
export const needsBank = (types: string[] | undefined): boolean =>
  (types ?? DEFAULT_REQUIRED_DOC_TYPES).includes(BANK_DOC_TYPE);

/** Did HR ask for past-employer references on this request? */
export const needsReferences = (types: string[] | undefined): boolean =>
  (types ?? DEFAULT_REQUIRED_DOC_TYPES).includes(REFERENCES_DOC_TYPE);

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

/**
 * Consent the candidate must give before we share their data/documents with
 * OnGrid for background verification. This exact wording is what OnGrid expects
 * as `consentText` — it must match their configured string verbatim (they reject
 * a mismatch), so do not reword it.
 */
export const ONGRID_CONSENT_TEXT =
  "The Individual does not and will not have any objection to Optiminastic sharing the Individual's personal information and/or documents, including but not limited to name, gender, date of birth, addresses, mobile number, email, education record, employment record, Aadhaar number, other government-issued IDs such as Voter ID, PAN card, driving license, etc. (collectively Proprietary Information) with OnGrid (Handy Online Solutions Private Limited) for the purpose of background checks and verification. The individual understands that OnGrid maintains Proprietary Information on its platform in a secure manner, and it will only be accessible Optiminastic it's associates/partners/affiliates, and will not be shared with any other individual or organization without the Individual's explicit consent.";
