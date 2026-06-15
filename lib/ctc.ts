import { CtcBreakdown } from '@/types';

/**
 * CTC breakdown maths. Every component is editable; the CTC line is computed
 * from the components. The "Balance" action (in the card) snaps Special
 * Allowance so the CTC reconciles to the employee's `annualCtc`.
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
  const basic = Math.round(monthly * 0.3);
  const hra = Math.round(monthly * 0.15);
  return {
    basic,
    hra,
    specialAllowance: Math.max(0, Math.round(monthly) - basic - hra),
    employerPf: 0,
    employeePf: 0,
    professionalTax: 200,
  };
}

/** The monthly Special Allowance that makes the CTC reconcile to `annualCtc`. */
export function balancedSpecialAllowance(b: CtcBreakdown, annualCtc: number): number {
  return Math.max(
    0,
    Math.round(annualCtc / 12) - Math.round(b.basic) - Math.round(b.hra) - Math.round(b.employerPf),
  );
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

const monthlyRow = (monthly: number): CtcRow => ({ monthly, annual: monthly * 12 });

/** Compute every row from the editable monthly components (CTC = the sum). */
export function computeCtc(b: CtcBreakdown): CtcComputed {
  const basic = Math.round(b.basic);
  const hra = Math.round(b.hra);
  const special = Math.round(b.specialAllowance);
  const employerPf = Math.round(b.employerPf);
  const employeePf = Math.round(b.employeePf);
  const professionalTax = Math.round(b.professionalTax);

  const gross = basic + hra + special;
  const ctc = gross + employerPf;
  const totalDeduction = employeePf + professionalTax;
  const net = gross - totalDeduction;

  return {
    basic: monthlyRow(basic),
    hra: monthlyRow(hra),
    specialAllowance: monthlyRow(special),
    gross: monthlyRow(gross),
    employerPf: monthlyRow(employerPf),
    ctc: monthlyRow(ctc),
    employeePf: monthlyRow(employeePf),
    professionalTax: monthlyRow(professionalTax),
    totalDeduction: monthlyRow(totalDeduction),
    netTakeHome: monthlyRow(net),
  };
}

/** Signed annual gap between the computed CTC and the employee's annual CTC (0 = matches). */
export function ctcAnnualGap(b: CtcBreakdown, annualCtc: number): number {
  return computeCtc(b).ctc.annual - annualCtc;
}

/** Indian-grouped rupee formatting (e.g. 1,80,000). */
export const fmtINR = (n: number): string => n.toLocaleString('en-IN');
