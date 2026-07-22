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

/** The single, shared IQ bank — one backend record (id = IQ_BANK_ID). */
export const IQ_BANK_ID = 'default';
export interface IqBank {
  id: string; // always IQ_BANK_ID
  questions: TestQuestion[];
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
  /** When true, applicants also get an "Other" choice that reveals a free-text
   *  input so they can type an answer not covered by the options. */
  allowOther?: boolean;
}

export interface ScreeningBank {
  id: string;
  /** Role name HR types in manually (not tied to a job posting). */
  roleName: string;
  mustHave: ScreeningItem[];
  goodToHave: ScreeningItem[];
}

export const blankScreeningItem = (id: string): ScreeningItem => ({
  id,
  text: '',
  options: ['', ''],
});

// ---------------------------------------------------------------------------
// Interview banks — per role, questions grouped into 5 fixed competency
// modules. Each question is rated 1–5 stars (or NA) by the interviewer.
// ---------------------------------------------------------------------------

export const INTERVIEW_MODULES = [
  'Problem Solving',
  'Technical',
  'Communication',
  'Cultural',
  'Interpersonal',
] as const;
export type InterviewModule = (typeof INTERVIEW_MODULES)[number];

export interface InterviewItem {
  id: string;
  text: string;
}

export interface InterviewBank {
  id: string;
  /** Role name HR types in manually. */
  roleName: string;
  modules: Record<InterviewModule, InterviewItem[]>;
}

/** A record of an interview kit sent to an interviewer manually from Settings.
 *  Independent of the candidate's interview pipeline — the interviewer's answers
 *  are written back onto this record (via the sheet token) and surfaced on the
 *  candidate's Physical Interview step. */
export interface InterviewKitSend {
  id: string;
  candidateId: string;
  candidateName: string;
  interviewerEmail: string;
  bankId: string;
  roleName: string;
  questionCount: number;
  questions: { text: string; module?: string }[];
  sheetToken: string;
  sheetUrl: string;
  sentAt: string;
  /** Filled once the interviewer submits their feedback via the sheet. */
  questionResponses?: unknown[];
  grading?: { recommendation?: string; interviewerComments?: string; summary?: string };
  status?: string;
}

export function emptyInterviewModules(): Record<InterviewModule, InterviewItem[]> {
  return {
    'Problem Solving': [],
    Technical: [],
    Communication: [],
    Cultural: [],
    Interpersonal: [],
  };
}

export const blankInterviewItem = (id: string): InterviewItem => ({ id, text: '' });

/** Backfill older saved items (pre-options) so they always have 2–4 options. */
export const normalizeScreeningItem = (it: ScreeningItem): ScreeningItem => {
  const options = Array.isArray(it.options) ? [...it.options] : [];
  while (options.length < SCREENING_MIN_OPTIONS) options.push('');
  return {
    ...it,
    text: it.text ?? '',
    options: options.slice(0, SCREENING_MAX_OPTIONS),
    allowOther: it.allowOther ?? false,
  };
};
