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

/* ------------------------------------------------------- LPA input guards */

/**
 * CTC is captured in LPA, but the field is free text and candidates routinely
 * type the full annual rupee figure instead -- "35000" when they mean "3.5".
 * `parseCtcLpa` in lib/utils.ts rescues those after the fact by dividing
 * anything >= 1000 by 100000, but that is a guess applied to already-bad data:
 * "500" is genuinely ambiguous, and a wrong guess silently misprices someone.
 *
 * So constrain the input instead: at most two digits before the decimal point
 * and two after, capping the field at 99.99 LPA.
 */

/** Largest value the LPA inputs accept. */
export const CTC_MAX_LPA = 99.99;

const INT_DIGITS = 2;
const DECIMAL_DIGITS = 2;

/**
 * Constrain raw input to a valid LPA figure as the user types. Keeps digits and
 * a single decimal point, truncates to two digits either side, and leaves a
 * trailing "." alone so "3." is typable on the way to "3.45".
 */
export function clampCtcInput(raw: string): string {
  let s = (raw ?? '').replace(/[^\d.]/g, '');

  // Collapse extra dots into the first ("3.4.5" -> "3.45").
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }

  const [intPart = '', decPart] = s.split('.');
  const int = intPart.slice(0, INT_DIGITS);
  if (firstDot === -1) return int;
  return `${int}.${(decPart ?? '').slice(0, DECIMAL_DIGITS)}`;
}

/**
 * Validate an LPA value at submit time. Returns an error message, or null.
 * `clampCtcInput` stops most bad input at the keyboard, but values still arrive
 * by paste, autofill, or from a client that never used the input at all.
 */
export function ctcError(value: string, label: string): string | null {
  const v = String(value ?? '').trim();
  if (!v) return `Please enter your ${label}.`;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number in LPA (e.g. 3.45).`;
  if (n <= 0) return `${label} must be greater than zero.`;
  if (n > CTC_MAX_LPA) {
    return `${label} looks like a full annual salary. Enter it in LPA instead - ${CTC_MAX_LPA} is the maximum (e.g. 3.45).`;
  }
  return null;
}
