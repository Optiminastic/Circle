'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { TestQuestion } from '@/data/test-banks';
import { useToast } from '@/components/Toaster';
import { QuestionCards } from '@/components/QuestionCards';
import { Button } from '@/components/ui/button';
import { findCategory } from '@/lib/question-library';
import {
  loadBanks,
  saveBanks,
  blankQuestion,
  type BankCategory,
  type RoleQuestionBank,
} from '@/lib/question-banks';

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

  const [banks, setBanks] = useState<RoleQuestionBank[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBanks(loadBanks(category));
    setLoaded(true);
  }, [category]);

  // Persist after the initial load.
  useEffect(() => {
    if (loaded) saveBanks(category, banks);
  }, [banks, loaded, category]);

  const bank = banks.find(b => b.id === bankId);

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
        saveBanks(
          category,
          banks.filter(b => b.id !== bankId),
        );
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

  const atMax = bank.questions.length >= bank.maxQuestions;

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
          <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
            {bank.jobTitle}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-1.5 rounded-full bg-[#ECE8E0] px-3 py-1 font-mono text-[11px] font-semibold text-gray-600">
            <span>{bank.questions.length} /</span>
            <input
              type="number"
              min={bank.questions.length || 1}
              max={100}
              value={bank.maxQuestions}
              onChange={e => updateMax(e.target.value)}
              title="Question limit for this bank"
              className="w-12 rounded border border-[#DAD4C8] bg-white px-1.5 py-0.5 text-center font-mono text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </label>
          <Button
            size="sm"
            onClick={addQuestion}
            disabled={atMax}
            title={atMax ? `Maximum ${bank.maxQuestions} questions reached` : 'Add a new question'}
          >
            <Plus /> Add question
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
