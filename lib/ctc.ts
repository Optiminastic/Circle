import { CtcBreakdown } from '@/types';

/**
 * CTC breakdown maths. The employee's `annualCtc` is the locked total — the
 * Special Allowance is always derived as the balancer, so the CTC line in the
 * table reconciles exactly to the figure entered at employee creation.
 */

/** Parse a free-text CTC ("12 LPA", "1,80,000", "180000") into annual ₹. */
export function parseAnnualCtc(value?: string): number | null {
  if (!value) return null;
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return null;
  // "12 LPA" / "12 lakh" / "12L" → lakhs per annum; otherwise raw annual rupees.
  if (/lpa|lakh|\bl\b/i.test(value)) return Math.round(num * 100_000);
  return Math.round(num);
}

/** Sensible starting split: Basic 30%, HRA 15%, Special = remainder, PT ₹200/mo. */
export function defaultCtcBreakdown(annualCtc: number): CtcBreakdown {
  const monthly = annualCtc / 12;
  return {
    basic: Math.round(monthly * 0.3),
    hra: Math.round(monthly * 0.15),
    employerPf: 0,
    employeePf: 0,
    professionalTax: 200,
  };
}

export interface CtcRow {
  monthly: number;
  annual: number;
}

export interface CtcComputed {
  basic: CtcRow;
  hra: CtcRow;
  specialAllowance: CtcRow;
  gross: CtcRow;
  employerPf: CtcRow;
  ctc: CtcRow;
  employeePf: CtcRow;
  professionalTax: CtcRow;
  totalDeduction: CtcRow;
  netTakeHome: CtcRow;
}

const row = (annual: number): CtcRow => ({ annual, monthly: Math.round(annual / 12) });

/**
 * Compute every row from the stored monthly components, locking CTC-annual to
 * `annualCtc` (Special Allowance absorbs the remainder so it always matches).
 */
export function computeCtc(b: CtcBreakdown, annualCtc: number): CtcComputed {
  const basicA = Math.round(b.basic) * 12;
  const hraA = Math.round(b.hra) * 12;
  const employerPfA = Math.round(b.employerPf) * 12;
  const specialA = Math.max(0, annualCtc - basicA - hraA - employerPfA);
  const grossA = basicA + hraA + specialA;
  const ctcA = grossA + employerPfA; // === annualCtc whenever specialA >= 0
  const employeePfA = Math.round(b.employeePf) * 12;
  const professionalTaxA = Math.round(b.professionalTax) * 12;
  const totalDedA = employeePfA + professionalTaxA;
  const netA = grossA - totalDedA;
  return {
    basic: row(basicA),
    hra: row(hraA),
    specialAllowance: row(specialA),
    gross: row(grossA),
    employerPf: row(employerPfA),
    ctc: row(ctcA),
    employeePf: row(employeePfA),
    professionalTax: row(professionalTaxA),
    totalDeduction: row(totalDedA),
    netTakeHome: row(netA),
  };
}

/** True when the components over-allocate the CTC (Special Allowance would go negative). */
export function ctcOverAllocated(b: CtcBreakdown, annualCtc: number): boolean {
  return (Math.round(b.basic) + Math.round(b.hra) + Math.round(b.employerPf)) * 12 > annualCtc;
}

/** Indian-grouped rupee formatting (e.g. 1,80,000). */
export const fmtINR = (n: number): string => n.toLocaleString('en-IN');
