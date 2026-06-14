'use client';

import React from 'react';
import { Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export interface QuizItem {
  /** Stable key used to read/write the answer for this question. */
  key: string;
  prompt: string;
  options: string[];
}

/**
 * Shared, professional one-question-at-a-time runner used by both the IQ test and
 * the role assessment, so the two screens look identical and on-brand. It shows a
 * title + progress bar, the active question with full-width option rows, a
 * question navigator (answered / current / unanswered — never correctness), and a
 * Previous / Next / Submit pager. It deliberately shows **no score**.
 */
export function QuizRunner({
  title,
  subtitle,
  items,
  answers,
  current,
  onPick,
  onNavigate,
  onSubmit,
  submitting = false,
  requireAll = true,
  topBar,
}: {
  title: string;
  subtitle?: React.ReactNode;
  items: QuizItem[];
  /** Map of item key → selected option index. */
  answers: Record<string, number>;
  current: number;
  onPick: (key: string, optionIndex: number) => void;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
  submitting?: boolean;
  /** Require every question answered before Submit enables (assessment). */
  requireAll?: boolean;
  /** Optional sticky bar above the content (e.g. the IQ proctor bar). */
  topBar?: React.ReactNode;
}) {
  const total = items.length;
  const q = items[current];
  const answeredCount = items.filter(it => answers[it.key] !== undefined).length;
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;
  const isLast = current >= total - 1;
  const canSubmit = !submitting && (!requireAll || answeredCount === total);

  return (
    <div className="flex min-h-screen flex-col select-none bg-[#F6F7F9]">
      {topBar}

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-8 px-4 py-7 lg:px-6">
        {/* ---- Main: title, progress, question, options, pager ---- */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div>
            <div className="flex items-end justify-between gap-3">
              <h1 className="font-display text-xl font-bold tracking-tight text-gray-900">{title}</h1>
              <span className="font-mono text-xs font-semibold text-gray-400">{progress}%</span>
            </div>
            {subtitle && <p className="mt-1 text-[13px] text-gray-500">{subtitle}</p>}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E4E6EA]">
              <div
                className="h-full rounded-full bg-accent-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-8 flex-1">
            <p className="text-[15px] leading-relaxed text-gray-900">
              <span className="font-bold">
                Question {current + 1}/{total}:
              </span>{' '}
              {q?.prompt}
            </p>

            <div className="mt-5 space-y-2.5">
              {q?.options.map((opt, idx) => {
                const selected = answers[q.key] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onPick(q.key, idx)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                      selected
                        ? 'border-accent-500 bg-accent-50 font-medium text-accent-800 ring-1 ring-accent-500/20'
                        : 'border-transparent bg-[#F1F3F5] text-gray-700 hover:bg-[#EBEDEF]'
                    }`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                        selected ? 'bg-accent-600 text-white' : 'bg-white text-gray-500 ring-1 ring-[#E4E6EA]'
                      }`}
                    >
                      {selected ? <Check size={13} strokeWidth={3} /> : String.fromCharCode(65 + idx)}
                    </span>
                    <span className="min-w-0">{opt || '—'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-9 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate(current - 1)}
              disabled={current === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-[#F1F3F5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Previous
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Check size={15} /> Submit
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(current + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-700"
              >
                Next <ArrowRight size={15} />
              </button>
            )}
          </div>
        </main>

        {/* ---- Question navigator (answered / current / unanswered) ---- */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-7 space-y-1">
            <p className="mb-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {answeredCount}/{total} answered
            </p>
            {items.map((it, i) => {
              const isAnswered = answers[it.key] !== undefined;
              const isCurrent = i === current;
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => onNavigate(i)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition ${
                    isCurrent
                      ? 'bg-white font-semibold text-gray-900 shadow-2xs ring-1 ring-accent-300'
                      : isAnswered
                        ? 'text-gray-700 hover:bg-white'
                        : 'text-gray-400 hover:bg-white'
                  }`}
                >
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-full ${
                      isAnswered
                        ? 'bg-accent-600 text-white'
                        : isCurrent
                          ? 'ring-2 ring-accent-400'
                          : 'ring-1 ring-[#D7DAE0]'
                    }`}
                  >
                    {isAnswered && <Check size={10} strokeWidth={3} />}
                  </span>
                  Question {i + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default QuizRunner;
