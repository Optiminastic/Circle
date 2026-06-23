'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X, ChevronDown, ShieldCheck, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/button';
import { parseScreeningPdf } from '@/lib/import-questions-pdf';
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
  'w-full rounded-lg border border-[#E4E6EA] bg-[#F1F3F5] px-3 py-2 text-sm text-gray-900 transition focus:border-accent-400 focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function ScreeningEditor({ bankId }: { bankId: string }) {
  const toast = useToast();
  const [banks, setBanks] = useState<ScreeningBank[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const setText = (bucket: Bucket, id: string, text: string) => mapItem(bucket, id, it => ({ ...it, text }));

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

  const toggleAllowOther = (bucket: Bucket, id: string) =>
    mapItem(bucket, id, it => ({ ...it, allowOther: !it.allowOther }));

  // Import questions from a screening PDF, routing each into the Must-have /
  // Good-to-have section it appears under. If the set already holds questions,
  // the latest PDF replaces them all (after confirmation). Each bucket keeps its
  // 5-question cap.
  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !bank) return;
    if (!/\.pdf$/i.test(file.name)) {
      toast.error('Please choose a PDF file.');
      return;
    }
    setImporting(true);
    try {
      const parsed = await parseScreeningPdf(file);
      if (parsed.total === 0) {
        toast.error(
          'No questions found. Make sure the PDF groups them under "Must-have" and "Good-to-have" headings.',
        );
        return;
      }
      // Each section keeps at most SCREENING_MAX questions.
      const mustTake = parsed.mustHave.slice(0, SCREENING_MAX);
      const goodTake = parsed.goodToHave.slice(0, SCREENING_MAX);
      const total = mustTake.length + goodTake.length;
      const dropped = parsed.total - total;
      const parts = [
        mustTake.length ? `Must-have ${mustTake.length}` : '',
        goodTake.length ? `Good-to-have ${goodTake.length}` : '',
      ].filter(Boolean);
      const existing = bank.mustHave.length + bank.goodToHave.length;
      toast.confirm({
        title: existing
          ? `Replace all ${existing} question${existing === 1 ? '' : 's'} with ${total} from this PDF?`
          : `Import ${total} question${total === 1 ? '' : 's'}${
              parsed.title ? ` from “${parsed.title}”` : ''
            }?`,
        description: `${existing ? 'Your current questions will be removed and replaced. ' : ''}Sorted into ${parts.join(
          ' · ',
        )}. Each section keeps at most ${SCREENING_MAX} questions; you can edit them afterwards.`,
        confirmLabel: existing ? 'Replace' : 'Import',
        onConfirm: () => {
          const stamp = Date.now();
          let n = 0;
          const toItems = (qs: typeof mustTake): ScreeningItem[] =>
            qs.map(q => ({ id: `SQ-${stamp}-${n++}`, text: q.text, options: q.options }));
          // Latest PDF wins — replace both sections.
          setBanks(prev =>
            prev.map(b =>
              b.id === bankId ? { ...b, mustHave: toItems(mustTake), goodToHave: toItems(goodTake) } : b,
            ),
          );
          toast.success(
            `${existing ? 'Replaced with' : 'Imported'} ${total} question${total === 1 ? '' : 's'}${
              dropped ? ` · ${dropped} skipped (section limit)` : ''
            }.`,
          );
        },
      });
    } catch (err) {
      console.error('Screening PDF import failed', err);
      toast.error('Could not read the PDF. Please try a different file.');
    } finally {
      setImporting(false);
    }
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {back}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <ShieldCheck size={18} />
          </span>
          <h2 className="font-display text-base font-bold tracking-tight text-gray-900">{bank.roleName}</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handlePdf}
            className="hidden"
          />
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            title="Import questions from a screening PDF (Must-have / Good-to-have)"
          >
            {importing ? <Loader2 className="animate-spin" /> : <FileUp />}
            {importing ? 'Reading PDF…' : 'Upload PDF'}
          </Button>
        </div>
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
          onToggleAllowOther={id => toggleAllowOther('mustHave', id)}
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
          onToggleAllowOther={id => toggleAllowOther('goodToHave', id)}
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
  onToggleAllowOther: (id: string) => void;
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
  onToggleAllowOther,
}: SectionProps) {
  const atMax = items.length >= SCREENING_MAX;
  return (
    <div className="overflow-hidden rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F1F3F5]"
      >
        <div>
          <p className="text-[13px] font-bold text-gray-900">{title}</p>
          <p className="text-[11px] text-gray-500">{hint}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
              atMax ? 'bg-amber-50 text-amber-700' : 'bg-[#F1F3F5] text-gray-600'
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
        <div className="space-y-3 border-t border-[#EDEEF1] px-4 py-3">
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
                  className="space-y-2.5 rounded-lg border border-[#E4E6EA] bg-[#F1F3F5]/50 p-3"
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
                        className="flex items-center gap-2 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-2.5 py-1.5"
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

                    <div className="flex flex-wrap items-center justify-between gap-2">
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

                      {/* Let applicants type their own answer via an "Other" choice. */}
                      <label
                        className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-gray-600 select-none"
                        title='Adds an "Other" choice on the apply page that reveals a free-text box'
                      >
                        <input
                          type="checkbox"
                          checked={!!it.allowOther}
                          onChange={() => onToggleAllowOther(it.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                        />
                        Allow “Other” (free text)
                      </label>
                    </div>
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
