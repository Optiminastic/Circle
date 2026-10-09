'use client';

/**
 * What the AI interview concluded, on the candidate's page.
 *
 * The verdict is the same Fit / Borderline / Unfit the application form
 * produces — scored by the same rule on the server — but it is labelled as the
 * call's and never written onto the candidate. A three-minute conversation
 * informs HR's judgement; it does not replace it.
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Monitor,
  PhoneCall,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import { ModalShell } from '@/components/ui/modal-shell';
import { FIT_THRESHOLD, fitStyle } from '@/lib/screening';
import { useScreeningCalls } from '@/features/screening-calls/hooks';
import { isCallActive, type ScreeningCall, type ScreeningCallAnswer } from '@/lib/api/screening-calls';

const PASS_BAR = Math.round(FIT_THRESHOLD * 100);

const fmtDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

/** Reads like a sentence rather than a reason code. */
const endedPlainly = (reason?: string | null): string =>
  (reason ?? '').replace(/[-_]/g, ' ').trim() || 'no reason given';

/* ------------------------------ the verdict ------------------------------ */

function Verdict({ call }: { call: ScreeningCall }) {
  const musts = call.answers.filter(a => a.importance === 'Must Have');
  const goods = call.answers.filter(a => a.importance === 'Good to Have');
  const failedMusts = musts.filter(a => !a.passed);
  const goodsPassed = goods.filter(a => a.passed).length;

  if (call.fitRating === 'Unfit' && failedMusts.length > 0) {
    return (
      <div className="rounded-md border border-red-100 bg-red-50 p-2.5">
        <p className="flex items-start gap-1.5 text-[12px] font-semibold text-red-700">
          <XCircle size={13} className="mt-0.5 shrink-0" />
          <span>
            Unfit on the call — missed {failedMusts.length === 1 ? 'a must-have' : 'must-haves'}:
          </span>
        </p>
        <ul className="mt-1.5 space-y-1 pl-5">
          {failedMusts.map(a => (
            <li key={a.questionId} className="list-disc text-[11.5px] leading-snug text-red-700/90">
              {a.text} <span className="font-semibold">— said “{a.answer || '—'}”</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (call.fitRating === 'Fit') {
    return (
      <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2.5">
        <p className="flex items-start gap-1.5 text-[12px] font-semibold text-emerald-700">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
          <span>
            Fit on the call — {musts.length > 0 ? `answered all ${musts.length} must-have` : 'no blocking questions'}
            {musts.length > 1 ? 's' : ''}
            {goods.length > 0
              ? `, and ${goodsPassed}/${goods.length} good-to-have (≥ ${PASS_BAR}% bar).`
              : '.'}
          </span>
        </p>
      </div>
    );
  }
  if (call.fitRating === 'Borderline') {
    return (
      <div className="rounded-md border border-amber-100 bg-amber-50 p-2.5">
        <p className="flex items-start gap-1.5 text-[12px] font-semibold text-amber-700">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            Borderline — answered all must-haves, but only {goodsPassed}/{goods.length}{' '}
            good-to-have (below the {PASS_BAR}% bar).
          </span>
        </p>
      </div>
    );
  }
  return null;
}

/* --------------------------- one question's row --------------------------- */

function AnswerRow({ answer }: { answer: ScreeningCallAnswer }) {
  const icon =
    answer.type === 'text' ? (
      <FileText size={12} className="mt-0.5 shrink-0 text-gray-400" />
    ) : answer.passed ? (
      <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
    ) : (
      <XCircle size={12} className="mt-0.5 shrink-0 text-red-500" />
    );
  return (
    <li className="flex items-start gap-1.5">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] leading-snug text-gray-700">{answer.text}</p>
        <p className="text-[11.5px] font-semibold text-gray-900">{answer.answer || '—'}</p>
        {answer.evidence && (
          <p className="truncate text-[11px] italic text-gray-500" title={answer.evidence}>
            “{answer.evidence}”
          </p>
        )}
        {answer.followUpStrength === 'weak' && (
          <p className="text-[10.5px] text-gray-400">Answered only after prompting.</p>
        )}
        {answer.contradictsForm && (
          <p className="mt-0.5 flex items-start gap-1 text-[10.5px] font-semibold text-red-600">
            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
            Form said “{answer.formAnswer || '—'}” · call said “{answer.answer || '—'}”
          </p>
        )}
      </div>
    </li>
  );
}

/* ------------------------------- the card -------------------------------- */

export interface ScreeningCallReportProps {
  candidateId: string;
  /** Opens the mode-choice dialog; the card never starts a call itself. */
  onStart: () => void;
}

export function ScreeningCallReport({ candidateId, onStart }: ScreeningCallReportProps) {
  const { data: calls = [], isLoading } = useScreeningCalls(candidateId);
  const [transcriptOf, setTranscriptOf] = useState<ScreeningCall | null>(null);

  const latest = calls[0];
  const earlier = useMemo(() => calls.slice(1), [calls]);

  const StartButton = ({ label }: { label: string }) => (
    <button
      onClick={onStart}
      className="inline-flex items-center gap-1.5 rounded-md border border-accent-300 bg-accent-50 px-3 py-1.5 text-[12px] font-semibold text-accent-700 transition hover:bg-accent-100"
    >
      <PhoneCall size={13} /> {label}
    </button>
  );

  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-2xs">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <PhoneCall size={14} className="text-accent-600" /> AI interview
      </h3>

      {isLoading ? (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Loader2 size={11} className="animate-spin" /> Checking…
        </p>
      ) : !latest ? (
        <div className="space-y-2.5">
          <p className="text-[11px] text-gray-500">
            No AI interview yet. The agent asks this role&apos;s screening questions and reports
            back whether they are a fit.
          </p>
          <StartButton label="Start AI interview" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {isCallActive(latest.status) ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                {latest.status === 'queued' && latest.mode === 'web'
                  ? 'Waiting for someone to join the call'
                  : latest.status === 'queued'
                    ? 'Dialling…'
                    : latest.status === 'ringing'
                      ? 'Ringing…'
                      : 'Interview in progress…'}
              </p>
              {latest.mode === 'web' && latest.webCallUrl && (
                <a
                  href={latest.webCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-600"
                >
                  <Monitor size={13} /> Open the call
                </a>
              )}
              <p className="text-[10.5px] text-gray-400">
                The result appears here on its own — no need to refresh.
              </p>
            </div>
          ) : latest.status === 'declined' ? (
            <div className="space-y-2">
              <div className="rounded-md border border-amber-100 bg-amber-50 p-2.5">
                <p className="flex items-start gap-1.5 text-[12px] font-semibold text-amber-700">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  They declined the AI interview. No rating was given.
                </p>
              </div>
              <StartButton label="Try again" />
            </div>
          ) : latest.status === 'completed' ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {latest.fitRating ? (
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${fitStyle(latest.fitRating)}`}
                  >
                    {latest.fitRating}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[9px] font-bold text-gray-500">
                    No rating
                  </span>
                )}
                <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400">
                  by AI interview
                </span>
              </div>

              {latest.needsReview && (
                <p className="flex items-start gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-800">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  Needs your review — the agent could not make out every answer.
                </p>
              )}

              <Verdict call={latest} />

              {latest.answers.length > 0 && (
                <ul className="space-y-2 border-t border-line-soft pt-2.5">
                  {latest.answers.map(a => (
                    <AnswerRow key={a.questionId} answer={a} />
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line-soft pt-2 text-[10.5px] text-gray-400">
                <span>{fmtDuration(latest.durationSeconds)}</span>
                <span>·</span>
                <span>{latest.mode === 'phone' ? 'phone' : 'browser'}</span>
                {latest.startedBy?.name && (
                  <>
                    <span>·</span>
                    <span>by {latest.startedBy.name}</span>
                  </>
                )}
                {latest.recordingUrl && (
                  <a
                    href={latest.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-accent-700 underline underline-offset-2 hover:text-accent-800"
                  >
                    <PlayCircle size={11} /> Recording
                  </a>
                )}
                {latest.transcript && (
                  <button
                    onClick={() => setTranscriptOf(latest)}
                    className="font-semibold text-accent-700 underline underline-offset-2 hover:text-accent-800"
                  >
                    Transcript
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-gray-700">
                {latest.status === 'no-answer' ? 'No answer' : 'The call failed'} —{' '}
                <span className="font-normal text-gray-500">{endedPlainly(latest.endedReason)}</span>
              </p>
              <StartButton label="Try again" />
            </div>
          )}

          {earlier.length > 0 && (
            <details className="border-t border-line-soft pt-2">
              <summary className="cursor-pointer text-[10.5px] text-gray-400 hover:text-gray-600">
                {earlier.length} earlier attempt{earlier.length === 1 ? '' : 's'}
              </summary>
              <ul className="mt-1.5 space-y-1">
                {earlier.map(call => (
                  <li key={call.id} className="flex items-center gap-1.5 text-[10.5px] text-gray-500">
                    <span className="font-mono">{call.status}</span>
                    {call.fitRating && <span>· {call.fitRating}</span>}
                    <span>· {fmtDuration(call.durationSeconds)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Kept out of the 320px column on purpose — a transcript runs to tens of
          thousands of characters. */}
      {transcriptOf && (
        <ModalShell
          onClose={() => setTranscriptOf(null)}
          size="xl"
          labelledBy="ai-transcript-title"
          className="p-5"
        >
          <h3 id="ai-transcript-title" className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <FileText size={15} className="text-accent-600" /> Interview transcript
          </h3>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-surface-muted p-3 text-[11.5px] leading-relaxed text-gray-700">
            {transcriptOf.transcript}
          </pre>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setTranscriptOf(null)}
              className="rounded-md border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-surface-sunken"
            >
              Close
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

export default ScreeningCallReport;
