/**
 * The claims background verification checks, and the fields each one needs.
 *
 * Three checks verify something the candidate states rather than something read
 * off a document: the institute confirms the degree, the employer confirms the
 * employment, a field agent visits the address. A fourth, EHC, reads EPFO
 * records from a UAN.
 *
 * Two screens collect all of this - the candidate's own documents portal and
 * HR's "execute verification" dialog - so the definitions live here rather than
 * in either of them. A field OnGrid requires must not be mandatory on one
 * screen and absent from the other.
 *
 * Field names are the keys of `EducationRecord`, `EmploymentRecord` and
 * `PermanentAddress` in types.ts; the backend maps those to OnGrid's own names.
 */

import {
  EDUCATION_LEVELS,
  type EducationRecord,
  type EmploymentRecord,
  type PermanentAddress,
} from '@/types';

export type ClaimSection = 'uan' | 'education' | 'employment' | 'permanentAddress';

export type ClaimFieldKind = 'text' | 'email' | 'date' | 'digits' | 'select';

export interface ClaimField {
  key: string;
  label: string;
  /** Required by OnGrid - the check cannot start without it. */
  required?: boolean;
  kind?: ClaimFieldKind;
  placeholder?: string;
  /** For `kind: 'digits'` - caps the input and defines "complete". */
  digits?: number;
  options?: readonly { value: string; label: string }[];
}

export const UAN_DIGITS = 12;
export const PINCODE_DIGITS = 6;

const EDUCATION_FIELDS: ClaimField[] = [
  {
    key: 'level',
    label: 'Level of education',
    required: true,
    kind: 'select',
    options: EDUCATION_LEVELS,
  },
  { key: 'degree', label: 'Degree or course', required: true, placeholder: 'e.g. MA Economics' },
  {
    key: 'institute',
    label: 'Name of institute',
    required: true,
    placeholder: "e.g. St. Xavier's College",
  },
  {
    key: 'nameAsPerDocument',
    label: 'Name as printed on the certificate',
    required: true,
    placeholder: 'Exactly as it appears',
  },
  {
    key: 'registrationNumber',
    label: 'Registration or roll number',
    required: true,
    placeholder: 'As printed on the certificate',
  },
  { key: 'issueDate', label: 'Date of issue', required: true, kind: 'date' },
  {
    key: 'boardUniversity',
    label: 'Board or university',
    placeholder: 'e.g. University of Mumbai',
  },
  { key: 'yearOfPassing', label: 'Year of passing', kind: 'digits', digits: 4, placeholder: 'e.g. 2019' },
  { key: 'fieldOfStudy', label: 'Field of study', placeholder: 'e.g. Economics' },
  { key: 'grade', label: 'Grade or percentage', placeholder: 'e.g. First class' },
];

const EMPLOYMENT_FIELDS: ClaimField[] = [
  {
    key: 'employerName',
    label: 'Employer name',
    required: true,
    placeholder: 'e.g. Acme Technologies Pvt Ltd',
  },
  {
    key: 'nameAsPerEmployerRecords',
    label: 'Name on their records',
    required: true,
    placeholder: 'If different from the legal name',
  },
  { key: 'employeeId', label: 'Employee ID', placeholder: 'As on the payslip' },
  { key: 'designation', label: 'Last designation', placeholder: 'e.g. Senior Analyst' },
  { key: 'joiningDate', label: 'Joining date', kind: 'date' },
  { key: 'lastWorkingDate', label: 'Last working day', kind: 'date' },
  { key: 'city', label: 'Work location', placeholder: 'City worked in' },
  { key: 'managerName', label: "Reporting manager's name", placeholder: 'Who they reported to' },
  { key: 'managerEmail', label: "Manager's email", kind: 'email', placeholder: 'name@company.com' },
  { key: 'managerPhone', label: "Manager's phone", kind: 'digits', digits: 10, placeholder: '10 digits' },
  { key: 'hrName', label: "HR contact's name" },
  { key: 'hrEmail', label: 'HR email', kind: 'email', placeholder: 'hr@company.com' },
  { key: 'hrPhone', label: 'HR phone', kind: 'digits', digits: 10, placeholder: '10 digits' },
];

const ADDRESS_FIELDS: ClaimField[] = [
  {
    key: 'line1',
    label: 'House number and street',
    required: true,
    placeholder: 'e.g. 12, MG Road',
  },
  { key: 'city', label: 'Village, town or city', required: true, placeholder: 'e.g. Pune' },
  { key: 'state', label: 'State', required: true, placeholder: 'e.g. Maharashtra' },
  {
    key: 'pincode',
    label: 'Pincode',
    required: true,
    kind: 'digits',
    digits: PINCODE_DIGITS,
    placeholder: 'e.g. 411001',
  },
  { key: 'line2', label: 'Apartment, building or floor', placeholder: 'Optional' },
  { key: 'locality', label: 'Locality or area', placeholder: 'e.g. Andheri East' },
  { key: 'landmark', label: 'Landmark', placeholder: 'e.g. opposite the post office' },
  { key: 'district', label: 'District', placeholder: 'e.g. Pune' },
];

const UAN_FIELDS: ClaimField[] = [
  {
    key: 'uan',
    label: `UAN (${UAN_DIGITS} digits)`,
    required: true,
    kind: 'digits',
    digits: UAN_DIGITS,
    placeholder: 'Universal Account Number',
  },
];

