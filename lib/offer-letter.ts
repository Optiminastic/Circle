/**
 * Offer-letter builder data + helpers. HR fills the editable values in a modal;
 * the fixed Optiminastic letter format (header/footer + section copy) is rendered
 * from these values in components/OfferLetterDocument.tsx.
 *
 * HR fills MONTHLY amounts for the breakup rows; annual = monthly × 12, and the
 * Gross / CTC / Total-deduction / Net-take-home rows are derived (matches the
 * sample letter's arithmetic).
 */
import type { Candidate, OfferLetterData } from '@/types';

export type { OfferLetterData };

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

/** Build the CTC breakup table rows (with derived totals) from the monthly inputs. */
export function computeBreakup(d: OfferLetterData): BreakupRow[] {
  const yr = (m: number) => Math.round(m) * 12;
  const grossM = (d.basic || 0) + (d.hra || 0) + (d.specialAllowance || 0);
  const ctcM = grossM + (d.pfEmployer || 0);
  const totalDedM = (d.pfEmployee || 0) + (d.professionalTax || 0);
  const netM = grossM - totalDedM;
  return [
    { label: 'Basic', monthly: d.basic || 0, annual: yr(d.basic || 0) },
    { label: 'HRA', monthly: d.hra || 0, annual: yr(d.hra || 0) },
    { label: 'Special Allowance', monthly: d.specialAllowance || 0, annual: yr(d.specialAllowance || 0) },
    { label: 'Gross Salary', monthly: grossM, annual: yr(grossM), strong: true },
    { label: 'PF', monthly: d.pfEmployer || 0, annual: yr(d.pfEmployer || 0) },
    { label: '', monthly: 0, annual: 0, spacer: true },
    { label: 'CTC (Cost to the Company) A', monthly: ctcM, annual: yr(ctcM), strong: true },
    { label: 'LESS', monthly: 0, annual: 0, section: true },
    { label: 'PF', monthly: d.pfEmployee || 0, annual: yr(d.pfEmployee || 0) },
    { label: 'Professional Tax', monthly: d.professionalTax || 0, annual: yr(d.professionalTax || 0) },
    { label: 'Total Deduction', monthly: totalDedM, annual: yr(totalDedM), strong: true },
    {
      label: 'Gross Salary - Total Deduction = Net Take Home',
      monthly: netM,
      annual: yr(netM),
      highlight: true,
    },
  ];
}

/** Defaults for a fresh offer letter, auto-filled from the candidate where possible. */
export function blankOfferLetter(
  candidate: Pick<Candidate, 'fullName' | 'appliedRole' | 'location'> | undefined,
  candidateName: string,
  nowIso: string,
): OfferLetterData {
  return {
    candidateName: candidate?.fullName || candidateName || '',
    salutation: 'Mr.',
    role: candidate?.appliedRole || '',
    location: 'Mumbai',
    ctcAnnual: 0,
    joiningDate: '',
    probationPeriod: 'six months',
    medicalInsurance: 300000,
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
