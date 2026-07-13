/**
 * Offer-letter builder data + helpers. HR fills the editable values in a modal;
 * the fixed Optiminastic letter format (header/footer + section copy) is rendered
 * from these values in components/OfferLetterDocument.tsx.
 *
 * HR enters only the Annual CTC; the whole breakup (Basic/HRA/PF/Special →
 * Gross → CTC → deductions → Net) is derived from it via Finance's Salary
 * Breakdown formula in computeBreakup().
 */
import type { Candidate, OfferLetterData } from '@/types';

export type { OfferLetterData };

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
 *   PF      = min(1800, Basic × 12%)
 *   Special = CTC/12 − Basic − HRA − PF   (balances the monthly CTC)
 *   Gross   = Basic + HRA + Special       CTC (A) = Gross + PF
 *   LESS: PF (= employer PF) + Professional Tax (₹200/mo, ₹2,500/yr)
 *   Net (monthly) = Gross − Total Deduction;  Net (annual) = CTC − Total Deduction
 */
export function computeBreakup(d: OfferLetterData): BreakupRow[] {
  const annual = Math.max(0, Math.round(Number(d.ctcAnnual) || 0));
  const y = (m: number) => m * 12;

  const ctcM = Math.round(annual / 12);
  const basicM = Math.round((annual * 0.3) / 12);
  const hraM = Math.round(basicM / 2);
  const pfM = Math.min(1800, Math.round(basicM * 0.12));
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

  return [
    { label: 'Basic', monthly: basicM, annual: y(basicM) },
    { label: 'HRA', monthly: hraM, annual: y(hraM) },
    { label: 'Special Allowance', monthly: specialM, annual: y(specialM) },
    { label: 'Gross Salary', monthly: grossM, annual: grossY, strong: true },
    { label: 'PF', monthly: pfM, annual: pfY },
    { label: '', monthly: 0, annual: 0, spacer: true },
    { label: 'CTC (Cost to the Company) A', monthly: ctcM, annual: ctcY, strong: true },
    { label: 'LESS', monthly: 0, annual: 0, section: true },
    { label: 'PF', monthly: pfM, annual: pfY },
    { label: 'Professional Tax', monthly: ptM, annual: ptY },
    { label: 'Total Deduction', monthly: totalDedM, annual: totalDedY, strong: true },
    {
      label: 'Gross Salary - Total Deduction = Net Take Home',
      monthly: netM,
      annual: netY,
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
