/**
 * Pure transforms bridging the Screening Question Library (per-role Must-have /
 * Good-to-have sets, stored in the backend) and a job posting's
 * `screeningQuestions`. No persistence lives here — callers read/write banks via
 * the question-bank hooks and pass the data in.
 *
 * On job creation, manual screening questions are mirrored into the role's
 * library set via `computeSyncedScreeningBank` (the caller upserts the result).
 * The public apply page reads the job's own `screeningQuestions` snapshot, so it
 * never has to fetch the library from the browser.
 */
import {
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
    // "Other" free-text only applies to choice questions.
    ...(hasChoices && it.allowOther ? { allowOther: true } : {}),
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
    allowOther: q.allowOther ?? false,
  });

const findIndexForRole = (banks: ScreeningBank[], roleName: string) =>
  banks.findIndex(b => b.roleName.trim().toLowerCase() === roleName.trim().toLowerCase());

/**
 * Compute the role's screening set after mirroring a job's manual screening
 * questions into it (deduped by text, capped per bucket). Returns the bank to
 * upsert plus whether it's new, or `null` when there's nothing manual to mirror.
 * Pure — the caller persists the result via the screening-bank mutations.
 */
export function computeSyncedScreeningBank(
  banks: ScreeningBank[],
  roleName: string,
  questions: ScreeningQuestion[],
): { bank: ScreeningBank; isNew: boolean } | null {
  const must = questions.filter(q => q.importance === 'Must Have' && q.text.trim());
  const good = questions.filter(q => q.importance === 'Good to Have' && q.text.trim());
  if (!must.length && !good.length) return null; // nothing manual to mirror

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

  const bank: ScreeningBank = {
    ...base,
    mustHave: merge(base.mustHave, must),
    goodToHave: merge(base.goodToHave, good),
  };
  return { bank, isNew: idx < 0 };
}
