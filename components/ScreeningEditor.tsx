'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X, ChevronDown, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/button';
import {
  loadScreeningBanks,
  saveScreeningBanks,
  blankScreeningItem,
  normalizeScreeningItem,
  SCREENING_MAX,
  SCREENING_MIN_OPTIONS,
  SCREENING_MAX_OPTIONS,
  type ScreeningBank,
  type ScreeningItem,
} from '@/lib/question-banks';

const SLUG = 'screening-questions';

/** One importance bucket — drives the two collapsible sections. */
type Bucket = 'mustHave' | 'goodToHave';

const inputCls =
  'w-full rounded-lg border border-[#DAD4C8] bg-[#ECE8E0] px-3 py-2 text-sm text-gray-900 transition focus:border-accent-400 focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function ScreeningEditor({ bankId }: { bankId: string }) {
  const toast = useToast();
  const [banks, setBanks] = useState<ScreeningBank[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Both sections start open (FAQ-style; click the header to collapse).
  const [openMust, setOpenMust] = useState(true);
  const [openGood, setOpenGood] = useState(true);

  useEffect(() => {
    const normalized = loadScreeningBanks().map(b => ({
      ...b,
      mustHave: b.mustHave.map(normalizeScreeningItem),
      goodToHave: b.goodToHave.map(normalizeScreeningItem),
    }));
    setBanks(normalized);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveScreeningBanks(banks);
  }, [banks, loaded]);

  const bank = banks.find(b => b.id === bankId);

  const patch = (bucket: Bucket, fn: (items: ScreeningItem[]) => ScreeningItem[]) =>
    setBanks(prev => prev.map(b => (b.id === bankId ? { ...b, [bucket]: fn(b[bucket]) } : b)));

  const mapItem = (bucket: Bucket, id: string, fn: (it: ScreeningItem) => ScreeningItem) =>
    patch(bucket, items => items.map(it => (it.id === id ? fn(it) : it)));

  const setText = (bucket: Bucket, id: string, text: string) =>
    mapItem(bucket, id, it => ({ ...it, text }));

  const removeQuestion = (bucket: Bucket, id: string) =>
    patch(bucket, items => items.filter(it => it.id !== id));

  const addQuestion = (bucket: Bucket) => {
    if (!bank) return;
    if (bank[bucket].length >= SCREENING_MAX) {
      toast.error(`You can add at most ${SCREENING_MAX} questions here.`);
      return;
    }
    patch(bucket, items => [...items, blankScreeningItem(`SQ-${Date.now()}`)]);
  };

  const setOption = (bucket: Bucket, id: string, idx: number, value: string) =>
    mapItem(bucket, id, it => ({
      ...it,
      options: it.options.map((o, i) => (i === idx ? value : o)),
    }));

  const addOption = (bucket: Bucket, id: string) => {
    const item = bank?.[bucket].find(it => it.id === id);
    if (item && item.options.length >= SCREENING_MAX_OPTIONS) {
      toast.error(`A question can have at most ${SCREENING_MAX_OPTIONS} options.`);
      return;
    }
    mapItem(bucket, id, it => ({ ...it, options: [...it.options, ''] }));
  };

  const removeOption = (bucket: Bucket, id: string, idx: number) => {
    const item = bank?.[bucket].find(it => it.id === id);
    if (item && item.options.length <= SCREENING_MIN_OPTIONS) {
      toast.error(`Each question must keep at least ${SCREENING_MIN_OPTIONS} options.`);
      return;
    }
    mapItem(bucket, id, it => ({ ...it, options: it.options.filter((_, i) => i !== idx) }));
  };

  const back = (
    <Link
      href={`/question-library/${SLUG}`}
      aria-label="Back to Screening Questions"
      title="Back to Screening Questions"
      className="shrink-0 text-gray-500 transition hover:text-accent-600"
    >
      <ArrowLeft size={18} />
    </Link>
  );

  if (loaded && !bank) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm font-semibold text-gray-700">This screening set could not be found.</p>
      </div>
    );
  }
  if (!bank) return <div className="space-y-4">{back}</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        {back}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <ShieldCheck size={18} />
        </span>
        <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
          {bank.roleName}
        </h2>
      </div>

      {/* Two collapsible sections */}
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Section
          title="Must-have questions"
          hint="Required qualifiers for this role"
          items={bank.mustHave}
          open={openMust}
          onToggle={() => setOpenMust(o => !o)}
          onChangeText={(id, text) => setText('mustHave', id, text)}
          onRemoveQuestion={id => removeQuestion('mustHave', id)}
          onAddQuestion={() => addQuestion('mustHave')}
          onChangeOption={(id, idx, v) => setOption('mustHave', id, idx, v)}
          onAddOption={id => addOption('mustHave', id)}
          onRemoveOption={(id, idx) => removeOption('mustHave', id, idx)}
        />
        <Section
          title="Good-to-have questions"
          hint="Nice-to-have preferences for this role"
          items={bank.goodToHave}
          open={openGood}
          onToggle={() => setOpenGood(o => !o)}
          onChangeText={(id, text) => setText('goodToHave', id, text)}
          onRemoveQuestion={id => removeQuestion('goodToHave', id)}
          onAddQuestion={() => addQuestion('goodToHave')}
          onChangeOption={(id, idx, v) => setOption('goodToHave', id, idx, v)}
          onAddOption={id => addOption('goodToHave', id)}
          onRemoveOption={(id, idx) => removeOption('goodToHave', id, idx)}
        />
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  hint: string;
  items: ScreeningItem[];
  open: boolean;
  onToggle: () => void;
  onChangeText: (id: string, text: string) => void;
  onRemoveQuestion: (id: string) => void;
  onAddQuestion: () => void;
  onChangeOption: (id: string, idx: number, value: string) => void;
  onAddOption: (id: string) => void;
  onRemoveOption: (id: string, idx: number) => void;
}

