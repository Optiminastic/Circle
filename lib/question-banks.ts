/**
 * Role-specific question banks for Assessment & Interview rounds.
 *
 * Each bank belongs to a job posting (role) and holds up to `maxQuestions`
 * questions in the same shape as the IQ bank. There is no backend bank API yet,
 * so banks persist per-browser in localStorage.
 */
import type { TestQuestion } from '@/data/test-banks';

export type BankCategory = 'assessment' | 'interview';

export interface RoleQuestionBank {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  maxQuestions: number;
  questions: TestQuestion[];
}

const STORAGE_KEY: Record<BankCategory, string> = {
  assessment: 'curcle:assessment-banks',
  interview: 'curcle:interview-banks',
};

export function loadBanks(category: BankCategory): RoleQuestionBank[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY[category]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RoleQuestionBank[]) : [];
  } catch {
    return [];
  }
}

export function saveBanks(category: BankCategory, banks: RoleQuestionBank[]): void {
  try {
    localStorage.setItem(STORAGE_KEY[category], JSON.stringify(banks));
  } catch {
    /* ignore quota / serialization errors */
  }
}

/** A blank MCQ question (4 empty options, first marked correct). */
export const blankQuestion = (id: string): TestQuestion => ({
  id,
  q: '',
  options: ['', '', '', ''],
  answer: 0,
});

// ---------------------------------------------------------------------------
// Screening banks — Must-have & Good-to-have questions, per role.
// Each role can have up to SCREENING_MAX questions in each importance bucket.
// ---------------------------------------------------------------------------

export const SCREENING_MAX = 5;
/** Each screening question must keep 2–4 options. */
export const SCREENING_MIN_OPTIONS = 2;
export const SCREENING_MAX_OPTIONS = 4;

export interface ScreeningItem {
  id: string;
  text: string;
  options: string[];
}

export interface ScreeningBank {
  id: string;
  /** Role name HR types in manually (not tied to a job posting). */
  roleName: string;
  mustHave: ScreeningItem[];
  goodToHave: ScreeningItem[];
}

const SCREENING_KEY = 'curcle:screening-banks';

export function loadScreeningBanks(): ScreeningBank[] {
  try {
    const raw = localStorage.getItem(SCREENING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScreeningBank[]) : [];
  } catch {
    return [];
  }
}

export function saveScreeningBanks(banks: ScreeningBank[]): void {
  try {
    localStorage.setItem(SCREENING_KEY, JSON.stringify(banks));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export const blankScreeningItem = (id: string): ScreeningItem => ({
  id,
  text: '',
  options: ['', ''],
});

/** Backfill older saved items (pre-options) so they always have 2–4 options. */
export const normalizeScreeningItem = (it: ScreeningItem): ScreeningItem => {
  const options = Array.isArray(it.options) ? [...it.options] : [];
  while (options.length < SCREENING_MIN_OPTIONS) options.push('');
  return { ...it, text: it.text ?? '', options: options.slice(0, SCREENING_MAX_OPTIONS) };
};
