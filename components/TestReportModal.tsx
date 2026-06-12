'use client';

import React from 'react';
import { TestInvite } from '@/types';
import {
  IQ_QUESTIONS,
  assessmentBankFor,
  IQ_PASS_SCORE,
  ASSESSMENT_PASS_PERCENT,
  TestQuestion,
} from '@/data/test-banks';
import {
  BrainCircuit,
  ClipboardList,
  X,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ShieldAlert,
  Clock4,
  Target,
  ListChecks,
} from 'lucide-react';

export function bankFor(invite: TestInvite): TestQuestion[] {
  return invite.kind === 'iq' ? IQ_QUESTIONS : assessmentBankFor(invite.department, invite.position);
}

export function timeTakenMin(invite: TestInvite): number | null {
  if (!invite.startedAt || !invite.completedAt) return null;
  const ms = new Date(invite.completedAt).getTime() - new Date(invite.startedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.max(1, Math.round(ms / 60_000));
}

export const fmtTestDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Full-detail analysis of one completed test invite (score, accuracy, per-question). */
export function TestReportModal({ invite, onClose }: { invite: TestInvite; onClose: () => void }) {
  const questions = bankFor(invite);
  const answers = invite.answers ?? {};
  const isIq = invite.kind === 'iq';
  const passBar = isIq ? `${IQ_PASS_SCORE}+` : `${ASSESSMENT_PASS_PERCENT}%+`;

  const total = invite.total ?? questions.length;
  const correct = invite.correct ?? 0;
  const attempted = Object.keys(answers).length;
  const unanswered = Math.max(0, total - attempted);
  const incorrect = Math.max(0, attempted - correct);
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const taken = timeTakenMin(invite);

  const stats = [
    { label: 'Correct', value: correct, icon: <CheckCircle2 size={14} />, cls: 'text-emerald-600' },
    { label: 'Incorrect', value: incorrect, icon: <XCircle size={14} />, cls: 'text-red-500' },
    { label: 'Skipped', value: unanswered, icon: <MinusCircle size={14} />, cls: 'text-gray-500' },
    { label: 'Accuracy', value: `${accuracy}%`, icon: <Target size={14} />, cls: 'text-accent-600' },
    {
      label: 'Time taken',
      value: taken ? `${taken} min` : '—',
      icon: <Clock4 size={14} />,
      cls: 'text-accent-600',
    },
    {
      label: 'Violations',
      value: invite.violations ?? 0,
      icon: <ShieldAlert size={14} />,
      cls: (invite.violations ?? 0) > 0 ? 'text-orange-500' : 'text-gray-500',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-gray-900/45 backdrop-blur-xs flex items-center justify-center z-[150] p-4"
      aria-label="Close" onClick={onClose}
    >
      <div
        className="bg-[#F7F4EE] rounded-2xl border border-[#DAD4C8] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#E6E1D8]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
              {isIq ? <BrainCircuit size={18} /> : <ClipboardList size={18} />}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-sm truncate">
                {invite.candidateName}
                <span className="ml-2 text-[10px] font-mono font-bold text-gray-500">
                  {invite.candidateId}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">
                {isIq ? 'IQ Test' : `${invite.position} Assessment`} · {invite.department} ·{' '}
                {fmtTestDate(invite.completedAt)}
              </p>
            </div>
          </div>
          <button
            aria-label="Close" onClick={onClose}
            className="text-gray-500 hover:text-gray-600 p-1 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Score hero */}
          <div
            className={`rounded-2xl border px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
              invite.passed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'
            }`}
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Final score
              </p>
              <p
                className={`text-4xl font-bold tabular-nums ${
                  invite.passed ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {invite.score ?? '—'}
                {!isIq && invite.score !== undefined && <span className="text-xl">%</span>}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Qualifying: {passBar}</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              <span
                className={`text-[11px] font-mono px-3 py-1.5 rounded-full font-bold ${
                  invite.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {invite.passed ? '✓ QUALIFIED' : '✗ NOT QUALIFIED'}
              </span>
              {invite.status === 'Auto-Submitted' && (
                <span className="text-[10px] font-mono px-2.5 py-1.5 rounded-full font-bold bg-orange-100 text-orange-600">
                  AUTO-SUBMITTED
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {stats.map(s => (
              <div
                key={s.label}
                className="bg-[#F2EEE7] border border-[#DAD4C8] rounded-xl px-3 py-2.5 text-center"
              >
                <span className={`inline-flex ${s.cls}`}>{s.icon}</span>
                <p className="text-base font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
                  {s.value}
                </p>
                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wide">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Per-question breakdown */}
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 uppercase font-mono tracking-wider mb-2.5">
              <ListChecks size={13} className="text-accent-600" /> Question-by-question analysis
            </p>
            <div className="space-y-2">
              {questions.map((q, i) => {
                const picked = answers[q.id];
                const hasAnswer = picked !== undefined;
                const right = picked === q.answer;
                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border px-4 py-3 ${
                      !hasAnswer
                        ? 'border-[#DAD4C8] bg-[#F7F4EE]'
                        : right
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-red-200 bg-red-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[12px] font-semibold text-gray-800 leading-relaxed">
                        <span className="text-gray-500 font-mono mr-1.5">{i + 1}.</span>
                        {q.q}
                      </p>
                      <span className="shrink-0 mt-0.5">
                        {!hasAnswer ? (
                          <MinusCircle size={15} className="text-gray-300" />
                        ) : right ? (
                          <CheckCircle2 size={15} className="text-emerald-500" />
                        ) : (
                          <XCircle size={15} className="text-red-500" />
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-[11px]">
                      <span className={right ? 'text-emerald-700' : 'text-gray-600'}>
                        <span className="text-gray-500 font-mono">Their answer: </span>
                        {hasAnswer ? (
                          <strong>
                            {String.fromCharCode(65 + picked)}. {q.options[picked]}
                          </strong>
                        ) : (
                          <em className="text-gray-500">Not answered</em>
                        )}
                      </span>
                      {!right && (
                        <span className="text-gray-600">
                          <span className="text-gray-500 font-mono">Correct: </span>
                          <strong className="text-emerald-700">
                            {String.fromCharCode(65 + q.answer)}. {q.options[q.answer]}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestReportModal;
