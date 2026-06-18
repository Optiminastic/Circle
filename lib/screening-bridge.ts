/**
 * Bridge between the Screening Question Library (per-role Must-have /
 * Good-to-have sets, stored in localStorage) and a job posting's
 * `screeningQuestions`.
 *
 * - On job creation, manually-added screening questions are mirrored into the
 *   role's library set (`syncScreeningLibrary`).
 * - When applicants view a posting, the role's library set is the source of
 *   truth so later edits/additions in the library reflect on the apply page
 *   (`screeningQuestionsForRole`), falling back to the job's own snapshot when
 *   no library set exists for the role.
 */
import {
  loadScreeningBanks,
  saveScreeningBanks,
  normalizeScreeningItem,
  SCREENING_MAX,
  type ScreeningBank,
  type ScreeningItem,
} from '@/lib/question-banks';
import type { ScreeningQuestion, QuestionImportance } from '@/types';

let qSeq = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${qSeq++}`;

/**
 * A reusable library item becomes a choice question when it has 2+ options,
 * otherwise a short-text question. No expected option is set — library-sourced
 * questions are informational on the public form (see buildAnswers).
 */
export const itemToQuestion = (it: ScreeningItem, importance: QuestionImportance): ScreeningQuestion => {
  const options = it.options.map(o => o.trim()).filter(Boolean);
  const hasChoices = options.length >= 2;
  return {
    id: uid('Q'),
    text: it.text.trim(),
    category: 'Field',
    importance,
    type: hasChoices ? 'choice' : 'text',
    ...(hasChoices ? { options } : {}),
  };
};

/** Flatten a saved screening set into the job's screeningQuestions shape. */
export const bankToQuestions = (bank: ScreeningBank): ScreeningQuestion[] => [
  ...bank.mustHave.filter(it => it.text.trim()).map(it => itemToQuestion(it, 'Must Have')),
  ...bank.goodToHave.filter(it => it.text.trim()).map(it => itemToQuestion(it, 'Good to Have')),
];

// Reverse of itemToQuestion: turn a job's screening question into a library
// item. Yes/No → 2-option item; choice keeps its options; text starts blank.
const questionToItem = (q: ScreeningQuestion): ScreeningItem =>
  normalizeScreeningItem({
    id: uid('SQ-'),
    text: q.text.trim(),
    options: q.type === 'choice' && q.options ? q.options : q.type === 'yesno' ? ['Yes', 'No'] : [],
  });

const findIndexForRole = (banks: ScreeningBank[], roleName: string) =>
  banks.findIndex(b => b.roleName.trim().toLowerCase() === roleName.trim().toLowerCase());

/** The saved screening set for a role, if one exists (case-insensitive match). */
export const findScreeningBankForRole = (roleName: string): ScreeningBank | undefined => {
  const banks = loadScreeningBanks();
  const idx = findIndexForRole(banks, roleName);
  return idx >= 0 ? banks[idx] : undefined;
};

/**
 * Mirror a job's manually-added screening questions into the role's Must-have /
 * Good-to-have library set so HR can reuse and edit them later. An existing set
 * for the role is merged (deduped by question text); each bucket keeps the cap.
 */
export const syncScreeningLibrary = (roleName: string, questions: ScreeningQuestion[]) => {
  const must = questions.filter(q => q.importance === 'Must Have' && q.text.trim());
  const good = questions.filter(q => q.importance === 'Good to Have' && q.text.trim());
  if (!must.length && !good.length) return; // nothing manual to mirror

  const banks = loadScreeningBanks();
  const idx = findIndexForRole(banks, roleName);
  const base: ScreeningBank =
    idx >= 0
      ? banks[idx]
      : { id: `SCR-${Date.now()}`, roleName: roleName.trim(), mustHave: [], goodToHave: [] };

  const merge = (existing: ScreeningItem[], incoming: ScreeningQuestion[]): ScreeningItem[] => {
    const seen = new Set(existing.map(it => it.text.trim().toLowerCase()));
    const additions: ScreeningItem[] = [];
    for (const q of incoming) {
      const key = q.text.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      additions.push(questionToItem(q));
    }
    return [...existing, ...additions].slice(0, SCREENING_MAX);
  };

  const updated: ScreeningBank = {
    ...base,
    mustHave: merge(base.mustHave, must),
    goodToHave: merge(base.goodToHave, good),
  };
  const next = idx >= 0 ? banks.map((b, i) => (i === idx ? updated : b)) : [...banks, updated];
  saveScreeningBanks(next);
};

/**
 * Effective screening questions for a posting: the role's library set (so
 * library edits/additions reflect on the apply page) or the job's own snapshot
 * when no library set exists for that role.
 */
export function screeningQuestionsForRole(
  roleName: string,
  fallback: ScreeningQuestion[] = [],
): ScreeningQuestion[] {
  const bank = findScreeningBankForRole(roleName);
  if (!bank) return fallback;
  const qs = bankToQuestions(bank);
  return qs.length ? qs : fallback;
}