/** One FAQ-style collapsible importance bucket. */
function Section({
  title,
  hint,
  items,
  open,
  onToggle,
  onChangeText,
  onRemoveQuestion,
  onAddQuestion,
  onChangeOption,
  onAddOption,
  onRemoveOption,
}: SectionProps) {
  const atMax = items.length >= SCREENING_MAX;
  return (
    <div className="overflow-hidden rounded-xl border border-[#DAD4C8] bg-[#F7F4EE] shadow-2xs">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#ECE8E0]"
      >
        <div>
          <p className="text-[13px] font-bold text-gray-900">{title}</p>
          <p className="text-[11px] text-gray-500">{hint}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
              atMax ? 'bg-amber-50 text-amber-700' : 'bg-[#ECE8E0] text-gray-600'
            }`}
          >
            {items.length} / {SCREENING_MAX}
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="space-y-3 border-t border-[#E6E1D8] px-4 py-3">
          {items.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-gray-500">
              No questions yet — add the first one below.
            </p>
          ) : (
            items.map((it, i) => {
              const canRemoveOption = it.options.length > SCREENING_MIN_OPTIONS;
              const canAddOption = it.options.length < SCREENING_MAX_OPTIONS;
              return (
                <div
                  key={it.id}
                  className="space-y-2.5 rounded-lg border border-[#DAD4C8] bg-[#ECE8E0]/50 p-3"
                >
                  {/* Question row */}
                  <div className="flex items-start gap-2">
                    <span className="mt-2 w-5 shrink-0 text-right font-mono text-[11px] font-bold text-accent-700">
                      {i + 1}.
                    </span>
                    <textarea
                      value={it.text}
                      onChange={e => onChangeText(it.id, e.target.value)}
                      placeholder="Enter the question"
                      rows={1}
                      className={inputCls}
                    />
                    <button
                      onClick={() => onRemoveQuestion(it.id)}
                      title="Delete this question"
                      aria-label="Delete question"
                      className="mt-1 shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 pl-7">
                    {it.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className="flex items-center gap-2 rounded-lg border border-[#DAD4C8] bg-[#F7F4EE] px-2.5 py-1.5"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 font-mono text-[10px] font-bold text-accent-600">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <input
                          value={opt}
                          onChange={e => onChangeOption(it.id, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                        />
                        <button
                          onClick={() => onRemoveOption(it.id, oi)}
                          disabled={!canRemoveOption}
                          title={
                            canRemoveOption
                              ? 'Remove this option'
                              : `Keep at least ${SCREENING_MIN_OPTIONS} options`
                          }
                          aria-label="Remove option"
                          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onAddOption(it.id)}
                      disabled={!canAddOption}
                      title={canAddOption ? 'Add an option' : `Up to ${SCREENING_MAX_OPTIONS} options`}
                      className="text-accent-600 hover:text-accent-700"
                    >
                      <Plus /> Add option
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddQuestion}
              disabled={atMax}
              title={atMax ? `Maximum ${SCREENING_MAX} questions reached` : 'Add a question'}
            >
              <Plus /> Add question
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreeningEditor;
