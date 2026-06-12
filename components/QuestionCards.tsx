'use client';

import React from 'react';
import { Plus, Trash2, Check, type LucideIcon } from 'lucide-react';
import type { TestQuestion } from '@/data/test-banks';
import { Button } from '@/components/ui/button';

const inputCls =
  'w-full rounded-lg border border-[#DAD4C8] bg-[#ECE8E0] px-3 py-2 text-sm text-gray-900 transition focus:border-accent-400 focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

interface QuestionCardsProps {
  questions: TestQuestion[];
  max: number;
  onChangeQuestion: (id: string, q: string) => void;
  onChangeOption: (id: string, idx: number, value: string) => void;
  onSetCorrect: (id: string, idx: number) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  /** Icon shown in the empty state. */
  EmptyIcon: LucideIcon;
}

/**
 * Shared Google Forms-style editable list of MCQ question cards (question +
 * four options with the correct one highlighted in the brand accent). Used by
 * the IQ bank and every role-specific Assessment / Interview bank so the editing
 * UI is identical everywhere.
 */
export function QuestionCards({
  questions,
  max,
  onChangeQuestion,
  onChangeOption,
  onSetCorrect,
  onRemove,
  onAdd,
  EmptyIcon,
}: QuestionCardsProps) {
  const atMax = questions.length >= max;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {questions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#CFC8BA] bg-[#F7F4EE] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-500">
            <EmptyIcon size={26} />
          </span>
          <p className="text-sm font-bold text-gray-700">No questions yet</p>
          <Button size="sm" onClick={onAdd} className="mt-1">
            <Plus /> Add the first question
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((item, qi) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#DAD4C8] bg-[#F7F4EE] p-4 shadow-2xs"
            >
              {/* Card header: number + delete */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-md bg-accent-50 px-2 py-0.5 font-mono text-[11px] font-bold text-accent-700">
                  Q{qi + 1}
                </span>
                <button
                  onClick={() => onRemove(item.id)}
                  title="Delete this question"
                  aria-label="Delete question"
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Question text */}
              <textarea
                value={item.q}
                onChange={e => onChangeQuestion(item.id, e.target.value)}
                placeholder="Enter the question"
                rows={2}
                className={inputCls}
              />

              {/* Options */}
              <div className="mt-3 space-y-2">
                {item.options.map((opt, oi) => {
                  const correct = item.answer === oi;
                  return (
                    <div
                      key={oi}
                      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition ${
                        correct ? 'border-accent-500 bg-accent-50' : 'border-[#DAD4C8] bg-[#ECE8E0]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSetCorrect(item.id, oi)}
                        title="Mark as the correct answer"
                        aria-label="Mark as correct"
                        aria-pressed={correct}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          correct
                            ? 'border-accent-600 bg-accent-600 text-white'
                            : 'border-[#C7BFB0] text-transparent hover:border-accent-400'
                        }`}
                      >
                        <Check size={13} />
                      </button>
                      <input
                        value={opt}
                        onChange={e => onChangeOption(item.id, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                      />
                      {correct && (
                        <span className="shrink-0 rounded-full bg-accent-600 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bottom add */}
          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onAdd}
              disabled={atMax}
              title={atMax ? `Maximum ${max} questions reached` : 'Add a new question'}
            >
              <Plus /> Add question
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionCards;
