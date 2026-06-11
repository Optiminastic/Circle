'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Wallet,
  Clock4,
  CalendarDays,
  CalendarPlus,
  FileText,
  BrainCircuit,
  ClipboardList,
  Flag,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';
import { Candidate, TestInvite } from '@/types';
import { useCandidates } from '@/features/candidates/hooks';
import { useSchedules } from '@/features/schedule/hooks';
import { useInterviews } from '@/features/interviews/hooks';
import { useIqTests } from '@/features/assessments/hooks';
import { useScheduler } from '@/store/schedule-store';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { effectiveFit, fitStyle } from '@/lib/screening';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { openDocument } from '@/features/documents/hooks';
import { PageLoading } from '@/components/PageLoading';
import {
  Stepper,
  StepperNav,
  StepperItem,
  StepperIndicator,
  StepperTitle,
  StepperDescription,
} from '@/components/ui/stepper';

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

type StepState = 'done' | 'current' | 'todo' | 'rejected';

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: candidates = [], isLoading } = useCandidates();
  const { data: schedules = [] } = useSchedules();
  const { data: interviews = [] } = useInterviews();
  const { data: iqTests = [] } = useIqTests();
  const { data: invites = [] } = useQuery({
    queryKey: qk.testInvites.all,
    queryFn: () => repositories.testInvites.list(),
  });
  const { openSchedule } = useScheduler();

  const candidate = candidates.find(c => c.id === id);

  // Replay the stepper entrance animation each time the page (or candidate) loads.
  const [stepIn, setStepIn] = useState(false);
  // Which stage's detail is shown in the side panel (null = follow current stage).
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    if (!candidate) return;
    setStepIn(false);
    setPicked(null);
    const t = setTimeout(() => setStepIn(true), 60);
    return () => clearTimeout(t);
  }, [candidate?.id]);

  if (isLoading) return <PageLoading />;
  if (!candidate) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-sm font-semibold text-gray-700">Candidate not found</p>
        <Link href="/candidates" className="mt-3 inline-block text-xs font-semibold text-accent-600 hover:underline">
          ← Back to candidates
        </Link>
      </div>
    );
  }

  const fit = effectiveFit(candidate);
  const mySchedules = schedules.filter(s => s.candidateId === id && s.status !== 'Cancelled');
  const myIq = iqTests.filter(t => t.candidateId === id);
  const myInterviews = interviews.filter(iv => iv.candidateId === id);
  const myInvites = (invites as TestInvite[]).filter(i => i.candidateId === id);

  // ---- pipeline stage states ----
  const hrCallDone = Boolean(candidate.hrCall?.completed);
  const hrCallReached =
    hrCallDone || mySchedules.some(s => s.type === 'HR Call') || candidate.status === 'Moved to HR Call';
  const iqInvite = myInvites.find(i => i.kind === 'iq');
  const iqDone = myIq.length > 0 || Boolean(iqInvite && ['Completed', 'Auto-Submitted'].includes(iqInvite.status));
  const iqReached = iqDone || Boolean(iqInvite) || mySchedules.some(s => s.type === 'IQ Test');
  const asgInvite = myInvites.find(i => i.kind === 'assignment');
  const asgDone = asgInvite?.status === 'Graded';
  const asgReached = Boolean(asgInvite) || mySchedules.some(s => s.type === 'Assessment');
  const interviewDone = myInterviews.some(iv => iv.status === 'Completed');
  const interviewReached = myInterviews.length > 0 || mySchedules.some(s => s.type === 'Interview');
  const rejected = candidate.status === 'Rejected';
  const selected = candidate.status === 'Selected';
  const decided = rejected || selected;

  const stages = [
    { label: 'Applied', Icon: FileText, reached: true, done: true, desc: fmtDate(candidate.appliedDate) },
    {
      label: 'Screening',
      Icon: ShieldCheck,
      reached: true,
      done: Boolean(candidate.fitRating),
      desc: fit ? `Rated ${fit}` : 'Pending',
    },
    {
      label: 'HR Call',
      Icon: Phone,
      reached: hrCallReached,
      done: hrCallDone,
      desc: hrCallDone ? candidate.hrCall!.nextStep : hrCallReached ? 'Scheduled' : 'Pending',
    },
    {
      label: 'IQ Test',
      Icon: BrainCircuit,
      reached: iqReached,
      done: iqDone,
      desc: myIq[0]
        ? `${myIq[0].qualificationStatus} · ${myIq[0].scorePercentage}%`
        : iqReached
          ? 'Scheduled'
          : 'Pending',
    },
    {
      label: 'Assignment',
      Icon: ClipboardList,
      reached: asgReached,
      done: asgDone,
      desc: asgDone
        ? asgInvite!.passed
          ? 'Cleared'
          : 'Not selected'
        : asgInvite?.submissionFileName
          ? 'Submitted'
          : asgReached
            ? 'Assigned'
            : 'Pending',
    },
    {
      label: 'Interview',
      Icon: CalendarDays,
      reached: interviewReached,
      done: interviewDone,
      desc: interviewDone ? 'Completed' : interviewReached ? 'Scheduled' : 'Pending',
    },
    {
      label: 'Decision',
      Icon: Flag,
      reached: decided,
      done: decided,
      desc: selected ? 'Selected for role' : rejected ? 'Rejected' : 'Pending',
    },
  ];
  let currentIndex = 0;
  stages.forEach((s, i) => {
    if (s.reached) currentIndex = i;
  });
  const stepState = (i: number): StepState => {
    if (i < currentIndex) return 'done';
    if (i === currentIndex) return rejected ? 'rejected' : stages[i].done ? 'done' : 'current';
    return 'todo';
  };
  const activeStage = picked ?? currentIndex; // detail panel follows the current stage by default

  // ---- activity timeline (line flow) ----
  type Ev = { date: string; title: string; detail?: string; tone: 'accent' | 'green' | 'red' | 'gray' };
  const events: Ev[] = [];
  events.push({ date: candidate.appliedDate, title: 'Applied', detail: candidate.appliedRole, tone: 'accent' });
  if (candidate.fitRating)
    events.push({
      date: candidate.appliedDate,
      title: `Screening — ${fit}`,
      detail: `${candidate.screeningAnswers?.length ?? 0} questions answered`,
      tone: fit === 'Unfit' ? 'red' : fit === 'Fit' ? 'green' : 'accent',
    });
  mySchedules.forEach(s =>
    events.push({ date: s.dateTime, title: `${s.type} scheduled`, detail: s.notes || undefined, tone: 'gray' }),
  );
  if (candidate.hrCall?.completed)
    events.push({
      date: candidate.hrCall.completedDate ?? candidate.appliedDate,
      title: `HR call completed`,
      detail: candidate.hrCall.nextStep,
      tone: 'green',
    });
  myIq.forEach(t =>
    events.push({
      date: t.testDate,
      title: `IQ Test — ${t.qualificationStatus}`,
      detail: `${t.scorePercentage}% · ${t.correctAnswers}/${t.totalQuestions}`,
      tone: t.qualificationStatus === 'Passed' ? 'green' : 'red',
    }),
  );
  myInvites
    .filter(i => i.kind === 'assignment')
    .forEach(i => {
      if (i.status === 'Graded')
        events.push({
          date: i.completedAt ?? i.createdAt,
          title: `Assignment graded — ${i.passed ? 'cleared' : 'not selected'}`,
          detail: i.score != null ? `${i.score}/100` : undefined,
          tone: i.passed ? 'green' : 'red',
        });
      else if (i.submissionFileName)
        events.push({ date: i.completedAt ?? i.createdAt, title: 'Assignment submitted', detail: i.submissionFileName, tone: 'accent' });
      else events.push({ date: i.createdAt, title: 'Assignment sent', tone: 'gray' });
    });
  myInterviews.forEach(iv =>
    events.push({ date: iv.dateTime, title: `${iv.interviewRound} interview`, detail: iv.interviewerName, tone: 'gray' }),
  );
  if (selected)
    events.push({ date: candidate.appliedDate, title: 'Selected for the role', detail: 'Availability email sent', tone: 'green' });
  if (rejected) events.push({ date: candidate.appliedDate, title: 'Rejected', tone: 'red' });
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const toneDot: Record<Ev['tone'], string> = {
    accent: 'bg-accent-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  };

  const mustHaves = (candidate.screeningAnswers ?? []).filter(a => a.importance === 'Must Have');
  const goodToHaves = (candidate.screeningAnswers ?? []).filter(a => a.importance === 'Good to Have');

  const schedOf = (t: string) =>
    mySchedules.filter(s => s.type === t).sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime));
  const empty = (txt: string) => <p className="text-[12px] text-gray-500">{txt}</p>;

  const stageDetail = (): React.ReactNode => {
    const label = stages[activeStage].label;

    if (label === 'Applied')
      return (
        <div className="space-y-2.5">
          <KV k="Role" v={`${candidate.appliedRole} · ${candidate.department}`} />
          <KV k="Applied on" v={fmtDate(candidate.appliedDate)} />
          <KV k="Source" v={candidate.sourceOfApplication} />
          {candidate.referralDetails && <KV k="Reference" v={candidate.referralDetails} />}
          <KV k="Location" v={candidate.location || '—'} />
        </div>
      );

    if (label === 'Screening') {
      if (!candidate.screeningAnswers?.length) return empty('No screening questions were answered.');
      return (
        <div className="space-y-3">
          {[
            { label: 'Must-have', items: mustHaves },
            { label: 'Good to have', items: goodToHaves },
          ]
            .filter(g => g.items.length)
            .map(g => (
              <div key={g.label}>
                <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                  {g.label}
                </p>
                <div className="space-y-1.5">
                  {g.items.map(a => (
                    <div key={a.questionId} className="flex items-start gap-2">
                      {a.type === 'text' ? (
                        <FileText size={13} className="mt-0.5 shrink-0 text-gray-400" />
                      ) : a.passed ? (
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle size={13} className="mt-0.5 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[12px] text-gray-700">{a.text}</p>
                        <p className="text-[11px] font-semibold text-gray-500">{a.answer || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      );
    }

    if (label === 'HR Call') {
      if (candidate.hrCall?.completed) {
        const h = candidate.hrCall;
        return (
          <div className="space-y-2.5">
            <KV k="Outcome" v={h.nextStep} />
            <KV k="Communication" v={`${h.communicationRating}/5`} />
            <KV k="Interest" v={`${h.interestLevel}/5`} />
            <KV k="Availability" v={h.candidateAvailability || '—'} />
            <KV k="Work mode" v={h.workModePreference} />
            {h.professionalBackgroundSummary && (
              <p className="rounded-lg bg-[#ECE6DA] p-2.5 text-[11px] italic text-gray-600">
                “{h.professionalBackgroundSummary}”
              </p>
            )}
          </div>
        );
      }
      const s = schedOf('HR Call')[0];
      return empty(s ? `Scheduled for ${fmtDateTime(s.dateTime)} — call not completed yet.` : 'HR call not started.');
    }

    if (label === 'IQ Test') {
      const t = myIq[0];
      if (t)
        return (
          <div className="space-y-2.5">
            <KV k="Result" v={t.qualificationStatus} />
            <KV k="Score" v={`${t.scorePercentage}%`} />
            <KV k="Correct" v={`${t.correctAnswers} / ${t.totalQuestions}`} />
            <KV k="Attempted" v={`${t.questionsAttempted}`} />
            <KV k="Time taken" v={`${t.timeTakenMinutes} min`} />
            {t.remarks && <p className="text-[11px] text-gray-500">{t.remarks}</p>}
          </div>
        );
      const s = schedOf('IQ Test')[0];
      return empty(s ? `Scheduled for ${fmtDateTime(s.dateTime)}.` : 'IQ test not started.');
    }

    if (label === 'Assignment') {
      if (asgInvite)
        return (
          <div className="space-y-2.5">
            <KV k="Status" v={asgInvite.status} />
            {asgInvite.submissionFileName && (
              <div>
                <p className="text-[10px] uppercase text-gray-400">Submission</p>
                <button
                  onClick={() => asgInvite.submissionDocId && openDocument(asgInvite.submissionDocId)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-600 hover:underline"
                >
                  <Download size={12} /> {asgInvite.submissionFileName}
                </button>
              </div>
            )}
            {asgInvite.status === 'Graded' && (
              <>
                <KV k="Score" v={asgInvite.score != null ? `${asgInvite.score}/100` : '—'} />
                <KV k="Outcome" v={asgInvite.passed ? 'Cleared' : 'Not selected'} />
                {asgInvite.gradeComments && (
                  <p className="rounded-lg bg-[#ECE6DA] p-2.5 text-[11px] italic text-gray-600">
                    “{asgInvite.gradeComments}”
                  </p>
                )}
              </>
            )}
          </div>
        );
      const s = schedOf('Assessment')[0];
      return empty(s ? `Scheduled for ${fmtDateTime(s.dateTime)}.` : 'Assignment not assigned yet.');
    }

    if (label === 'Interview') {
      if (!myInterviews.length) {
        const s = schedOf('Interview')[0];
        return empty(s ? `Interview scheduled for ${fmtDateTime(s.dateTime)}.` : 'No interview yet.');
      }
      return (
        <div className="space-y-2.5">
          {myInterviews.map(iv => (
            <div key={iv.id} className="rounded-lg border border-[#E2DDD2] bg-[#ECE6DA] p-2.5">
              <p className="text-[12px] font-semibold text-gray-800">{iv.interviewRound}</p>
              <p className="text-[11px] text-gray-500">
                {iv.interviewerName} · {fmtDateTime(iv.dateTime)} · {iv.meetingMode}
              </p>
              {iv.grading && (
                <p className="mt-1 text-[11px] text-gray-600">
                  <span className="font-semibold">{iv.grading.recommendation}</span> — “
                  {iv.grading.interviewerComments}”
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Decision
    return empty(
      selected
        ? 'Selected for the role — an availability-to-join email was sent to the candidate.'
        : rejected
          ? 'The candidate was not moved forward.'
          : 'No final decision yet.',
    );
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Back + header */}
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-accent-600"
      >
        <ArrowLeft size={13} /> Back to candidates
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-[#DAD4C8] bg-[#F7F4EE] p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-lg font-bold text-white">
            {candidate.fullName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-gray-900">{candidate.fullName}</h1>
            <p className="text-[12px] text-gray-500">
              {candidate.appliedRole} · {candidate.department}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-accent-50 px-2 py-0.5 font-mono text-[9px] font-bold text-accent-600">
                {candidate.status}
              </span>
              {fit && (
                <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${fitStyle(fit)}`}>
                  {fit}
                  {candidate.fitRatingOverride && <span className="ml-0.5 opacity-60">*</span>}
                </span>
              )}
              <span className="font-mono text-[10px] text-gray-400">{candidate.id}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => openSchedule(candidate.id, candidate.fullName, 'HR Call')}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 font-semibold text-white transition hover:bg-accent-700"
        >
          <CalendarPlus size={14} /> Schedule a round
        </button>
      </div>

      {/* Vertical pipeline stepper (ReUI) + per-stage detail panel */}
      <div
        className="rounded-xl border border-[#DAD4C8] bg-[#F7F4EE] p-5 shadow-2xs transition-all duration-500 ease-out"
        style={{ opacity: stepIn ? 1 : 0, transform: stepIn ? 'translateY(0)' : 'translateY(10px)' }}
      >
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Pipeline progress <span className="text-gray-400">· click a stage for details</span>
        </p>
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Stepper */}
          <div className="lg:w-60 lg:shrink-0">
            <Stepper orientation="vertical" value={currentIndex + 1}>
              <StepperNav className="gap-0">
                {stages.map((stage, i) => {
                  const state = stepState(i);
                  const StageIcon = stage.Icon;
                  const last = i === stages.length - 1;
                  return (
                    <StepperItem
                      key={stage.label}
                      step={i + 1}
                      completed={state === 'done'}
                      onClick={() => setPicked(i)}
                      className={`-mx-2 !flex-row !items-stretch !justify-start gap-3 rounded-lg px-2 transition-all duration-500 cursor-pointer ${
                        i === activeStage ? 'bg-[#ECE6DA]' : 'hover:bg-[#F2EEE7]'
                      }`}
                      style={{ transitionDelay: `${i * 90}ms`, opacity: stepIn ? 1 : 0 }}
                    >
                      <div className="flex flex-col items-center pt-0.5">
                        <StepperIndicator
                          className={`size-8 border-2 border-background ${
                            state === 'rejected' ? '!bg-red-500 !text-white' : ''
                          }`}
                        >
                          {state === 'done' ? <Check size={15} /> : <StageIcon size={14} />}
                        </StepperIndicator>
                        {!last && (
                          <div
                            className={`my-1 w-0.5 flex-1 rounded ${
                              i < currentIndex ? 'bg-emerald-400' : 'bg-[#DAD4C8]'
                            }`}
                          />
                        )}
                      </div>
                      <div className={last ? 'pt-1 pb-1' : 'pt-1 pb-5'}>
                        <StepperTitle className={state === 'todo' ? '!text-gray-400' : '!text-gray-800'}>
                          {stage.label}
                        </StepperTitle>
                        <StepperDescription
                          className={`!text-[11px] ${
                            state === 'done'
                              ? '!text-emerald-600'
                              : state === 'rejected'
                                ? '!text-red-500'
                                : state === 'current'
                                  ? '!text-accent-600'
                                  : '!text-gray-400'
                          }`}
                        >
                          {stage.desc}
                        </StepperDescription>
                      </div>
                    </StepperItem>
                  );
                })}
              </StepperNav>
            </Stepper>
          </div>

          {/* Detail panel */}
          <div className="min-h-[220px] flex-1 rounded-xl border border-[#E2DDD2] bg-[#F2EEE7] p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-[#E2DDD2] pb-2.5">
              {(() => {
                const Ic = stages[activeStage].Icon;
                return (
                  <span className="grid size-7 place-items-center rounded-lg bg-accent-50 text-accent-600">
                    <Ic size={14} />
                  </span>
                );
              })()}
              <h4 className="text-sm font-bold text-gray-900">{stages[activeStage].label}</h4>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-gray-500">
                {stages[activeStage].desc}
              </span>
            </div>
            {stageDetail()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: screening + timeline */}
        <div className="space-y-5 lg:col-span-2">
          {/* Timeline / line flow */}
          <div className="rounded-xl border border-[#DAD4C8] bg-[#F7F4EE] p-5 shadow-2xs">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Activity timeline</h3>
            <ol className="relative space-y-4 border-l border-[#DAD4C8] pl-5">
              {events.map((ev, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[23px] top-1 size-2.5 rounded-full ring-4 ring-[#F7F4EE] ${toneDot[ev.tone]}`}
                  />
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12px] font-semibold text-gray-800">{ev.title}</p>
                    <span className="shrink-0 font-mono text-[10px] text-gray-400">{fmtDateTime(ev.date)}</span>
                  </div>
                  {ev.detail && <p className="text-[11px] text-gray-500">{ev.detail}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: details + documents */}
        <div className="space-y-5">
          <div className="rounded-xl border border-[#DAD4C8] bg-[#F7F4EE] p-5 shadow-2xs">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Candidate details</h3>
            <div className="space-y-2.5">
              <Detail icon={<Mail size={13} />} value={candidate.email} />
              <Detail icon={<Phone size={13} />} value={candidate.phone || '—'} />
              <Detail icon={<MapPin size={13} />} value={candidate.location || '—'} />
              <Detail icon={<Briefcase size={13} />} value={`${candidate.currentCompany || '—'} · ${candidate.currentDesignation || '—'}`} />
              <Detail icon={<Clock4 size={13} />} value={`${candidate.totalExperienceYears} yrs experience · ${candidate.noticePeriodDays}d notice`} />
              <Detail icon={<Wallet size={13} />} value={`Current ${candidate.currentCtc || '—'} → Expected ${candidate.expectedCtc || '—'}`} />
              <Detail icon={<CalendarDays size={13} />} value={`Applied ${fmtDate(candidate.appliedDate)} · via ${candidate.sourceOfApplication}`} />
            </div>
          </div>

          <DocumentsPanel
            entityType="candidate"
            entityId={candidate.id}
            category="resume"
            title="Resume & documents"
            previewOnly
          />
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#E2DDD2] pb-1.5 last:border-0">
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">{k}</span>
      <span className="text-right text-[12px] font-medium text-gray-700">{v || '—'}</span>
    </div>
  );
}

function Detail({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[12px] text-gray-700">
      <span className="mt-0.5 text-accent-600">{icon}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