export interface ClaimSectionDef {
  title: string;
  /** Why the check needs this, in the candidate's terms. */
  explains: string;
  fields: ClaimField[];
}

export const CLAIM_SECTIONS: Record<ClaimSection, ClaimSectionDef> = {
  uan: {
    title: 'EPFO account',
    explains:
      'The Universal Account Number, on a payslip or the EPFO member portal. Employment history is confirmed from EPFO records with it, without contacting past employers.',
    fields: UAN_FIELDS,
  },
  education: {
    title: 'Highest qualification',
    explains:
      'Checked with the institute directly, so these have to match the certificate exactly. The certificate itself is uploaded under Documents.',
    fields: EDUCATION_FIELDS,
  },
  employment: {
    title: 'Most recent past employer',
    explains:
      'Confirmed with that employer, so a working email matters more than a complete address. This check also needs a proof document - an experience letter, offer letter or salary slip - uploaded under Documents.',
    fields: EMPLOYMENT_FIELDS,
  },
  permanentAddress: {
    title: 'Permanent address',
    explains:
      'Where the candidate permanently lives, which may not be where they live now. Someone may visit it, so a landmark helps them find it.',
    fields: ADDRESS_FIELDS,
  },
};

/**
 * Which claims each check needs. PANV, CCRV and LAV are absent on purpose -
 * they need nothing typed, running off an uploaded document or OnGrid's own
 * profile. PRC is absent too: its referees are collected with the reference
 * contacts in the portal, not here.
 */
export const SECTIONS_FOR_CHECK: Record<string, ClaimSection[]> = {
  EHC: ['uan'],
  EDUV: ['education'],
  EMPV: ['employment'],
  PAV: ['permanentAddress'],
};

/**
 * Documents a check cannot run without, by our own document type.
 *
 * Separate from the claims above because HR cannot supply these by typing -
 * only the candidate can upload them. When one is missing the answer is to send
 * the documents link and wait, not to fill a form.
 *
 * `anyOf` means one of the listed types is enough: OnGrid wants a scanned proof
 * of employment and does not care which.
 */
export interface DocumentNeed {
  docTypes: string[];
  anyOf?: boolean;
}

export const DOCUMENTS_FOR_CHECK: Record<string, DocumentNeed> = {
  // OnGrid reads the PAN number off the card itself, so the card must be there.
  PANV: { docTypes: ['PAN card'] },
  EDUV: { docTypes: ['Education certificates'] },
  EMPV: {
    docTypes: ['Experience letter', 'Offer/appraisal letter', 'Salary slips'],
    anyOf: true,
  },
};

/** What the chosen checks need uploaded that isn't there yet. */
export function missingDocuments(
  codes: string[],
  uploaded: string[],
): { code: string; need: DocumentNeed }[] {
  const have = new Set(uploaded);
  return codes.flatMap(code => {
    const need = DOCUMENTS_FOR_CHECK[code];
    if (!need) return [];
    const satisfied = need.anyOf
      ? need.docTypes.some(t => have.has(t))
      : need.docTypes.every(t => have.has(t));
    return satisfied ? [] : [{ code, need }];
  });
}

/** "a PAN card" / "an experience letter, offer/appraisal letter or salary slip" */
export function describeNeed(need: DocumentNeed): string {
  const names = need.docTypes.map(t => t.toLowerCase());
  if (!need.anyOf) return names.join(' and ');
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** Every claim the chosen checks need, in a stable order and without repeats. */
export function sectionsFor(codes: string[]): ClaimSection[] {
  const order: ClaimSection[] = ['uan', 'education', 'employment', 'permanentAddress'];
  const needed = new Set(codes.flatMap(code => SECTIONS_FOR_CHECK[code] ?? []));
  return order.filter(section => needed.has(section));
}

/** The checks that asked for a given claim, for naming it in the UI. */
export function checksNeeding(section: ClaimSection, codes: string[]): string[] {
  return codes.filter(code => (SECTIONS_FOR_CHECK[code] ?? []).includes(section));
}

export type ClaimValue = Record<string, string | undefined>;

/**
 * A stored record as editable form values.
 *
 * `EducationRecord` and friends are precise types without index signatures,
 * which is what we want everywhere else - this is the one boundary where they
 * become a loose bag of strings for the inputs to bind to.
 */
export const toClaimValue = (record: object | undefined): ClaimValue =>
  Object.fromEntries(
    Object.entries(record ?? {}).map(([key, value]) => [key, value == null ? '' : String(value)]),
  );

/** Required fields with nothing in them. Empty means the check can start. */
export function missingFields(section: ClaimSection, value: ClaimValue | undefined): ClaimField[] {
  return CLAIM_SECTIONS[section].fields.filter(field => {
    if (!field.required) return false;
    const entry = String(value?.[field.key] ?? '').trim();
    if (!entry) return true;
    return field.kind === 'digits' && field.digits ? entry.length !== field.digits : false;
  });
}

export const isSectionComplete = (section: ClaimSection, value: ClaimValue | undefined): boolean =>
  missingFields(section, value).length === 0;

/** Strip a value to digits, for the numeric fields. */
export const digitsOnly = (value: string, max: number): string =>
  value.replace(/\D/g, '').slice(0, max);

/** What the two screens exchange: one object per claim. */
export interface ClaimDetails {
  uan?: string;
  education?: EducationRecord;
  employment?: EmploymentRecord;
  permanentAddress?: PermanentAddress;
}
