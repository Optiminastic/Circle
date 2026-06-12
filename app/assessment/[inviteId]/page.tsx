'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { repositories } from '@/lib/api/repositories';
import { ASSESSMENT_PASS_PERCENT } from '@/data/test-banks';
import { nowISO } from '@/lib/utils';
import { TestInvite } from '@/types';
import { AlertTriangle, CheckCircle2, Loader2, ClipboardList } from 'lucide-react';

type Phase = 'loading' | 'error' | 'ready' | 'submitting' | 'done' | 'already';

export default function AssessmentPage() {
  const params = useParams<{ inviteId: string }>();
  const inviteId = params?.inviteId ?? '';

  const [invite, setInvite] = useState<TestInvite | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!inviteId) return;
    repositories.testInvites
      .get(inviteId)
      .then(iv => {
        setInvite(iv);
        if (!iv.assessmentQuestions || iv.assessmentQuestions.length === 0) setPhase('error');
        else if (['Completed', 'Auto-Submitted', 'Graded'].includes(iv.status)) setPhase('already');
        else setPhase('ready');
      })
      .catch(() => setPhase('error'));
  }, [inviteId]);

  const questions = invite?.assessmentQuestions ?? [];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const submit = async () => {
    if (!invite || !allAnswered) return;
    setPhase('submitting');
    const total = questions.length;
    const correct = questions.reduce((n, q, i) => (answers[i] === q.answer ? n + 1 : n), 0);
    const score = Math.round((correct / total) * 100);
    const passed = score >= ASSESSMENT_PASS_PERCENT;
    const answerMap: Record<string, number> = {};
    questions.forEach((_, i) => {
      if (answers[i] != null) answerMap[String(i)] = answers[i];
    });
    try {
      await repositories.testInvites.patch(invite.id, {
        status: 'Graded',
        completedAt: nowISO(),
        correct,
        total,
        score,
        passed,
        answers: answerMap,
      });
      setPhase('done');
    } catch {
      setPhase('ready');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#ECE8E0]">
      <header className="flex items-center gap-2.5 px-5 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-sm">
          <Logo size={20} />
        </span>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900">{BRAND.name}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-gray-500">
            Assessment
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-24 text-gray-500">
            <Loader2 className="animate-spin text-accent-600" size={26} />
            <p className="text-sm">Loading your assessment…</p>
          </div>
        )}

        {phase === 'error' && (
          <Centered>
            <AlertTriangle className="text-amber-500" size={28} />
            <p className="font-semibold text-gray-800">This assessment link is not available</p>
            <p className="max-w-sm text-sm text-gray-500">
              The link may be incorrect or has no questions assigned. Please contact the hiring team.
            </p>
          </Centered>
        )}

        {phase === 'already' && (
          <Centered>
            <CheckCircle2 className="text-emerald-500" size={32} />
            <p className="font-bold text-gray-900">You&apos;ve already submitted this assessment</p>
            <p className="max-w-sm text-sm text-gray-500">
              Thanks — the hiring team has your responses.
            </p>
          </Centered>
        )}

        {phase === 'done' && (
          <Centered>
            <CheckCircle2 className="text-emerald-500" size={34} />
            <p className="text-lg font-bold text-gray-900">Assessment submitted!</p>
            <p className="max-w-sm text-sm text-gray-500">
              Thanks for completing the assessment{invite ? `, ${invite.candidateName}` : ''}. Our
              team will review your responses and be in touch.
            </p>
          </Centered>
        )}

        {(phase === 'ready' || phase === 'submitting') && invite && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#DAD4C8] bg-[#F7F4EE] p-5 shadow-2xs">
              <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-900">
                <ClipboardList size={18} className="text-accent-600" /> {invite.position} Assessment
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Hi {invite.candidateName} — answer all {questions.length} question
                {questions.length === 1 ? '' : 's'} below, then submit.
              </p>
            </div>

            <ol className="space-y-4">
              {questions.map((q, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-[#DAD4C8] bg-[#F7F4EE] p-5 shadow-2xs"
                >
                  <div className="flex gap-2.5">
                    <span className="font-mono text-[12px] font-bold text-accent-700">{i + 1}.</span>
                    <p className="text-sm font-semibold text-gray-900">{q.text}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, oi) => {
                      const active = answers[i] === oi;
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => setAnswers(a => ({ ...a, [i]: oi }))}
                          className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition ${
                            active
                              ? 'border-accent-500 bg-accent-50 text-accent-800'
                              : 'border-[#DAD4C8] bg-[#ECE8E0] text-gray-700 hover:border-accent-300'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                              active ? 'bg-accent-600 text-white' : 'bg-accent-50 text-accent-600'
                            }`}
                          >
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt || <span className="text-gray-400">—</span>}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex items-center justify-between gap-3 pb-8">
              <span className="text-[11px] text-gray-500">
                {answeredCount} / {questions.length} answered
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={!allAnswered || phase === 'submitting'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === 'submitting' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Submit assessment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">{children}</div>
  );
}
