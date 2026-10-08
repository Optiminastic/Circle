'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/Logo';
import { QuizRunner } from '@/components/QuizRunner';
import { BRAND } from '@/lib/brand';
import {
  getTest,
  startTest,
  flagTestViolation,
  submitTest,
  submitAssignmentFile,
  submitAssignmentLink,
  type PublicTest,
} from '@/lib/api/public-test';
import { documentPreviewUrl } from '@/lib/api/documents';
import { qk } from '@/lib/query/keys';
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
  FileUp,
  Download,
  File as FileIcon,
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

  // Reads the PROJECTED public endpoint — questions arrive without the answer
  // key (the generic invite read used to leak it straight to the browser).
  const {
    data: invite,
    isLoading,
    isError,
  } = useQuery({
    queryKey: qk.testInvites.detail(inviteId),
    queryFn: () => getTest(inviteId),
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
            <span className="grid h-16 w-16 place-items-center rounded-lg bg-red-50 text-red-500 ring-8 ring-red-50/40">
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

  // Take-home is a file submission, not an MCQ run — a separate flow entirely
  // (no proctoring/timer/questions), so it never touches TestFlow's logic.
  return invite.kind === 'take-home' ? <TakeHomeFlow invite={invite} /> : <TestFlow invite={invite} />;
}

/* ------------------------------------------------------------------ */
/*  Take-home flow (download brief → upload completed work)            */
/* ------------------------------------------------------------------ */

function TakeHomeFlow({ invite }: { invite: PublicTest }) {
  const alreadySubmitted = invite.status === 'Submitted' || invite.status === 'Graded';
  const [file, setFile] = useState<File | null>(null);
  // Work too large to upload here lives wherever HR's folder is; we record the
  // link to it rather than the bytes. One or the other, never both.
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadySubmitted);
  const [submittedName, setSubmittedName] = useState(invite.submissionFileName ?? '');
  const [remainingMs, setRemainingMs] = useState<number | null>(
    invite.deadlineIso ? new Date(invite.deadlineIso).getTime() - Date.now() : null,
  );

  useEffect(() => {
    if (!invite.deadlineIso || done) return;
    const deadline = new Date(invite.deadlineIso).getTime();
    const tick = () => setRemainingMs(deadline - Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [invite.deadlineIso, done]);

  const expired = remainingMs !== null && remainingMs <= 0 && !done;

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const pick = (f: File | null) => {
    setError(null);
    if (f && f.size > 15 * 1024 * 1024) {
      setError('File must be 15 MB or smaller.');
      return;
    }
    setFile(f);
  };

  const trimmedLink = link.trim();
  const canSubmit = Boolean(file) || trimmedLink.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // A file wins if somehow both are filled: it is the one we can keep.
      if (file) {
        const res = await submitAssignmentFile(invite.id, file);
        setSubmittedName(res.fileName);
      } else {
        await submitAssignmentLink(invite.id, trimmedLink);
        setSubmittedName(trimmedLink);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your work — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:px-8">
            <span className="grid h-16 w-16 place-items-center rounded-lg bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/40">
              <CheckCircle2 size={30} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Assignment submitted!</h1>
              <p className="mt-1.5 max-w-sm text-sm text-gray-500">
                Thanks{invite.candidateName ? `, ${invite.candidateName}` : ''} — we've received{' '}
                {submittedName ? <span className="font-semibold text-gray-700">{submittedName}</span> : 'your file'}
                . Our HR team will review it and get back to you.
              </p>
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:px-8">
            <span className="grid h-16 w-16 place-items-center rounded-lg bg-red-50 text-red-500 ring-8 ring-red-50/40">
              <Clock4 size={30} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Submission window closed</h1>
              <p className="mt-1.5 max-w-sm text-sm text-gray-500">
                The link to submit this assignment has expired. Please contact the HR team if you
                need more time.
              </p>
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <div className="space-y-6 px-6 py-8 sm:px-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent-50 to-accent-100 text-accent-600 ring-1 ring-accent-200/60">
              <ClipboardList size={24} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{invite.position || 'Your'} Assignment</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Hi <span className="font-semibold text-gray-700">{invite.candidateName}</span> — download
                the brief, complete the task, and upload your work before the deadline.
              </p>
            </div>
          </div>

          {remainingMs !== null && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-surface-muted py-3">
              <Timer size={15} className="text-accent-600" />
              <span className="font-mono text-lg font-bold tabular-nums text-gray-900">
                {fmtClock(Math.max(0, remainingMs))}
              </span>
              <span className="text-[11px] text-gray-500">left to submit</span>
            </div>
          )}

          {invite.briefDocId && (
            <a
              href={documentPreviewUrl(invite.briefDocId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-line bg-surface/70 px-4 py-3 transition hover:border-accent-300"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent-50 text-accent-600">
                <Download size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">Download the assignment</p>
                <p className="truncate text-[11px] text-gray-500">
                  {invite.briefFileName || 'assignment file'}
                </p>
              </div>
            </a>
          )}

          <div>
            <p className="mb-2 text-sm font-bold text-gray-900">Upload your completed work</p>
            <div
              onDragOver={e => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
                dragging ? 'border-accent-400 bg-accent-50/40' : 'border-line hover:border-accent-300'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                onChange={e => pick(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <FileIcon size={22} className="text-accent-600" />
                  <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                  <p className="text-[11px] text-gray-500">Click to choose a different file</p>
                </>
              ) : (
                <>
                  <FileUp size={22} className="text-accent-500" />
                  <p className="text-sm font-semibold text-gray-700">Click or drag a file here</p>
                  <p className="text-[11px] text-gray-500">Word, Excel, PowerPoint, PDF or ZIP — up to 15 MB</p>
                </>
              )}
            </div>
          </div>

          {/* Anything bigger than the uploader takes - a video answer runs to
              several hundred MB. It goes to the folder HR opened, and we keep
              the link rather than the file. */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                or send a link
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
            {invite.driveUploadUrl && (
              <a
                href={invite.driveUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-accent-200 bg-accent-50/60 px-3 py-2.5 text-[12px] font-semibold text-accent-700 transition hover:bg-accent-50"
              >
                <FileUp size={14} className="shrink-0" />
                Upload your video here, then paste the link below
              </a>
            )}
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              aria-label="Link to your submitted work"
              className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
            <p className="text-[11px] text-gray-500">
              For a video or anything over 15 MB. Make sure the link is viewable by anyone with
              it, or we will not be able to open your work.
            </p>
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Submit assignment
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </Card>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Test flow (intro → running → result)                               */
/* ------------------------------------------------------------------ */

function TestFlow({ invite }: { invite: PublicTest }) {
  const isIq = invite.kind === 'iq';
  // Questions come from the server WITHOUT the answer key — the browser has no
  // way to know (or assert) which option is correct.
  type RunnerQuestion = { id: string; q: string; options: string[] };
  const questions: RunnerQuestion[] = useMemo(
    () => invite.questions.map(q => ({ id: q.key, q: q.text, options: q.options })),
    [invite.questions],
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
    const started = new Date().toISOString();
    setStartedAt(started);
    setPhase('running');
    await enterFullscreen();
    startTest(invite.id).catch(() => {/* tolerated — submit still records everything */});
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
      const finalAnswers = answersRef.current;
      const timeTakenMin = startedAt
        ? Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000))
        : invite.durationMin;

      // We send ONLY the chosen options. The server grades against its own copy
      // of the answer key and returns the outcome — the browser never computes
      // (or asserts) a score, so a tampered request can't manufacture a pass.
      let graded: { score: number; passed: boolean; disqualified: boolean } = {
        score: 0,
        passed: false,
        disqualified: reason === 'violation',
      };
      try {
        const res = await submitTest(invite.id, finalAnswers, timeTakenMin);
        graded = { score: res.score, passed: res.passed, disqualified: res.disqualified };
      } catch {
        /* show a result anyway; a resubmit is blocked server-side */
      } finally {
        try {
          localStorage.removeItem(answersKey(invite.id));
        } catch {
          /* ignore */
        }
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setResult({ ...graded, autoSubmitted: auto });
        setPhase('done');
      }
    },
    [invite, startedAt],
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
      flagTestViolation(invite.id).catch(() => {});
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
              <div className="w-full max-w-sm rounded-lg border border-line bg-surface-muted px-5 py-3.5 text-sm text-gray-600">
                Our HR team has been notified — you&apos;ll receive an email about the outcome.
              </div>
            </div>
          </Card>
        </Shell>
      );
    }

    // Candidate-facing completion. IQ tests show the score immediately (it's an
    // objective aptitude number, not a hire/reject verdict); Assessments still
    // show NO score — that outcome is HR's call, communicated by email.
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-50 text-accent-600 ring-8 ring-accent-50/60">
              <CheckCircle2 size={30} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Test submitted</h1>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-500">
                {result.autoSubmitted &&
                  'Your test was submitted automatically (time limit reached). '}
                Thank you, {invite.candidateName.split(' ')[0]} — your responses have been recorded.
              </p>
            </div>
            {isIq && (
              <div className="w-full max-w-sm rounded-lg border border-accent-100 bg-accent-50/50 px-5 py-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                  Your IQ Score
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{result.score}</p>
              </div>
            )}
            <div className="w-full max-w-sm rounded-lg border border-line bg-surface-muted px-5 py-3.5 text-sm text-gray-600">
              📧 Our HR team will review your submission and email you about the next steps.
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
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent-50 to-accent-100 text-accent-600 ring-1 ring-accent-200/60">
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
                  value: isIq ? invite.passMark : `${invite.passMark}%`,
                  label: 'To qualify',
                },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-lg border border-line bg-surface/70 py-4 transition hover:border-accent-300"
                >
                  <Icon size={17} className="mx-auto text-accent-600" />
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-gray-900">{value}</p>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-line bg-surface-muted p-5">
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
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:translate-y-px"
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
  const goToQuestion = (next: number) => setPage(Math.max(0, Math.min(questions.length - 1, next)));
  const items = questions.map(q => ({ key: q.id, prompt: q.q, options: q.options }));

  const proctorBar = (
    <>
      <div className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-accent-500 to-accent-700 text-white">
              <Logo size={15} />
            </span>
            <span className="truncate text-[13px] font-bold text-gray-900">
              {isIq ? 'IQ Test' : `${invite.position} Assessment`}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {violations > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                <AlertTriangle size={11} /> {violations}/{MAX_VIOLATIONS}
              </span>
            )}
            <span
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${
                lowTime
                  ? 'animate-pulse bg-red-50 text-red-600 ring-1 ring-red-200'
                  : 'bg-surface-sunken text-gray-700'
              }`}
            >
              <Timer size={13} />
              {fmtClock(remainingMs)}
            </span>
          </div>
        </div>
      </div>

      {warning && (
        <div className="sticky top-[45px] z-40 border-b border-red-200 bg-red-50">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2.5 text-xs text-red-700 lg:px-6">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="font-semibold">{warning}</span>
            <button
              onClick={() => setWarning(null)}
              className="ml-auto cursor-pointer font-bold text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <QuizRunner
      title={isIq ? 'IQ Test' : `${invite.position} Assessment`}
      subtitle={`Hi ${invite.candidateName} — answer each question, then submit.`}
      items={items}
      answers={answers}
      current={page}
      onPick={pick}
      onNavigate={goToQuestion}
      onSubmit={() => submit('manual')}
      requireAll={false}
      topBar={proctorBar}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Layout shell for non-running states                                */
/* ------------------------------------------------------------------ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-background to-line">
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
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-sm">
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
        <span className="grid h-5 w-5 place-items-center rounded-sm bg-gradient-to-br from-accent-500 to-accent-700 text-white">
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
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent-400 via-accent-600 to-accent-800"
      />
      {children}
    </div>
  );
}
