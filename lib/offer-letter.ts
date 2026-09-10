/**
 * Offer-letter builder data + helpers. HR fills the editable values in a modal;
 * the letter is rendered from these values in components/OfferLetterPaged.tsx,
 * on the letterhead of the entity chosen at creation (see lib/letter-company.ts).
 *
 * HR enters only the Annual CTC; the whole breakup (Basic/HRA/PF/Special →
 * Gross → CTC → deductions → Net) is derived from it via Finance's Salary
 * Breakdown formula in computeBreakup().
 */
import { format, parse, isValid } from 'date-fns';
import type { Candidate, OfferLetterData } from '@/types';
import { DEFAULT_LETTER_COMPANY, letterBrand } from '@/lib/letter-company';

export type { OfferLetterData };

export const REQUIRED_DOCS = [
  'Proof of age (birth certificate / school leaving certificate / passport copy)',
  'Most recent educational qualification certificates (Degree Certificates / Marks Sheets)',
  'Release letter from the previous employer',
  'Resignation acceptance from current employer',
  'Offer Letter from current employer',
  'Last salary certificates / slips (3 Months)',
  'Passport size colour photograph (1 Copy)',
  'PAN card',
  'Aadhaar card',
];

export function formatJoining(value?: string): string {
  if (!value) return '[start date]';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d = parse(m[1], 'yyyy-MM-dd', new Date());
    if (isValid(d)) return format(d, 'do MMMM yyyy');
  }
  return value;
}

/**
 * PDF file base name for an offer letter: "Offer_Letter_Tushar_Suthar"
 * (candidate name title-cased, spaces → underscores, punctuation dropped).
 * Callers append ".pdf" (or set it as the print title, letting the browser add it).
 */
