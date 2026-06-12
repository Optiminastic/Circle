import { Candidate, FitRating, ScreeningAnswer, ScreeningQuestion } from '@/types';

/** Good-to-have pass rate at/above which a candidate is rated Fit. */
export const FIT_THRESHOLD = 0.6;

/**
 * Auto-rate a candidate from their screening answers:
 *  - any MUST-have failed → Unfit
 *  - else good-to-have pass rate ≥ threshold → Fit, otherwise Borderline
 *  - no questions answered → Fit (nothing to screen against)
 */
export function computeFit(answers: ScreeningAnswer[]): FitRating {
  if (!answers.length) return 'Fit';
  const mustHaves = answers.filter(a => a.importance === 'Must Have');
  if (mustHaves.some(a => !a.passed)) return 'Unfit';

  const goodToHaves = answers.filter(a => a.importance === 'Good to Have');
  if (!goodToHaves.length) return 'Fit';
  const rate = goodToHaves.filter(a => a.passed).length / goodToHaves.length;
  return rate >= FIT_THRESHOLD ? 'Fit' : 'Borderline';
}

/**
 * Turn raw answers (keyed by question id) into scored ScreeningAnswers.
 *  - yes/no  → passes when the answer matches expectedAnswer
 *  - choice  → passes when the picked option equals expectedOption; if no
 *              expected option is defined (e.g. reused Question-Library sets),
 *              it is informational and always passes
 *  - text    → informational, always passes (HR reads it)
 */
export function buildAnswers(
  questions: ScreeningQuestion[],
  responses: Record<string, string>,
): ScreeningAnswer[] {
  return questions.map(q => {
    const type = q.type ?? 'yesno';
    const answer = responses[q.id] ?? '';
    let passed: boolean;
    if (type === 'yesno') passed = (answer === 'Yes') === Boolean(q.expectedAnswer);
    else if (type === 'choice') passed = q.expectedOption ? answer === q.expectedOption : true;
    else passed = true; // text — not auto-scored
    return {
      questionId: q.id,
      text: q.text,
      category: q.category,
      importance: q.importance,
      type,
      answer,
      passed,
    };
  });
}

/** The rating HR sees: their override if set, otherwise the computed one. */
export function effectiveFit(candidate: Candidate): FitRating | undefined {
  return candidate.fitRatingOverride ?? candidate.fitRating;
}

/** Tailwind classes for a fit badge. */
export function fitStyle(rating: FitRating): string {
  switch (rating) {
    case 'Fit':
      return 'bg-green-50 text-green-600';
    case 'Borderline':
      return 'bg-amber-50 text-amber-600';
    case 'Unfit':
      return 'bg-red-50 text-red-600';
  }
}
