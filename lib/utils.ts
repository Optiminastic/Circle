/** Small shared helpers used across services. */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names, resolving conflicts (used by shadcn/ui components). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const todayISO = (): string => new Date().toISOString().split('T')[0];

export const nowISO = (): string => new Date().toISOString();

/** Capitalise the first letter of a string (e.g. job titles), leaving the rest. */
export const capitalizeFirst = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export const randomId = (prefix: string, span = 900, base = 100): string =>
  `${prefix}-${Math.floor(base + Math.random() * span)}`;

/** Unguessable id for public links (e.g. test invites): PREFIX-XXXXXXXXXXXX. */
export const randomToken = (prefix: string): string =>
  `${prefix}-${(Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8)).toUpperCase()}`;

/** CTC is stored as a bare number string ("2", "2.3") — append "LPA" for
 *  display unless it's already there (some older/manual entries include it).
 *  Some candidates type the full annual figure in rupees (e.g. "500000")
 *  instead of LPA ("5") since the field is free text — no real LPA is ever
 *  >= 1000, so normalize anything that large down to LPA before displaying. */
export const formatCtc = (value: string | undefined): string => {
  const v = (value ?? '').trim();
  if (!v) return '—';
  const match = v.match(/[\d.]+/);
  if (!match) return /lpa/i.test(v) ? v : `${v} LPA`;
  let num = parseFloat(match[0]);
  if (!Number.isFinite(num)) return /lpa/i.test(v) ? v : `${v} LPA`;
  if (num >= 1000) num = num / 100000;
  const formatted = Number.isInteger(num) ? `${num}` : num.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${formatted} LPA`;
};