export function offerLetterFileBaseName(candidateName?: string): string {
  const name = (candidateName || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
  return `Offer_Letter_${name || 'Candidate'}`;
}

/** Indian-grouped number: 180000 -> "1,80,000". */
export function formatINRNumber(n: number): string {
  const num = Math.round(Number(n) || 0);
  const s = String(Math.abs(num));
  if (s.length <= 3) return (num < 0 ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + grouped + ',' + last3;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ` ${ONES[o]}` : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? `${ONES[h]} Hundred${r ? ' ' : ''}` : '') + (r ? twoDigits(r) : '');
}

/** Indian number to words: 180000 -> "One Lakh Eighty Thousand". */
export function numberToIndianWords(value: number): string {
  let n = Math.round(Number(value) || 0);
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export interface BreakupRow {
  label: string;
  monthly: number;
  annual: number;
  strong?: boolean;
  /** Rendered as the shaded "net take home" row. */
  highlight?: boolean;
  /** A blank spacer row (matches the sample). */
  spacer?: boolean;
  /** A section label row like "LESS". */
  section?: boolean;
}

/**
 * CTC breakup derived entirely from the Annual CTC, using Finance's
 * "Salary Breakdown" sheet formula (permanent employees):
 *   Basic   = CTC × 30% / 12          HRA = Basic / 2
 *   PF      = min(1800, Basic × 12%)  — only when `d.pfEnabled` (HR opt-in, off by default)
 *   Special = CTC/12 − Basic − HRA − PF   (balances the monthly CTC)
 *   Gross   = Basic + HRA + Special       CTC (A) = Gross + PF
 *   LESS: PF (= employer PF, when enabled) + Professional Tax (₹200/mo, ₹2,500/yr)
 *   Net (monthly) = Gross − Total Deduction;  Net (annual) = CTC − Total Deduction
 */
export function computeBreakup(d: OfferLetterData): BreakupRow[] {
  const annual = Math.max(0, Math.round(Number(d.ctcAnnual) || 0));
  const y = (m: number) => m * 12;
  const pfEnabled = Boolean(d.pfEnabled);

  const ctcM = Math.round(annual / 12);
  const basicM = Math.round((annual * 0.3) / 12);
  const hraM = Math.round(basicM / 2);
  const pfM = pfEnabled ? Math.min(1800, Math.round(basicM * 0.12)) : 0;
  const specialM = Math.max(0, ctcM - basicM - hraM - pfM);
  const grossM = basicM + hraM + specialM;

  const grossY = y(basicM) + y(hraM) + y(specialM);
  const pfY = y(pfM);
  const ctcY = grossY + pfY; // == annual CTC

  const ptM = 200;
  const ptY = 2500; // Maharashtra professional tax is ₹2,500/yr, not ₹200 × 12
  const totalDedM = pfM + ptM;
  const totalDedY = y(totalDedM);
  const netM = grossM - totalDedM;
  const netY = ctcY - totalDedY;

  const rows: BreakupRow[] = [
    { label: 'Basic', monthly: basicM, annual: y(basicM) },
    { label: 'HRA', monthly: hraM, annual: y(hraM) },
    { label: 'Special Allowance', monthly: specialM, annual: y(specialM) },
    { label: 'Gross Salary', monthly: grossM, annual: grossY, strong: true },
  ];
  if (pfEnabled) rows.push({ label: 'PF', monthly: pfM, annual: pfY });
  rows.push(
    { label: '', monthly: 0, annual: 0, spacer: true },
    { label: 'CTC (Cost to the Company) A', monthly: ctcM, annual: ctcY, strong: true },
    { label: 'LESS', monthly: 0, annual: 0, section: true },
  );
  if (pfEnabled) rows.push({ label: 'PF', monthly: pfM, annual: pfY });
  rows.push(
    { label: 'Professional Tax', monthly: ptM, annual: ptY },
    { label: 'Total Deduction', monthly: totalDedM, annual: totalDedY, strong: true },
    {
      label: 'Gross Salary - Total Deduction = Net Take Home',
      monthly: netM,
      annual: netY,
      highlight: true,
    },
  );
  return rows;
}

/** Marks where the (separately computed, never free-text) CTC breakdown table
 *  sits within the editable letter wording — see `renderOfferLetterBody()`. */
export const CTC_TABLE_MARKER = '[[CTC_TABLE]]';

/**
 * The full letter wording as one editable, markdown-lite string — every
 * paragraph, heading and list in the letter EXCEPT the CTC breakdown table
 * (which stays a real computed table; its position is the `CTC_TABLE_MARKER`
 * line). HR can freely rewrite this (see `OfferLetterData.customBody`); when
 * they don't, this is exactly what renders. Convention: blank line = new
 * block, `**text**` = bold, a line starting with "- " = a bullet list item,
 * a lone line starting with "# " = the centered title heading.
 */
export function renderOfferLetterBody(d: OfferLetterData): string {
  const { name: brandName, legalName: brandLegalName } = letterBrand(d.company);
  const name = `${d.salutation} ${d.candidateName}`.trim();

  return [
    '# OFFER LETTER',
    `**Dear ${name},**`,
    `With reference to your application and subsequent interview, we are pleased to offer you the position of **${d.role || '[role]'}** at **${brandName}**. You will be based out of our office in **${d.location || 'Mumbai'}**.`,
    `**1. Salary**\nWe offer you an **Annual Compensation (CTC) of INR ${formatINRNumber(d.ctcAnnual)}/-** (${numberToIndianWords(d.ctcAnnual)} only), the break-up of which is detailed below. This compensation is subject to deductions as per the Income Tax Act, 1961, and other applicable laws.`,
    'Further income tax will be deducted as applicable.',
    `**2. Date of Commencement**\nYour effective start date is **${formatJoining(d.joiningDate)}**. In case of any emergencies or issues preventing you from joining on this date, kindly inform the HR team at your earliest convenience.`,
    '**3. Documents to be Submitted**\nYou are requested to submit an e-copy of the following documents on your Date of Joining:',
    REQUIRED_DOCS.map(x => `- ${x}`).join('\n'),
    'This offer is valid subject to the verification of the aforementioned documents and the completion of joining formalities. Any discrepancies found during documentation or background verification may result in the withdrawal of this offer.',
    `**4. Probation Period**\nYou will be on probation for a period of **${d.probationPeriod || 'six months'}** from your date of joining. At the end of this period, your performance will be reviewed, and upon satisfactory evaluation, your employment will be confirmed.`,
    '**5. Appointment Letter**\nA detailed appointment letter outlining the full terms and conditions of your employment will be provided on the day of joining, after the completion of your onboarding formalities.',
    `We warmly welcome you to the ${brandName} family and look forward to having you with us.`,
    CTC_TABLE_MARKER,
    `**Medical Insurance**: Coverage for self up to INR ${formatINRNumber(d.medicalInsurance)} (after completion of your probation period)`,
    `In case you have any further clarifications, please contact (${d.hrEmail}).`,
    `Yours faithfully,\n**For ${brandLegalName}**\n**${d.signatoryName}**\n**${d.signatoryTitle}**`,
    `**I, ${d.candidateName || '[name]'}, confirm my acceptance of the offer and the terms and conditions mentioned herein.**`,
    '**Signature:**\n**Date: _______________**\n**Place: _______________**',
  ].join('\n\n');
}

/** The letter wording actually in effect: HR's edited text if they saved one,
 *  else the auto-generated default (always current with the form's fields). */
export function effectiveOfferLetterBody(d: OfferLetterData): string {
  return d.customBody?.trim() || renderOfferLetterBody(d);
}

export type { LetterBodyBlock } from './letter-body';
export { parseLetterBlocks } from './letter-body';

/** Splits the letter wording around the CTC table's fixed position. If HR
 *  deleted the marker, the whole text is treated as coming before the table
 *  (it still renders, just always at the end). */
export function splitAtCtcTableMarker(text: string): { before: string; after: string } {
  const idx = text.indexOf(CTC_TABLE_MARKER);
  if (idx === -1) return { before: text, after: '' };
  return { before: text.slice(0, idx), after: text.slice(idx + CTC_TABLE_MARKER.length) };
}

/** Defaults for a fresh offer letter, auto-filled from the candidate where possible. */
export function blankOfferLetter(
  candidate: Pick<Candidate, 'fullName' | 'appliedRole' | 'location'> | undefined,
  candidateName: string,
  nowIso: string,
  company: OfferLetterData['company'] = DEFAULT_LETTER_COMPANY,
): OfferLetterData {
  return {
    company,
    candidateName: candidate?.fullName || candidateName || '',
    salutation: 'Mr.',
    role: candidate?.appliedRole || '',
    location: 'Mumbai',
    ctcAnnual: 0,
    joiningDate: '',
    probationPeriod: 'six months',
    medicalInsurance: 300000,
    pfEnabled: false,
    basic: 0,
    hra: 0,
    specialAllowance: 0,
    pfEmployer: 0,
    pfEmployee: 0,
    professionalTax: 0,
    signatoryName: 'Sakshi Jain',
    signatoryTitle: 'CFO',
    hrEmail: 'hr@optiminastic.com',
    createdAt: nowIso,
  };
}
