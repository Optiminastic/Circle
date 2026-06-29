'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
import type { TestQuestion } from '@/data/test-banks';
import { useToast } from '@/components/Toaster';
import { QuestionCards } from '@/components/QuestionCards';
import { Button } from '@/components/ui/button';
import { findCategory } from '@/lib/question-library';
import { parseAssessmentPdf } from '@/lib/import-questions-pdf';
import { useAssessmentBanks, useAssessmentBankMutations } from '@/features/question-banks/hooks';
import { blankQuestion, type BankCategory, type RoleQuestionBank } from '@/lib/question-banks';

interface RoleQuestionEditorProps {
  category: BankCategory;
  slug: string;
  bankId: string;
}

/**
 * IQ-style editor for a single role's Assessment / Interview question bank.
 * Loads the bank from local storage, edits its questions in place (capped at the
 * bank's maxQuestions), and persists every change.
 */
export function RoleQuestionEditor({ category, slug, bankId }: RoleQuestionEditorProps) {
  const toast = useToast();
  const router = useRouter();
  const meta = findCategory(slug);
  const Icon = meta?.Icon;

  const { data: serverBanks = [], isSuccess } = useAssessmentBanks();
  const { update, remove } = useAssessmentBankMutations();
  const [banks, setBanks] = useState<RoleQuestionBank[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Seed the local editing copy once from the backend (banks are stored in the
  // DB now, shared across devices — never localStorage).
  useEffect(() => {
    if (isSuccess && !loaded) {
      setBanks(serverBanks);
      setLoaded(true);
    }
  }, [isSuccess, serverBanks, loaded]);

  const bank = banks.find(b => b.id === bankId);

  // Debounced autosave of the edited bank to the backend.
  useEffect(() => {
    if (!loaded || !bank) return;
    const t = setTimeout(() => update.mutate(bank), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, loaded]);

  const patchQuestions = (fn: (qs: TestQuestion[]) => TestQuestion[]) =>
    setBanks(prev => prev.map(b => (b.id === bankId ? { ...b, questions: fn(b.questions) } : b)));

  const setQuestionText = (id: string, q: string) =>
    patchQuestions(qs => qs.map(item => (item.id === id ? { ...item, q } : item)));

  const setOption = (id: string, idx: number, value: string) =>
    patchQuestions(qs =>
      qs.map(item => {
        if (item.id !== id) return item;
        const options = [...item.options] as TestQuestion['options'];
        options[idx] = value;
        return { ...item, options };
      }),
    );

  const setCorrect = (id: string, idx: number) =>
    patchQuestions(qs => qs.map(item => (item.id === id ? { ...item, answer: idx } : item)));

  const removeQuestion = (id: string) => {
    patchQuestions(qs => qs.filter(item => item.id !== id));
    toast.info('Question removed.');
  };

  const addQuestion = () => {
    if (!bank) return;
    if (bank.questions.length >= bank.maxQuestions) {
      toast.error(`This bank is limited to ${bank.maxQuestions} questions.`);
      return;
    }
    patchQuestions(qs => [...qs, blankQuestion(`Q-${Date.now()}`)]);
  };

  // Import questions from an assessment PDF (parsed entirely in the browser).
  // If the bank already holds questions, the latest PDF replaces them all (after
  // confirmation). Imported questions stay editable like any other.
  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-selected later
    if (!file || !bank) return;
    if (!/\.pdf$/i.test(file.name)) {
      toast.error('Please choose a PDF file.');
      return;
    }
    setImporting(true);
    try {
      const parsed = await parseAssessmentPdf(file);
      if (parsed.questions.length === 0) {
        toast.error('No questions could be read from this PDF. Check the format and try again.');
        return;
      }
      const stamp = Date.now();
      const incoming = parsed.questions.map((q, i) => ({ ...q, id: `Q-${stamp}-${i}` }));
      const skippedNote = parsed.skipped.length
        ? ` ${parsed.skipped.length} incomplete question(s) were skipped.`
        : '';
      const existing = bank.questions.length;
      toast.confirm({
        title: existing
          ? `Replace all ${existing} question${existing === 1 ? '' : 's'} with ${incoming.length} from this PDF?`
          : `Import ${incoming.length} question${incoming.length === 1 ? '' : 's'}${
              parsed.title ? ` from “${parsed.title}”` : ''
            }?`,
        description: existing
          ? `Your current questions will be removed and replaced by this PDF's questions. You can edit them afterwards.${skippedNote}`
          : `They will be added to this bank and you can edit them afterwards.${skippedNote}`,
        confirmLabel: existing ? 'Replace' : 'Import',
        onConfirm: () => {
          setBanks(prev =>
            prev.map(b => {
              if (b.id !== bankId) return b;
              // Latest PDF wins — replace the whole set.
              const maxQuestions = Math.min(100, Math.max(b.maxQuestions, incoming.length));
              return { ...b, questions: incoming, maxQuestions };
            }),
          );
          toast.success(
            existing
              ? `Replaced with ${incoming.length} question${incoming.length === 1 ? '' : 's'}.`
              : `Imported ${incoming.length} question${incoming.length === 1 ? '' : 's'}.`,
          );
        },
      });
    } catch (err) {
      console.error('PDF import failed', err);
      toast.error('Could not read the PDF. Please try a different file.');
    } finally {
      setImporting(false);
    }
  };

  // Update the bank's question limit (clamped to current count..100).
  const updateMax = (value: string) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) return;
    setBanks(prev =>
      prev.map(b =>
        b.id === bankId ? { ...b, maxQuestions: Math.max(b.questions.length, Math.min(n, 100)) } : b,
      ),
    );
  };

  const deleteBank = () => {
    if (!bank) return;
    toast.confirm({
      title: `Delete the ${bank.jobTitle} bank?`,
      description: `This removes all ${bank.questions.length} ${category} question(s) for this role. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        remove.mutate(bankId);
        toast.success('Question bank deleted.');
        router.push(`/question-library/${slug}`);
      },
    });
  };

  const back = (
    <Link
      href={`/question-library/${slug}`}
      aria-label={`Back to ${meta?.title ?? 'questions'}`}
      title={`Back to ${meta?.title ?? 'questions'}`}
      className="shrink-0 text-gray-500 transition hover:text-accent-600"
    >
      <ArrowLeft size={18} />
    </Link>
  );

  if (loaded && !bank) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm font-semibold text-gray-700">This question bank could not be found.</p>
      </div>
    );
  }

  if (!bank) {
    return <div className="space-y-4">{back}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {back}
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <Icon size={18} />
            </span>
          )}
          <h2 className="font-display text-base font-bold tracking-tight text-gray-900">{bank.jobTitle}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-1.5 rounded-full bg-[#F1F3F5] px-3 py-1 font-mono text-[11px] font-semibold text-gray-600">
            <span>{bank.questions.length} /</span>
            <input
              type="number"
              min={bank.questions.length || 1}
              max={100}
              value={bank.maxQuestions}
              onChange={e => updateMax(e.target.value)}
              title="Question limit for this bank"
              className="w-12 rounded border border-[#E4E6EA] bg-white px-1.5 py-0.5 text-center font-mono text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </label>
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
            title="Import questions from an assessment PDF"
          >
            {importing ? <Loader2 className="animate-spin" /> : <FileUp />}
            {importing ? 'Reading PDF…' : 'Upload PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteBank}
            title="Delete this question bank"
            className="text-red-600 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 /> Delete bank
          </Button>
        </div>
      </div>

      {/* Questions list */}
      <QuestionCards
        questions={bank.questions}
        max={bank.maxQuestions}
        onChangeQuestion={setQuestionText}
        onChangeOption={setOption}
        onSetCorrect={setCorrect}
        onRemove={removeQuestion}
        onAdd={addQuestion}
        EmptyIcon={Icon ?? Plus}
      />
    </div>
  );
}

export default RoleQuestionEditor;
