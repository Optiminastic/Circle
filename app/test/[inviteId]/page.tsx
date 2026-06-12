'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { TestInvite, IQTest } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { nowISO, randomId } from '@/lib/utils';
import {
  TestQuestion,
  IQ_QUESTIONS,
  assessmentBankFor,
  iqScoreFromCorrect,
  IQ_PASS_SCORE,
  IQ_TOTAL_MARKS,
  ASSESSMENT_PASS_PERCENT,
} from '@/data/test-banks';
import {
  BrainCircuit,
  ClipboardList,
  Clock4,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Maximize2,
  EyeOff,
  Timer,
  ListChecks,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const MAX_VIOLATIONS = 3;
const PAGE_SIZE = 1; // one question per page

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const answersKey = (id: string) => `curcle.test.answers.${id}`;

function loadAnswers(id: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(answersKey(id));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function enterFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    /* browser may refuse — visibility tracking still applies */
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PublicTestPage() {
  const params = useParams<{ inviteId: string }>();
  const inviteId = params?.inviteId ?? '';

  const {
    data: invite,
    isLoading,
    isError,
  } = useQuery({
    queryKey: qk.testInvites.detail(inviteId),
    queryFn: () => repositories.testInvites.get(inviteId),
    enabled: Boolean(inviteId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-gray-500">
            <Loader2 size={28} className="animate-spin text-accent-600" />
            <p className="text-sm font-medium">Loading your test…</p>
          </div>
        </Card>
      </Shell>
    );
  }

  if (isError || !invite) {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-4 py-14 text-center px-6">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-500 ring-8 ring-red-50/40">
              <XCircle size={30} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Test link not found</h1>
              <p className="mt-1.5 text-sm text-gray-500 max-w-sm">
                This test link is invalid or has been removed. Please contact the HR team if you
                believe this is a mistake.
              </p>
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  return <TestFlow invite={invite} />;
}

/* ------------------------------------------------------------------ */
/*  Test flow (intro → running → result)                               */
/* ------------------------------------------------------------------ */

function TestFlow({ invite }: { invite: TestInvite }) {
  const isIq = invite.kind === 'iq';
  const questions: TestQuestion[] = useMemo(
    () => (isIq ? IQ_QUESTIONS : assessmentBankFor(invite.department, invite.position)),
    [isIq, invite.department, invite.position],
  );

  // The invite is the source of truth for completion + start time, so a
  // refresh (or reopening the link) can never reset the timer or allow a redo.
  const [phase, setPhase] = useState<'intro' | 'running' | 'submitting' | 'done'>(
    invite.status === 'Completed' || invite.status === 'Auto-Submitted' ? 'done' : 'intro',
  );
  const [startedAt, setStartedAt] = useState<string | null>(invite.startedAt ?? null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0); // current 10-question page
  const [violations, setViolations] = useState<number>(invite.violations ?? 0);
  const [remainingMs, setRemainingMs] = useState<number>(invite.durationMin * 60_000);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    autoSubmitted: boolean;
    disqualified: boolean;
  } | null>(
    invite.status === 'Completed' || invite.status === 'Auto-Submitted'
      ? {
          score: invite.score ?? 0,
          passed: invite.passed ?? false,
          autoSubmitted: invite.status === 'Auto-Submitted',
          disqualified: invite.disqualified ?? false,
        }
      : null,
  );

  const submittingRef = useRef(false);
  const violationsRef = useRef(violations);
  const answersRef = useRef(answers);
  const lastViolationAt = useRef(0);
  violationsRef.current = violations;
  answersRef.current = answers;

  /* ---------- resume an in-progress attempt after refresh ---------- */
  useEffect(() => {
    if (invite.status === 'In Progress' && invite.startedAt) {
      setAnswers(loadAnswers(invite.id));
      setStartedAt(invite.startedAt);
      setPhase('running');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------- start ----------------------------- */
  const start = async () => {
    const started = nowISO();
    setStartedAt(started);
    setPhase('running');
    await enterFullscreen();
    repositories.testInvites
      .patch(invite.id, { status: 'In Progress', startedAt: started })
      .catch(() => {/* tolerated — submit still records everything */});
  };

  /* ----------------------------- submit ---------------------------- */
  // reason: 'manual' (button) | 'timeout' (clock hit 0) | 'violation' (3 strikes).
  // A violation VOIDS the attempt — the score is not counted and the candidate
  // is not accepted, regardless of how many answers were correct.
  const submit = useCallback(
    async (reason: 'manual' | 'timeout' | 'violation') => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setPhase('submitting');

      const auto = reason !== 'manual';
      const disqualified = reason === 'violation';

      const finalAnswers = answersRef.current;
      const total = questions.length;
      const correct = questions.reduce(
        (acc, q) => acc + (finalAnswers[q.id] === q.answer ? 1 : 0),
        0,
      );
      const rawScore = isIq ? iqScoreFromCorrect(correct, total) : Math.round((correct / total) * 100);
      // Disqualified attempts are never a pass and carry no usable score.
      const score = disqualified ? 0 : rawScore;
      const passed = disqualified
        ? false
        : isIq
          ? rawScore >= IQ_PASS_SCORE
          : rawScore >= ASSESSMENT_PASS_PERCENT;
      const completedAt = nowISO();
      const timeTakenMin = startedAt
        ? Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000))
        : invite.durationMin;

      try {
        await repositories.testInvites.patch(invite.id, {
          status: auto ? 'Auto-Submitted' : 'Completed',
          completedAt,
          correct,
          total,
          score,
          passed,
          disqualified,
          violations: violationsRef.current,
          answers: finalAnswers, // per-question record for HR analysis
        });
      } catch {
        /* even if this PATCH fails we still show the result; HR records below */
      }

      // ---- side effects: HR records, candidate status, next-step emails ----
      try {
        if (isIq) {
          const iqRecord: IQTest = {
            id: randomId('IQT', 9000, 1000),
            candidateId: invite.candidateId,
            candidateName: invite.candidateName,
            appliedRole: invite.position,
            testDate: completedAt.split('T')[0],
            totalQuestions: total,
            questionsAttempted: Object.keys(finalAnswers).length,
            correctAnswers: correct,
            incorrectAnswers: total - correct,
            scorePercentage: Math.round((correct / total) * 100),
            timeTakenMinutes: timeTakenMin,
            qualificationStatus: passed ? 'Passed' : 'Failed',
            remarks: disqualified
              ? `Disqualified · ${violationsRef.current} rule violation(s) — attempt voided`
              : `IQ score ${score} · ${violationsRef.current} violation(s)${auto ? ' · auto-submitted' : ''}`,
          };
          await repositories.iqTests.create(iqRecord).catch(() => {});

          // A failed / disqualified attempt rejects the candidate (HR can re-assign).
          // No result email is sent — HR drives next steps manually.
          if (!passed) {
            repositories.candidates
              .patch(invite.candidateId, { status: 'Rejected' })
              .catch(() => {});
          }
        } else {
          // Assessment round — a failed attempt rejects the candidate (no email).
          if (!passed) {
            repositories.candidates
              .patch(invite.candidateId, { status: 'Rejected' })
              .catch(() => {});
          }
        }
      } finally {
        try {
          localStorage.removeItem(answersKey(invite.id));
        } catch {
          /* ignore */
        }
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setResult({ score, passed, autoSubmitted: auto, disqualified });
        setPhase('done');
      }
    },
    [invite, isIq, questions, startedAt],
  );

  /* ----------------------------- timer ----------------------------- */
  useEffect(() => {
    if (phase !== 'running' || !startedAt) return;
    const deadline = new Date(startedAt).getTime() + invite.durationMin * 60_000;
    const tick = () => {
      const left = deadline - Date.now();
      setRemainingMs(left);
      if (left <= 0) submit('timeout');
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [phase, startedAt, invite.durationMin, submit]);

  /* ------------------------- anti-cheat ---------------------------- */
  const flagViolation = useCallback(
    (label: string) => {
      // blur + visibilitychange often fire together for one tab switch —
      // collapse anything within 1.5s into a single violation.
      const now = Date.now();
      if (now - lastViolationAt.current < 1500) return;
      lastViolationAt.current = now;

      const next = violationsRef.current + 1;
      setViolations(next);
      repositories.testInvites.patch(invite.id, { violations: next }).catch(() => {});
      if (next >= MAX_VIOLATIONS) {
        setWarning(null);
        submit('violation');
      } else {
        setWarning(
          `${label} detected — warning ${next} of ${MAX_VIOLATIONS - 1}. One more and your test is disqualified.`,
        );
      }
    },
    [invite.id, submit],
  );

  useEffect(() => {
    if (phase !== 'running') return;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flagViolation('Tab switch');
    };
    const onBlur = () => flagViolation('Leaving the test window');
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) flagViolation('Exiting full screen');
    };
    const block = (e: Event) => e.preventDefault();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
    };
  }, [phase, flagViolation]);

  /* ------------------------ answer handling ------------------------ */
  const pick = (qid: string, idx: number) => {
    setAnswers(prev => {
      const next = { ...prev, [qid]: idx };
      try {
        localStorage.setItem(answersKey(invite.id), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const answered = Object.keys(answers).length;
  const lowTime = remainingMs <= 2 * 60_000;

  /* ------------------------------ UI ------------------------------- */

  if (phase === 'done' && result) {
    // A disqualified attempt is voided: no score, not accepted.
    if (result.disqualified) {
      return (
        <Shell>
          <Card>
            <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-red-50 text-red-500 ring-8 ring-red-50/50">
                <ShieldAlert size={34} />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Test disqualified</h1>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                  Your test was voided because the test rules were broken
                  {' '}({MAX_VIOLATIONS} window/tab-switch violations). No score is recorded and the
                  attempt cannot be accepted.
                </p>
              </div>
              <div className="w-full max-w-sm rounded-2xl border border-[#E2DCCF] bg-[#F7F8FA] px-5 py-3.5 text-sm text-gray-600">
                Our HR team has been notified — you&apos;ll receive an email about the outcome.
              </div>
            </div>
          </Card>
        </Shell>
      );
    }

    const passed = result.passed;
    const tone = passed
      ? { ring: 'ring-emerald-100', circle: 'border-emerald-200', text: 'text-emerald-600', soft: 'bg-emerald-50' }
      : { ring: 'ring-red-100', circle: 'border-red-200', text: 'text-red-500', soft: 'bg-red-50' };

    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-5 px-6 py-11 text-center">
            <span
              className={`grid h-16 w-16 place-items-center rounded-full ${tone.soft} ${tone.text} ring-8 ${tone.ring}`}
            >
              {passed ? <Sparkles size={30} /> : <XCircle size={30} />}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {passed ? 'Congratulations — you passed!' : 'Test submitted'}
              </h1>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">
                {result.autoSubmitted &&
                  'Your test was submitted automatically (time limit reached). '}
                Your responses have been recorded.
              </p>
            </div>

            {/* Score gauge */}
            <div
              className={`grid h-40 w-40 place-items-center rounded-full border-8 ${tone.circle} bg-white shadow-inner`}
            >
              <div className="leading-none">
                <p className={`text-5xl font-extrabold tabular-nums ${tone.text}`}>
                  {result.score}
                  {invite.kind === 'assessment' && <span className="text-2xl">%</span>}
                </p>
                <p className="mt-2 text-[11px] font-mono uppercase tracking-wider text-gray-400">
                  {invite.kind === 'iq' ? `out of ${IQ_TOTAL_MARKS}` : 'score'}
                </p>
              </div>
            </div>
            <p className="-mt-1 text-[12px] font-medium text-gray-500">
              {invite.kind === 'iq'
                ? `Qualifying score: ${IQ_PASS_SCORE} / ${IQ_TOTAL_MARKS}`
                : `Qualifying score: ${ASSESSMENT_PASS_PERCENT}% +`}
            </p>

            <div className="w-full max-w-sm rounded-2xl border border-[#E2DCCF] bg-[#F7F8FA] px-5 py-3.5 text-sm text-gray-600">
              {passed
                ? invite.kind === 'iq'
                  ? '📧 Check your email — your role assessment link is on its way.'
                  : '📧 Check your email — details about your in-person interview are on the way.'
                : 'Our HR team has been notified — you’ll receive an email about the outcome.'}
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  if (phase === 'submitting') {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-gray-500">
            <Loader2 size={28} className="animate-spin text-accent-600" />
            <p className="text-sm font-medium">Submitting your answers…</p>
          </div>
        </Card>
      </Shell>
    );
  }

  if (phase === 'intro') {
    return (
      <Shell>
        <Card>
          <div className="space-y-6 px-6 py-8 sm:px-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 text-accent-600 ring-1 ring-accent-200/60">
                {isIq ? <BrainCircuit size={24} /> : <ClipboardList size={24} />}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isIq ? 'IQ Test' : `${invite.position} Assessment`}
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  Hi <span className="font-semibold text-gray-700">{invite.candidateName}</span> —
                  you&apos;re about to start your{' '}
                  {isIq ? 'logical reasoning test' : 'role-specific assessment'}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: ListChecks, value: questions.length, label: 'Questions' },
                { icon: Timer, value: `${invite.durationMin} min`, label: 'Time limit' },
                {
                  icon: CheckCircle2,
                  value: isIq ? IQ_PASS_SCORE : `${ASSESSMENT_PASS_PERCENT}%`,
                  label: 'To qualify',
                },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#E2DCCF] bg-white/70 py-4 transition hover:border-accent-300"
                >
                  <Icon size={17} className="mx-auto text-accent-600" />
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-gray-900">{value}</p>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#E2DCCF] bg-[#F7F8FA] p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <ShieldAlert size={16} className="text-accent-600" /> Test rules — read carefully
              </p>
              <ul className="mt-3 space-y-2.5 text-[13px] text-gray-600">
                <li className="flex items-start gap-2.5">
                  <Maximize2 size={15} className="mt-0.5 shrink-0 text-accent-600" />
                  <span>The test runs in <strong>full screen</strong>. Exiting full screen is flagged.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <EyeOff size={15} className="mt-0.5 shrink-0 text-accent-600" />
                  <span>
                    <strong>Do not switch tabs or leave this window.</strong> Each switch is a
                    violation — after {MAX_VIOLATIONS} your test is{' '}
                    <strong>disqualified and not accepted</strong> (no score).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock4 size={15} className="mt-0.5 shrink-0 text-accent-600" />
                  <span>
                    The timer keeps running even if you refresh — your answers are preserved, the
                    clock is not paused.
                  </span>
                </li>
              </ul>
            </div>

            <button
              onClick={start}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent-600 to-accent-700 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:translate-y-px"
            >
              I understand — Start the test
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </Card>
      </Shell>
    );
  }

  /* --------------------------- running ----------------------------- */
  const progress = Math.round((answered / questions.length) * 100);
  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE;
  const pageQuestions = questions.slice(pageStart, pageStart + PAGE_SIZE);
  const isLastPage = page >= totalPages - 1;
  const goToPage = (next: number) => {
    setPage(Math.max(0, Math.min(totalPages - 1, next)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <div className="flex min-h-screen flex-col select-none bg-gradient-to-b from-[#F6F7F9] to-[#E4E6EA]">
      {/* Sticky proctor bar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-accent-700 to-accent-800 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15">
              <Logo size={16} />
            </span>
            <span className="truncate text-xs font-bold">
              {isIq ? 'IQ Test' : `${invite.position} Assessment`}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden text-[10px] font-mono text-white/70 sm:inline">
              {answered}/{questions.length}
            </span>
            {violations > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-200">
                <AlertTriangle size={11} /> {violations}/{MAX_VIOLATIONS}
              </span>
            )}
            <span
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-mono font-bold tabular-nums ${
                lowTime ? 'animate-pulse bg-white text-red-600' : 'bg-white/15 text-white'
              }`}
            >
              <Timer size={13} />
              {fmtClock(remainingMs)}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full bg-black/15">
          <div
            className="h-full bg-white/80 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Violation warning */}
      {warning && (
        <div className="sticky top-[53px] z-40 flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="font-semibold">{warning}</span>
            <button
              onClick={() => setWarning(null)}
              className="ml-auto font-bold text-red-400 hover:text-red-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content area — fills the space between the bar and the pager and
          vertically centres the single question. */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28">
        {/* Page heading */}
        <div className="pt-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
              Question {page + 1} <span className="text-gray-400">of {totalPages}</span>
            </p>
            <p className="text-[11px] font-medium text-gray-500">{answered} answered</p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E4E6EA]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-700 transition-all duration-300"
              style={{ width: `${((page + 1) / totalPages) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          {pageQuestions.map((q, idx) => {
            const i = pageStart + idx;
            const done = answers[q.id] !== undefined;
            return (
              <div
                key={q.id}
                className="w-full rounded-3xl border border-[#E2DCCF] bg-[#FBFAF7] p-6 shadow-[0_20px_50px_-24px_rgba(95,15,22,0.25)] sm:p-9"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold transition ${
                      done ? 'bg-accent-600 text-white' : 'bg-[#F1F3F5] text-gray-500'
                    }`}
                  >
                    {done ? <Check size={18} /> : i + 1}
                  </span>
                  <p className="pt-1 text-lg font-semibold leading-relaxed text-gray-900 sm:text-xl">
                    {q.q}
                  </p>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {q.options.map((opt, idx) => {
                    const selected = answers[q.id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => pick(q.id, idx)}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm transition cursor-pointer ${
                          selected
                            ? 'border-accent-500 bg-accent-50 font-semibold text-accent-800 ring-2 ring-accent-500/25'
                            : 'border-[#E2DCCF] text-gray-700 hover:border-accent-300 hover:bg-[#F7F8FA]'
                        }`}
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold transition ${
                            selected ? 'bg-accent-600 text-white' : 'bg-[#F1F3F5] text-gray-500'
                          }`}
                        >
                          {selected ? <Check size={15} /> : String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Pager / submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E2DCCF] bg-[#FBFAF7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[#E2DCCF] bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft size={15} /> Previous
          </button>

          <p className="hidden text-[11px] font-medium text-gray-500 sm:block">
            {answered}/{questions.length} answered
          </p>

          {isLastPage ? (
            <button
              onClick={() => submit('manual')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:translate-y-px cursor-pointer"
            >
              <Check size={16} /> Submit test
            </button>
          ) : (
            <button
              onClick={() => goToPage(page + 1)}
              className="group flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:translate-y-px cursor-pointer"
            >
              Next
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout shell for non-running states                                */
/* ------------------------------------------------------------------ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-[#F6F7F9] to-[#E4E6EA]">
      {/* Soft brand glows in the background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-accent-600/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent-800/10 blur-3xl"
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-sm">
            <Logo size={20} />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">{BRAND.name}</p>
            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-gray-500">
              Recruitment Test Portal
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="relative z-10 flex items-center justify-center gap-2 py-5 text-[11px] text-gray-500">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <Logo size={12} />
        </span>
        <span className="font-semibold">{BRAND.name}</span>
      </footer>
    </div>
  );
}

/** Elevated surface used by every non-running screen. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#E2DCCF] bg-[#FBFAF7] shadow-[0_20px_50px_-20px_rgba(95,15,22,0.25)]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent-400 via-accent-600 to-accent-800"
      />
      {children}
    </div>
  );
}
