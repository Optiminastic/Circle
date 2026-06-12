'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, BrainCircuit } from 'lucide-react';
import { IQ_QUESTIONS, type TestQuestion } from '@/data/test-banks';
import { useToast } from '@/components/Toaster';
import { QuestionCards } from '@/components/QuestionCards';
import { Button } from '@/components/ui/button';

const MAX_QUESTIONS = 50;
const STORAGE_KEY = 'curcle:iq-questions';

/** Deep-clone so edits never mutate the shared default bank. */
const clone = (qs: TestQuestion[]): TestQuestion[] =>
  qs.map(q => ({ ...q, options: [...q.options] as TestQuestion['options'] }));

/**
 * Google Forms-style editor for the IQ question bank: every question is shown
 * as an editable card with its four options, the correct one highlighted in the
 * brand accent. Edits/additions/deletions persist locally (no backend bank API).
 */
export function IqQuestionEditor() {
  const toast = useToast();
  const [questions, setQuestions] = useState<TestQuestion[]>(() => clone(IQ_QUESTIONS));
  const [loaded, setLoaded] = useState(false);

  // Load saved edits on mount (client only) so changes survive a reload.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TestQuestion[];
        if (Array.isArray(parsed) && parsed.length) setQuestions(parsed);
      }
    } catch {
      /* ignore malformed storage */
    }
    setLoaded(true);
  }, []);

  // Auto-persist after the initial load.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    } catch {
      /* ignore quota errors */
    }
  }, [questions, loaded]);

  const setQuestionText = (id: string, q: string) =>
    setQuestions(prev => prev.map(item => (item.id === id ? { ...item, q } : item)));

  const setOption = (id: string, idx: number, value: string) =>
    setQuestions(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const options = [...item.options] as TestQuestion['options'];
        options[idx] = value;
        return { ...item, options };
      }),
    );

  const setCorrect = (id: string, idx: number) =>
    setQuestions(prev => prev.map(item => (item.id === id ? { ...item, answer: idx } : item)));

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(item => item.id !== id));
    toast.info('Question removed.');
  };

  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      toast.error(`You can have at most ${MAX_QUESTIONS} questions.`);
      return;
    }
    const fresh: TestQuestion = {
      id: `IQ-${Date.now()}`,
      q: '',
      options: ['', '', '', ''],
      answer: 0,
    };
    setQuestions(prev => [...prev, fresh]);
  };

  const atMax = questions.length >= MAX_QUESTIONS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/question-library"
            aria-label="Back to Question Library"
            title="Back to Question Library"
            className="shrink-0 text-gray-500 transition hover:text-accent-600"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <BrainCircuit size={18} />
          </span>
          <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
            IQ Questions
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold ${
              atMax ? 'bg-amber-50 text-amber-700' : 'bg-[#ECE8E0] text-gray-600'
            }`}
          >
            {questions.length} / {MAX_QUESTIONS}
          </span>
          <Button
            size="sm"
            onClick={addQuestion}
            disabled={atMax}
            title={atMax ? `Maximum ${MAX_QUESTIONS} questions reached` : 'Add a new question'}
          >
            <Plus /> Add question
          </Button>
        </div>
      </div>

      {/* Questions list — centered, narrower column */}
      <QuestionCards
        questions={questions}
        max={MAX_QUESTIONS}
        onChangeQuestion={setQuestionText}
        onChangeOption={setOption}
        onSetCorrect={setCorrect}
        onRemove={removeQuestion}
        onAdd={addQuestion}
        EmptyIcon={BrainCircuit}
      />
    </div>
  );
}

export default IqQuestionEditor;
