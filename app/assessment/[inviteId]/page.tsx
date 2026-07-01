'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { QuizRunner } from '@/components/QuizRunner';
import { BRAND } from '@/lib/brand';
import { repositories } from '@/lib/api/repositories';
import { submitTest } from '@/lib/api/public-test';
import { ASSESSMENT_PASS_PERCENT } from '@/data/test-banks';
import { TestInvite } from '@/types';
import { AlertTriangle, CheckCircle2, Loader2, ClipboardList } from 'lucide-react';

type Phase = 'loading' | 'error' | 'ready' | 'submitting' | 'done' | 'already';

export default function AssessmentPage() {
  const params = useParams<{ inviteId: string }>();
  const inviteId = params?.inviteId ?? '';

  const [invite, setInvite] = useState<TestInvite | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);

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
      // Write-once submit via the dedicated public endpoint (server rejects a
      // resubmission and stamps completedAt itself).
      await submitTest(invite.id, {
        status: 'Graded',
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

  // Active assessment — the professional one-question-at-a-time runner (matches
  // the IQ test). No score is shown to the candidate.
  if ((phase === 'ready' || phase === 'submitting') && invite) {
    const items = questions.map((q, i) => ({ key: String(i), prompt: q.text, options: q.options }));
    const header = (
      <div className="sticky top-0 z-50 border-b border-[#E4E6EA] bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-2.5 lg:px-6">
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 text-white">
            <Logo size={15} />
          </span>
          <span className="truncate text-[13px] font-bold text-gray-900">
            {invite.position} Assessment
          </span>
        </div>
      </div>
    );
    return (
      <QuizRunner
        title={`${invite.position} Assessment`}
        subtitle={`Hi ${invite.candidateName} — answer each question, then submit.`}
        items={items}
        answers={answers as unknown as Record<string, number>}
        current={page}
        onPick={(key, idx) => setAnswers(a => ({ ...a, [Number(key)]: idx }))}
        onNavigate={i => setPage(Math.max(0, Math.min(questions.length - 1, i)))}
        onSubmit={submit}
        submitting={phase === 'submitting'}
        requireAll
        topBar={header}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F1F3F5]">
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

      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">{children}</div>
  );
}
