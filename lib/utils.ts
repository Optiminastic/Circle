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
