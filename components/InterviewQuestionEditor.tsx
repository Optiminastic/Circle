'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ChevronDown, CalendarDays, Star, Ban, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/button';
import { parseInterviewPdf } from '@/lib/import-questions-pdf';
import {
  blankInterviewItem,
  emptyInterviewModules,
  INTERVIEW_MODULES,
  type InterviewBank,
  type InterviewModule,
  type InterviewItem,
} from '@/lib/question-banks';
import { useInterviewBanks, useInterviewBankMutations } from '@/features/question-banks/hooks';

const SLUG = 'interview-questions';

const inputCls =
  'w-full rounded-lg border border-[#E4E6EA] bg-[#EDEEF1] px-3 py-2 text-sm text-gray-900 transition focus:border-accent-400 focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

/** Static preview of the 1–5 star scale plus the NA option each answer uses. */
function RatingScale() {
  return (
    <div className="flex items-center gap-1.5 text-gray-300">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className="fill-[#EDEEF1] text-[#C7CBD1]" />
      ))}
      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
        <Ban size={10} /> NA
      </span>
    </div>
  );
}

export function InterviewQuestionEditor({ bankId }: { bankId: string }) {
  const toast = useToast();
  const [banks, setBanks] = useState<InterviewBank[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Which modules are expanded (all open by default, FAQ-style).
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INTERVIEW_MODULES.map(m => [m, true])),
  );

  const { data: serverBanks = [], isSuccess } = useInterviewBanks();
  const { update } = useInterviewBankMutations();

  // Seed the local editing copy once from the backend (DB-backed, not localStorage).
  useEffect(() => {
    if (!isSuccess || loaded) return;
    setBanks(
      serverBanks.map(b => ({
        id: String(b.id),
        roleName: b.roleName ?? '',
        modules: { ...emptyInterviewModules(), ...(b.modules ?? {}) },
      })),
    );
    setLoaded(true);
  }, [isSuccess, serverBanks, loaded]);

  const bank = banks.find(b => b.id === bankId);

  // Debounced autosave of the edited set to the backend.
  useEffect(() => {
    if (!loaded || !bank) return;
    const t = setTimeout(() => update.mutate(bank), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, loaded]);

  const patch = (module: InterviewModule, fn: (items: InterviewItem[]) => InterviewItem[]) =>
    setBanks(prev =>
      prev.map(b =>
        b.id === bankId ? { ...b, modules: { ...b.modules, [module]: fn(b.modules[module]) } } : b,
      ),
    );

  const setText = (module: InterviewModule, id: string, text: string) =>
    patch(module, items => items.map(it => (it.id === id ? { ...it, text } : it)));

  const removeItem = (module: InterviewModule, id: string) =>
    patch(module, items => items.filter(it => it.id !== id));

  const addItem = (module: InterviewModule) =>
    patch(module, items => [...items, blankInterviewItem(`IVQ-${Date.now()}`)]);

  // Import questions from an interview PDF, routing each one into its competency
  // module so it shows under the matching section. If the set already holds
  // questions, the latest PDF replaces them all (after confirmation). Imported
  // questions stay editable like any other.
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
      const parsed = await parseInterviewPdf(file);
      if (parsed.total === 0) {
        toast.error(
          'No questions found under the five competency modules. Make sure the PDF groups them under Problem Solving / Technical / Communication / Cultural / Interpersonal headings.',
        );
        return;
      }
      const breakdown = INTERVIEW_MODULES.filter(m => parsed.byModule[m].length)
        .map(m => `${m} ${parsed.byModule[m].length}`)
        .join(' · ');
      const existing = INTERVIEW_MODULES.reduce((n, m) => n + (bank.modules[m]?.length ?? 0), 0);
      toast.confirm({
        title: existing
          ? `Replace all ${existing} question${existing === 1 ? '' : 's'} with ${parsed.total} from this PDF?`
          : `Import ${parsed.total} question${parsed.total === 1 ? '' : 's'}${
              parsed.title ? ` from “${parsed.title}”` : ''
            }?`,
        description: existing
          ? `Your current questions will be removed and replaced. Sorted into modules — ${breakdown}. You can edit them afterwards.`
          : `Sorted into modules — ${breakdown}. You can edit them afterwards.`,
        confirmLabel: existing ? 'Replace' : 'Import',
        onConfirm: () => {
          const stamp = Date.now();
          let n = 0;
          // Latest PDF wins — rebuild every module from scratch.
          const modules = emptyInterviewModules();
          for (const m of INTERVIEW_MODULES) {
            const items: InterviewItem[] = parsed.byModule[m].map(text => ({
              id: `IVQ-${stamp}-${n++}`,
              text,
            }));
            modules[m] = items;
          }
          setBanks(prev => prev.map(b => (b.id === bankId ? { ...b, modules } : b)));
          toast.success(
            existing
              ? `Replaced with ${parsed.total} question${parsed.total === 1 ? '' : 's'}.`
              : `Imported ${parsed.total} question${parsed.total === 1 ? '' : 's'}.`,
          );
        },
      });
    } catch (err) {
      console.error('Interview PDF import failed', err);
      toast.error('Could not read the PDF. Please try a different file.');
    } finally {
      setImporting(false);
    }
  };

  const back = (
    <Link
      href={`/question-library/${SLUG}`}
      aria-label="Back to Interview Questions"
      title="Back to Interview Questions"
      className="shrink-0 text-gray-500 transition hover:text-accent-600"
    >
      <ArrowLeft size={18} />
    </Link>
  );

  if (loaded && !bank) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm font-semibold text-gray-700">This interview set could not be found.</p>
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
            <CalendarDays size={18} />
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
            title="Import questions from an interview PDF, sorted into the five modules"
          >
            {importing ? <Loader2 className="animate-spin" /> : <FileUp />}
            {importing ? 'Reading PDF…' : 'Upload PDF'}
          </Button>
        </div>
      </div>

      <p className="mx-auto w-full max-w-3xl text-[11px] text-gray-500">
        Five competency modules. Add as many questions as you like in each — every question is rated 1–5 stars
        (or NA) by the interviewer.
      </p>

      {/* Five fixed module sections */}
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {INTERVIEW_MODULES.map(module => {
          const items = bank.modules[module] ?? [];
          const open = openModules[module] ?? true;
          return (
            <div
              key={module}
              className="overflow-hidden rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs"
            >
              {/* Header / toggle */}
              <button
                type="button"
                onClick={() => setOpenModules(o => ({ ...o, [module]: !open }))}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#EDEEF1]"
              >
                <p className="text-[13px] font-bold text-gray-900">{module}</p>
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full bg-[#EDEEF1] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                    {items.length}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Body */}
              {open && (
                <div className="space-y-2.5 border-t border-[#EDEEF1] px-4 py-3">
                  {items.length === 0 ? (
                    <p className="py-2 text-center text-[11px] text-gray-500">
                      No questions yet — add the first one below.
                    </p>
                  ) : (
                    items.map((it, i) => (
                      <div
                        key={it.id}
                        className="space-y-2 rounded-lg border border-[#E4E6EA] bg-[#F1F3F5] p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-2 w-5 shrink-0 text-right font-mono text-[11px] font-bold text-accent-700">
                            {i + 1}.
                          </span>
                          <textarea
                            value={it.text}
                            onChange={e => setText(module, it.id, e.target.value)}
                            placeholder="Enter the question"
                            rows={1}
                            className={inputCls}
                          />
                          <button
                            onClick={() => removeItem(module, it.id)}
                            title="Delete this question"
                            aria-label="Delete question"
                            className="mt-1 shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="pl-7">
                          <RatingScale />
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex justify-center pt-1">
                    <button
                      onClick={() => addItem(module)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E6EA] bg-[#FFFFFF] px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:bg-[#EDEEF1]"
                    >
                      <Plus size={14} /> Add question
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InterviewQuestionEditor;
