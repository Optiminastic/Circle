'use client';

import React, { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { http } from '@/lib/http/client';
import {
  decodeInterviewSheet,
  loadInterviewSheet,
  type InterviewSheetPayload,
} from '@/lib/interview-sheet';
import type { InterviewQuestionResponse } from '@/types';
import {
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  Clock4,
  CalendarDays,
  FileText,
  User,
  CheckCircle2,
  Loader2,
  Star,
  Ban,
} from 'lucide-react';

type Recommendation = 'Strong Hire' | 'Hire' | 'Hold' | 'Reject' | 'Re-Interview Required';
const RECOMMENDATIONS: Recommendation[] = [
  'Strong Hire',
  'Hire',
  'Hold',
  'Reject',
  'Re-Interview Required',
];

function fmtWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export default function InterviewSheetPage() {
  const [data, setData] = useState<InterviewSheetPayload | null>(null);
  const [ready, setReady] = useState(false);
  // Per-question recorded answers (keyed by question index).
  const [responses, setResponses] = useState<Record<number, { selected?: string; note?: string }>>(
    {},
  );
  const [recommendation, setRecommendation] = useState<Recommendation>('Hire');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setSelected = (i: number, selected: string) =>
    setResponses(r => ({ ...r, [i]: { ...r[i], selected } }));
  const setNote = (i: number, note: string) =>
    setResponses(r => ({ ...r, [i]: { ...r[i], note } }));

  const submit = async () => {
    if (!data?.interviewId) return;
    setSubmitting(true);
    setSubmitError(null);
    const questionResponses: InterviewQuestionResponse[] = data.questions.map((q, i) => ({
      text: q.text,
      options: q.options,
      selected: responses[i]?.selected,
      note: responses[i]?.note?.trim() || undefined,
    }));
    // Store the interviewer's overall verdict on the interview record as `grading`
    // so HR sees it (recommendation + comments) in the Physical Interview review.
    const grading = {
      grades: {
        subjectKnowledge: 3,
        clarityOfCommunication: 3,
        confidence: 3,
        practicalExperience: 3,
        problemSolvingAbility: 3,
        attitude: 3,
        teamFit: 3,
        learningAbility: 3,
        overallSuitability: 3,
      },
      interviewerComments: comments.trim(),
      recommendation,
      gradedAt: new Date().toISOString(),
    };
    try {
      await http.patch(`/interviews/${data.interviewId}`, {
        questionResponses,
        grading,
        status: 'Completed',
      });
      setSubmitted(true);
    } catch {
      setSubmitError('Could not submit your responses. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Read the sheet from the URL on the client (avoids useSearchParams Suspense
  // requirements and keeps this a fully static public page). New links carry a
  // short token (`?id=`) and we fetch the payload; old links inlined it (`?d=`).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      loadInterviewSheet(id)
        .then(setData)
        .finally(() => setReady(true));
      return;
    }
    setData(decodeInterviewSheet(params.get('d') ?? ''));
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-[#F1F3F5]" />;
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F1F3F5] px-5 text-center">
        <AlertTriangle className="text-amber-500" size={28} />
        <p className="font-semibold text-gray-800">This interview sheet link is invalid</p>
        <p className="max-w-sm text-sm text-gray-500">
          The link may be incomplete — please use the full link from your invitation email.
        </p>
      </div>
    );
  }

  const details: { icon: React.ReactNode; label: string; value?: string }[] = [
    { icon: <Briefcase size={13} />, label: 'Role applied', value: `${data.role}${data.department ? ` · ${data.department}` : ''}` },
    {
      icon: <Clock4 size={13} />,
      label: 'Experience',
      value:
        data.experienceYears != null
          ? `${data.experienceYears} yrs total${data.relevantExperienceYears != null ? ` · ${data.relevantExperienceYears} yrs relevant` : ''}`
          : undefined,
    },
    { icon: <Briefcase size={13} />, label: 'Current', value: data.currentCompany || data.currentDesignation ? `${data.currentCompany || '—'} — ${data.currentDesignation || '—'}` : undefined },
    { icon: <Mail size={13} />, label: 'Email', value: data.email },
    { icon: <Phone size={13} />, label: 'Phone', value: data.phone },
    { icon: <CalendarDays size={13} />, label: 'Interview', value: fmtWhen(data.whenIso) ? `${fmtWhen(data.whenIso)}${data.mode ? ` · ${data.mode}` : ''}` : undefined },
  ].filter(d => d.value);

  return (
    <div className="min-h-screen bg-[#F1F3F5]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[#E4E6EA] bg-[#FFFFFF]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4 sm:px-6">
          <Logo size={26} />
          <div>
            <h1 className="font-display text-sm font-bold leading-none tracking-tight text-gray-900">
              {BRAND.name}
            </h1>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Interview Sheet
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Candidate basics */}
        <section className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 shadow-2xs sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-base font-bold text-white">
              {data.candidateName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{data.candidateName}</h2>
              <p className="text-xs text-gray-500">{data.role}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {details.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="mt-0.5 text-gray-400">{d.icon}</span>
                <span>
                  <span className="text-gray-500">{d.label}: </span>
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {data.resumeUrl && (
            <a
              href={data.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent-700"
            >
              <FileText size={14} /> View candidate resume
            </a>
          )}
        </section>

        {/* Questions */}
        <section className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 shadow-2xs sm:p-6">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <User size={15} className="text-accent-600" /> Interview questions
          </h3>
          <p className="mb-4 text-[11px] text-gray-500">
            {data.roleLabel ? `${data.roleLabel} · ` : ''}
            {data.questions.length} question{data.questions.length === 1 ? '' : 's'}
            {data.interviewId ? ' · select what the candidate answered, then submit.' : ''}
          </p>

          {submitted ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-6 py-10 text-center">
              <CheckCircle2 className="text-emerald-500" size={30} />
              <p className="text-sm font-bold text-gray-900">Responses submitted</p>
              <p className="max-w-sm text-[12px] text-gray-600">
                Thanks — the candidate&apos;s answers have been saved to the hiring team&apos;s record.
              </p>
            </div>
          ) : (
            <>
              <ol className="space-y-4">
                {data.questions.map((q, i) => {
                  const picked = responses[i]?.selected;
                  return (
                    <li key={i} className="rounded-xl border border-[#ECEDF0] bg-[#F1F3F5]/50 p-4">
                      {q.module && (
                        <span className="mb-1.5 inline-block rounded-full bg-accent-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-600">
                          {q.module}
                        </span>
                      )}
                      <div className="flex gap-2.5">
                        <span className="font-mono text-[12px] font-bold text-accent-700">
                          {i + 1}.
                        </span>
                        <p className="text-sm font-semibold text-gray-900">{q.text}</p>
                      </div>
                      {/* Interview questions are rated 1–5 stars (or NA) */}
                      {q.options.length === 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-7">
                          {[1, 2, 3, 4, 5].map(n => {
                            const on = Number(picked) >= n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setSelected(i, String(n))}
                                title={`${n} star${n > 1 ? 's' : ''}`}
                                aria-label={`${n} stars`}
                                className="p-0.5"
                              >
                                <Star
                                  size={22}
                                  className={
                                    on
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-transparent text-gray-300 transition hover:text-amber-300'
                                  }
                                />
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setSelected(i, 'NA')}
                            title="Not applicable"
                            className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                              picked === 'NA'
                                ? 'border-red-300 bg-red-50 text-red-600'
                                : 'border-[#E4E6EA] bg-[#FFFFFF] text-gray-500 hover:border-red-300'
                            }`}
                          >
                            <Ban size={12} /> NA
                          </button>
                        </div>
                      )}
                      {q.options.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 pl-7">
                          {q.options.map((opt, oi) => {
                            const active = picked === opt;
                            return (
                              <button
                                key={oi}
                                type="button"
                                onClick={() => setSelected(i, opt)}
                                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition ${
                                  active
                                    ? 'border-accent-500 bg-accent-50 text-accent-800'
                                    : 'border-[#E4E6EA] bg-[#FFFFFF] text-gray-700 hover:border-accent-300'
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                                    active ? 'bg-accent-600 text-white' : 'bg-accent-50 text-accent-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {data.interviewId && (
                        <div className="mt-2 pl-7">
                          <input
                            value={responses[i]?.note ?? ''}
                            onChange={e => setNote(i, e.target.value)}
                            placeholder="Add a note (optional)"
                            className="w-full rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-3 py-1.5 text-[12px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {data.interviewId && (
                <div className="mt-5 space-y-4 rounded-2xl border border-[#E4E6EA] bg-[#F1F3F5] p-5">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                      Recommendation
                    </label>
                    <select
                      value={recommendation}
                      onChange={e => setRecommendation(e.target.value as Recommendation)}
                      className="w-full rounded-lg border border-[#E4E6EA] bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    >
                      {RECOMMENDATIONS.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                      Comments
                    </label>
                    <textarea
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="Overall assessment, strengths, concerns…"
                      rows={4}
                      className="w-full rounded-lg border border-[#E4E6EA] bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    />
                  </div>
                </div>
              )}

              {data.interviewId && (
                <div className="mt-4 flex flex-col items-end gap-2">
                  {submitError && <p className="text-[12px] text-red-600">{submitError}</p>}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> Submit responses
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="py-4 text-center text-[11px] text-gray-500">{BRAND.name}</footer>
      </main>
    </div>
  );
}
