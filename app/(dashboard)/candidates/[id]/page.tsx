'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Wallet,
  Clock4,
  CalendarDays,
  CalendarClock,
  CalendarPlus,
  FileText,
  BrainCircuit,
  ClipboardList,
  Flag,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Award,
  ThumbsDown,
  MessageSquarePlus,
  Pause,
  Send,
  Eye,
  Star,
  UserCheck,
  Download,
} from 'lucide-react';
import { CandidateStatus, HRCallRecord, Interview, ScheduleType, ScreeningReview, StageDecision, TestInvite } from '@/types';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';
import { useSchedules } from '@/features/schedule/hooks';
import { useInterviews, useInterviewMutations } from '@/features/interviews/hooks';
import { useIqTests } from '@/features/assessments/hooks';
import { useEnsureOnboarding } from '@/features/onboarding/hooks';
import { useScheduler } from '@/store/schedule-store';
import { useInterviewScheduler } from '@/store/interview-schedule-store';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { effectiveFit, fitStyle } from '@/lib/screening';
import { sendTestEmail, sendCustomEmail } from '@/lib/api/notifications';
import {
  ASSIGNMENT_MAX_MARKS,
  ASSIGNMENT_PASS_MARKS,
  IQ_DURATION_MIN,
} from '@/data/test-banks';
import { randomId, randomToken, nowISO } from '@/lib/utils';
import { SendTestModal, SendTestResult } from '@/components/SendTestModal';
import { useToast } from '@/components/Toaster';
import { openDocument, useDocuments } from '@/features/documents/hooks';
import { documentPreviewUrl } from '@/lib/api/documents';
import { PageLoading } from '@/components/PageLoading';
import { Tip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';

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

const blankScreening = (): ScreeningReview => ({
  resumeRelevance: 3,
  experienceMatch: 3,
  skillMatch: 3,
  standoutFactor: 3,
  communication: 3,
  remarks: '',
});

const SCREENING_CRITERIA: { key: keyof ScreeningReview; label: string }[] = [
  { key: 'resumeRelevance', label: 'Resume relevance' },
  { key: 'experienceMatch', label: 'Experience match' },
  { key: 'skillMatch', label: 'Skill match' },
  { key: 'standoutFactor', label: 'Stands out / different' },
  { key: 'communication', label: 'Communication & profile' },
];

const blankHrCall = (): HRCallRecord => ({
  completed: true,
  candidateAvailability: '',
  communicationRating: 3,
  professionalBackgroundSummary: '',
  reasonForJobChange: '',
  currentCtc: '',
  expectedCtc: '',
  noticePeriodDays: 0,
  workModePreference: 'Onsite',
  roleUnderstanding: '',
  interestLevel: 3,
  culturalFitRemarks: '',
  hrRecommendation: '',
  nextStep: 'Proceed to Interview',
});

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
  const { data: candidateDocs = [] } = useDocuments('candidate', id);
  const { openSchedule } = useScheduler();
  const { openInterviewSchedule } = useInterviewScheduler();
  const { move, update } = useCandidateMutations();
  const { grade: gradeInterview } = useInterviewMutations();
  const ensureOnboarding = useEnsureOnboarding();
  const toast = useToast();
  const qc = useQueryClient();

  const candidate = candidates.find(c => c.id === id);

  // Replay the stepper entrance animation each time the page (or candidate) loads.
  const [stepIn, setStepIn] = useState(false);
  // Right-side drawer used to fill in a stage's details from the candidate flow.
  const [openForm, setOpenForm] = useState<null | 'screening' | 'hrcall' | 'grade' | 'feedback'>(null);
  const [sr, setSr] = useState<ScreeningReview>(blankScreening());
  const [hc, setHc] = useState<HRCallRecord>(blankHrCall());
  const [gradeScore, setGradeScore] = useState('');
  const [gradeComments, setGradeComments] = useState('');
  // Per-step collapse overrides for the pipeline accordion (default: future steps
  // start collapsed). Keyed by stage index; value = explicitly collapsed?
  const [collapsedSteps, setCollapsedSteps] = useState<Record<number, boolean>>({});
  const [fbInterview, setFbInterview] = useState<Interview | null>(null);
  const [fbRec, setFbRec] = useState('Hire');
  const [fbComments, setFbComments] = useState('');
  // "Send IQ test" / "Send Assessment" modal — the invite id/link is generated up front.
  const [sendTest, setSendTest] = useState<{ kind: 'iq' | 'assignment'; id: string; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!candidate) return;
    setStepIn(false);
    setOpenForm(null);
    const t = setTimeout(() => setStepIn(true), 60);
    return () => clearTimeout(t);
  }, [candidate?.id]);

  // Record HR's screening review (why we're reaching out, what stands out, etc.).
  const saveScreening = useMutation({
    mutationFn: async (review: ScreeningReview) => {
      await repositories.candidates.patch(id, {
        screeningReview: { ...review, reviewedDate: review.reviewedDate ?? new Date().toISOString() },
      });
      return review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.candidates.all });
      setOpenForm(null);
      toast.success('Screening notes saved.');
    },
    onError: () => toast.error('Could not save screening notes — try again.'),
  });

  // Record the HR introductory call outcome from the candidate's own flow.
  const saveHrCall = useMutation({
    mutationFn: async (record: HRCallRecord) => {
      const patch: Partial<{ hrCall: HRCallRecord; status: CandidateStatus }> = {
        hrCall: { ...record, completedDate: record.completedDate ?? new Date().toISOString() },
      };
      if (record.nextStep === 'Reject') patch.status = 'Rejected';
      await repositories.candidates.patch(id, patch);
      return record;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.candidates.all });
      setOpenForm(null);
      toast.success('HR call details saved.');
    },
    onError: () => toast.error('Could not save the HR call — try again.'),
  });

  // Grade the take-home assignment from the candidate's own flow — a pass
  // schedules the interview; a fail rejects the candidate and emails them.
  const gradeAssignment = useMutation({
    mutationFn: async ({ invite, value, notes }: { invite: TestInvite; value: number; notes: string }) => {
      const passed = value >= ASSIGNMENT_PASS_MARKS;
      await repositories.testInvites.patch(invite.id, {
        status: 'Graded',
        score: value,
        passed,
        gradeComments: notes,
      });
      if (!passed) {
        // Reject on a failed assessment — no result email is sent to the candidate.
        await repositories.candidates.patch(invite.candidateId, { status: 'Rejected' }).catch(() => {});
      }
      return { invite, passed };
    },
    onSuccess: ({ invite, passed }) => {
      qc.invalidateQueries({ queryKey: qk.testInvites.all });
      qc.invalidateQueries({ queryKey: qk.candidates.all });
      setOpenForm(null);
      setGradeScore('');
      setGradeComments('');
      if (passed) {
        toast.success('Assignment cleared — schedule the interview.');
        openSchedule(invite.candidateId, invite.candidateName, 'Interview');
      } else {
        toast.info('Candidate was not moved forward.');
      }
    },
    onError: () => toast.error('Could not save the grade — try again.'),
  });

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
  // The candidate's résumé (falls back to the first uploaded doc) — opened from the
  // eye icon in the header.
  const resumeDoc = candidateDocs.find(d => d.category === 'resume') ?? candidateDocs[0];
  const openResume = () => {
    if (!resumeDoc) {
      toast.info('No resume uploaded for this candidate yet.');
      return;
    }
    // Stream inline via the preview endpoint so it opens in a tab, not a download.
    window.open(documentPreviewUrl(resumeDoc.id), '_blank', 'noopener,noreferrer');
  };
  const mySchedules = schedules.filter(s => s.candidateId === id && s.status !== 'Cancelled');
  const myIq = iqTests.filter(t => t.candidateId === id);
  const myInterviews = interviews.filter(iv => iv.candidateId === id);
  const myInvites = (invites as TestInvite[]).filter(i => i.candidateId === id);

  // ---- pipeline stage states (shared with the dashboard Kanban) ----
  const hrCallDone = Boolean(candidate.hrCall?.completed);
  const hrCallReached =
    hrCallDone || mySchedules.some(s => s.type === 'HR Call') || candidate.status === 'Moved to HR Call';
  const offerShortlisted = candidate.status === 'Offer Shortlisted';
  const iqInvite = myInvites.find(i => i.kind === 'iq');
  const iqDone = myIq.length > 0 || Boolean(iqInvite && ['Completed', 'Auto-Submitted'].includes(iqInvite.status));
  const iqReached = iqDone || Boolean(iqInvite) || mySchedules.some(s => s.type === 'IQ Test');
  const asgInvite = myInvites.find(i => i.kind === 'assignment');
  const asgDone = asgInvite?.status === 'Graded';
  const asgReached = Boolean(asgInvite) || mySchedules.some(s => s.type === 'Assessment');
  const interviewDone = myInterviews.some(iv => iv.status === 'Completed');
  const interviewReached = myInterviews.length > 0 || mySchedules.some(s => s.type === 'Interview');
  // The in-person round is "reached" once the interview has actually happened
  // (completed or feedback recorded) — scheduling alone only fills Interview Schedule.
  const interviewConducted = interviewDone || myInterviews.some(iv => !!iv.grading);
  const rejected = candidate.status === 'Rejected';
  const selected = candidate.status === 'Selected';
  const decided = rejected || selected;
  const onHold = candidate.status === 'On Hold';

  const stages = [
    { label: 'Applied', Icon: FileText, reached: true, done: true, desc: fmtDate(candidate.appliedDate) },
    {
      label: 'Screening',
      Icon: ShieldCheck,
      reached: true,
      done: Boolean(candidate.screeningReview) || Boolean(candidate.fitRating),
      desc: candidate.screeningReview ? 'Screened' : fit ? `Rated ${fit}` : 'Pending',
    },
    {
      label: 'HR Call',
      Icon: Phone,
      reached: hrCallReached,
      done: hrCallDone,
      desc: hrCallDone ? candidate.hrCall!.nextStep : hrCallReached ? 'Scheduled' : 'Pending',
    },
    {
      label: 'Interview Schedule',
      Icon: CalendarClock,
      reached: interviewReached || candidate.stageDecisions?.['HR Call'] === 'Accepted',
      done: interviewReached,
      desc: interviewReached ? 'Scheduled' : 'Pending',
    },
    {
      label: 'IQ Test',
      Icon: BrainCircuit,
      reached: iqReached || candidate.stageDecisions?.['Interview Schedule'] === 'Accepted',
      done: iqDone,
      desc: myIq[0]
        ? `${myIq[0].qualificationStatus} · ${myIq[0].scorePercentage}%`
        : iqReached
          ? 'Scheduled'
          : 'Pending',
    },
    {
      label: 'Assessment',
      Icon: ClipboardList,
      reached: asgReached || candidate.stageDecisions?.['IQ Test'] === 'Accepted',
      done: asgDone,
      desc: asgDone
        ? asgInvite!.passed
          ? `Cleared · ${asgInvite!.score}%`
          : 'Not selected'
        : asgReached
          ? 'Scheduled'
          : 'Pending',
    },
    {
      label: 'Physical Interview',
      Icon: CalendarDays,
      reached: interviewConducted || candidate.stageDecisions?.['Assessment'] === 'Accepted',
      done: interviewDone,
      desc: interviewDone ? 'Completed' : interviewReached ? 'Awaiting' : 'Pending',
    },
    {
      label: 'Decision',
      Icon: Flag,
      reached: decided || offerShortlisted,
      done: decided,
      desc: selected
        ? 'Selected for role'
        : rejected
          ? 'Rejected'
          : offerShortlisted
            ? 'Shortlisted'
            : 'Pending',
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
    .filter(i => i.kind === 'assessment')
    .forEach(i => {
      if (['Completed', 'Auto-Submitted'].includes(i.status))
        events.push({
          date: i.completedAt ?? i.createdAt,
          title: `Assessment — ${i.passed ? 'cleared' : 'not selected'}`,
          detail: i.score != null ? `${i.score}%${i.correct != null ? ` · ${i.correct}/${i.total}` : ''}` : undefined,
          tone: i.passed ? 'green' : 'red',
        });
      else events.push({ date: i.createdAt, title: 'Assessment sent', tone: 'gray' });
    });
  myInterviews.forEach(iv =>
    events.push({ date: iv.dateTime, title: `${iv.interviewRound} interview`, detail: iv.interviewerName, tone: 'gray' }),
  );
  if (offerShortlisted)
    events.push({ date: candidate.appliedDate, title: 'Shortlisted for the offer', detail: 'Confirmation email sent', tone: 'green' });
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

  const stageDetail = (idx: number): React.ReactNode => {
    const label = stages[idx].label;

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
      const review = candidate.screeningReview;
      const hasAny = Boolean(review) || Boolean(candidate.screeningAnswers?.length);
      if (!hasAny) return empty('No screening notes or questions recorded yet.');
      return (
        <div className="space-y-3">
          {review && (
            <div className="space-y-1.5 rounded-lg border border-[#ECEDF0] bg-[#F1F3F5] p-2.5">
              {SCREENING_CRITERIA.map(c => (
                <div key={c.key} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">{c.label}</span>
                  <span className="font-mono text-[11px] font-bold text-gray-700">{review[c.key] as number}/5</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-[#E4E6EA] pt-1.5">
                <span className="text-[11px] font-semibold text-gray-700">Average</span>
                <span className="font-mono text-[11px] font-bold text-accent-600">{screeningAvg(review).toFixed(1)}/5</span>
              </div>
              {review.remarks && <ReviewRow k="Remarks" v={review.remarks} />}
            </div>
          )}
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
              <p className="rounded-lg bg-[#F1F3F5] p-2.5 text-[11px] italic text-gray-600">
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

    if (label === 'Assessment') {
      if (asgInvite)
        return (
          <div className="space-y-2.5">
            <KV k="Role" v={`${asgInvite.position} MCQ`} />
            <KV k="Result" v={asgInvite.passed ? 'Cleared' : 'Not selected'} />
            <KV k="Score" v={asgInvite.score != null ? `${asgInvite.score}%` : '—'} />
            {asgInvite.correct != null && asgInvite.total != null && (
              <KV k="Correct" v={`${asgInvite.correct} / ${asgInvite.total}`} />
            )}
            {asgInvite.disqualified && (
              <p className="rounded-lg bg-red-50 p-2.5 text-[11px] font-medium text-red-600">
                Disqualified — {asgInvite.violations ?? 0} rule violation(s).
              </p>
            )}
          </div>
        );
      if (asgInvite)
        return (
          <div className="space-y-2.5">
            <KV k="Role" v={`${asgInvite.position} MCQ`} />
            <KV k="Status" v={asgInvite.status} />
            <KV k="Duration" v={`${asgInvite.durationMin} min`} />
            {empty('Role-specific MCQ sent — awaiting the candidate to take it.')}
          </div>
        );
      const s = schedOf('Assessment')[0];
      return empty(s ? `Scheduled for ${fmtDateTime(s.dateTime)}.` : 'Assessment not sent yet.');
    }

    if (label === 'Interview Schedule') {
      if (!myInterviews.length) {
        const s = schedOf('Interview')[0];
        return empty(
          s ? `Interview scheduled for ${fmtDateTime(s.dateTime)}.` : 'No interview scheduled yet.',
        );
      }
      return (
        <div className="space-y-2.5">
          {myInterviews.map(iv => {
            const online = iv.interviewType === 'Online' || iv.meetingMode !== 'In-Person';
            return (
              <div key={iv.id} className="space-y-2 rounded-lg border border-[#ECEDF0] bg-[#F1F3F5] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-gray-800">
                    {online ? 'Online' : 'Offline'} interview
                  </p>
                  <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-gray-500">
                    {iv.status}
                  </span>
                </div>
                <KV k="When" v={fmtDateTime(iv.dateTime)} />
                {iv.interviewerName && iv.interviewerName !== 'To be assigned' && (
                  <KV k="Interviewer" v={iv.interviewerName} />
                )}
                {iv.interviewerEmail && <KV k="Interviewer email" v={iv.interviewerEmail} />}
                <KV k="Mode" v={online ? 'Online' : 'Offline (office)'} />
                <KV
                  k="Invitation email"
                  v={iv.emailStatus === 'Sent' ? 'Sent ✓ (Yes)' : iv.emailStatus || 'Not sent'}
                />
                <KV k="Calendar invite" v={iv.emailStatus === 'Sent' ? 'Sent ✓ (Yes)' : 'Not sent'} />
                {iv.emailStatus === 'Sent' && (
                  <div className="mt-1 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 size={12} /> Candidate invited — calendar event sent; expected to attend on{' '}
                    {fmtDateTime(iv.dateTime)}
                  </div>
                )}
                {iv.additionalNotes && (
                  <p className="rounded bg-white/60 p-2 text-[11px] italic text-gray-600">
                    “{iv.additionalNotes}”
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (label === 'Physical Interview') {
      if (!interviewReached) return empty('Schedule the interview first.');
      const anyResponses = myInterviews.some(iv => iv.questionResponses?.length);
      if (!interviewConducted && !anyResponses)
        return empty('Interview scheduled — feedback not recorded yet.');
      return (
        <div className="space-y-2.5">
          {myInterviews.map(iv => (
            <div key={iv.id} className="rounded-lg border border-[#ECEDF0] bg-[#F1F3F5] p-2.5">
              <p className="text-[12px] font-semibold text-gray-800">
                {iv.interviewRound} · {iv.status}
              </p>
              <p className="text-[11px] text-gray-500">
                {iv.interviewerName} · {fmtDateTime(iv.dateTime)}
              </p>
              {iv.grading && (
                <p className="mt-1 text-[11px] text-gray-600">
                  <span className="font-semibold">{iv.grading.recommendation}</span> — “
                  {iv.grading.interviewerComments}”
                </p>
              )}
              {iv.questionResponses && iv.questionResponses.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-[#E4E6EA] pt-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                    Interviewer responses
                  </p>
                  {iv.questionResponses.map((r, i) => (
                    <div key={i}>
                      <p className="text-[12px] text-gray-700">
                        {i + 1}. {r.text}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-600">
                        {r.selected ? (
                          <span className="text-emerald-700">Answered: {r.selected}</span>
                        ) : (
                          <span className="text-gray-400">No answer recorded</span>
                        )}
                        {r.note ? <span className="text-gray-500"> · {r.note}</span> : null}
                      </p>
                    </div>
                  ))}
                </div>
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
          : offerShortlisted
            ? 'Shortlisted for the offer — a confirmation email was sent asking the candidate to confirm their availability. Finalize with “Select for role” when ready.'
            : 'No final decision yet.',
    );
  };

  // ---- the next round to schedule from this candidate's flow ----
  // The next round to schedule — only suggested once the prior round is actually
  // done (a scheduled-but-incomplete round shows "in progress" instead).
  const nextRound: ScheduleType | null = decided
    ? null
    : !hrCallReached
      ? 'HR Call'
      : !iqReached
        ? 'IQ Test'
        : iqDone && !asgReached
          ? 'Assessment'
          : asgDone && asgInvite?.passed && !interviewReached
            ? 'Interview'
            : null;
  const roundLabel: Record<ScheduleType, string> = {
    'HR Call': 'Schedule HR call',
    'IQ Test': 'Schedule IQ test',
    Assessment: 'Send assignment',
    Interview: 'Schedule interview',
  };

  const schedule = (type: ScheduleType) =>
    type === 'Interview'
      ? openInterviewSchedule(candidate)
      : openSchedule(candidate.id, candidate.fullName, type);

  const selectForRole = () => {
    move.mutate({ id: candidate.id, status: 'Selected' });
    // Selecting confirms the hire — move them into onboarding regardless of email delivery.
    ensureOnboarding.mutate(candidate, {
      onError: () => toast.error('Selected, but could not start onboarding — try again.'),
    });
    if (!candidate.email) {
      toast.info('Selected & moved to onboarding, but no email on file — candidate not notified.');
      return;
    }
    sendTestEmail({
      to: candidate.email,
      candidateName: candidate.fullName,
      template: 'offer_selected',
      position: candidate.appliedRole || candidate.department,
    })
      .then(res => {
        if (res.sent) toast.success('Selected — onboarding started, availability email sent.');
        else if (res.reason === 'not_configured')
          toast.info('Selected & moved to onboarding. Email not sent — SMTP is not configured yet.');
        else toast.info('Selected & moved to onboarding, but the candidate was not emailed.');
      })
      .catch(() => toast.error('Selected & moved to onboarding, but sending the email failed.'));
  };

  // First positive decision after the interview: shortlist for the offer and send
  // a confirmation email. "Select for role" then finalizes it.
  const shortlistForOffer = () => {
    move.mutate({ id: candidate.id, status: 'Offer Shortlisted' });
    if (!candidate.email) {
      toast.info('Shortlisted, but no email on file — candidate not notified.');
      return;
    }
    sendTestEmail({
      to: candidate.email,
      candidateName: candidate.fullName,
      template: 'offer_shortlisted',
      position: candidate.appliedRole || candidate.department,
    })
      .then(res => {
        if (res.sent) toast.success('Shortlisted — confirmation email sent.');
        else if (res.reason === 'not_configured')
          toast.info('Shortlisted. Email not sent — SMTP is not configured yet.');
        else toast.info('Shortlisted, but the candidate was not emailed.');
      })
      .catch(() => toast.error('Shortlisted, but sending the email failed.'));
  };

  const rejectCandidate = () => {
    move.mutate({ id: candidate.id, status: 'Rejected' });
    toast.info('Candidate marked as rejected.');
  };

  // ---- per-stage Accept / On Hold / Reject gate ----
  const decisionOf = (label: string): StageDecision | undefined => candidate.stageDecisions?.[label];

  const setStageDecision = (label: string, decision: StageDecision, status?: CandidateStatus) => {
    const stageDecisions = { ...(candidate.stageDecisions ?? {}), [label]: decision };
    update.mutate({ ...candidate, stageDecisions, ...(status ? { status } : {}) });
  };

  const acceptStage = (label: string) => {
    const intoHrCalls = (label === 'Screening' || label === 'Applied') && !hrCallReached;
    // Accepting screening forwards the candidate into the HR Calls flow; any
    // accept also un-holds a paused candidate.
    const status: CandidateStatus | undefined = intoHrCalls
      ? 'Moved to HR Call'
      : candidate.status === 'On Hold'
        ? 'Under Review'
        : undefined;
    setStageDecision(label, 'Accepted', status);
    toast.success(
      intoHrCalls
        ? 'Screening accepted — candidate moved to HR Calls.'
        : `${label} accepted — you can move to the next step.`,
    );
  };
  const holdStage = (label: string) => {
    setStageDecision(label, 'On Hold', 'On Hold');
    toast.info(`Candidate placed on hold at ${label}.`);
  };
  // From Interview Schedule onward there's no accept/hold gate — just "Next",
  // which always advances the candidate to the following stage.
  const nextStage = (label: string) => {
    setStageDecision(label, 'Accepted');
    toast.success('Moved to the next step.');
  };

  // ---- Send IQ test / Send Assessment (manual, editable email) ----
  const openSendTest = (kind: 'iq' | 'assignment') => {
    const id = randomToken('TIV');
    const path = kind === 'iq' ? 'test' : 'assessment';
    const url = `${window.location.origin}/${path}/${id}`;
    setSendTest({ kind, id, url });
  };

  const confirmSendTest = async (r: SendTestResult) => {
    if (!sendTest) return;
    const { kind, id } = sendTest;
    const position = candidate.appliedRole || candidate.department || 'the role';
    const invite: TestInvite = {
      id,
      kind,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      email: r.to,
      position,
      department: candidate.department,
      jobId: candidate.jobId,
      durationMin: kind === 'iq' ? IQ_DURATION_MIN : 0,
      status: 'Pending',
      // Assessment carries Question-Library questions the candidate answers on the
      // public assessment link (auto-scored), not a take-home upload.
      ...(kind === 'assignment' && r.questions ? { assessmentQuestions: r.questions } : {}),
      createdAt: nowISO(),
    };
    setSendTest(null);
    try {
      await repositories.testInvites.create(invite);
    } catch {
      toast.error('Could not create the test — please try again.');
      return;
    }
    qc.invalidateQueries({ queryKey: qk.testInvites.all });

    const label = kind === 'iq' ? 'IQ test' : 'Assessment';
    try {
      const res = await sendCustomEmail({ to: r.to, subject: r.subject, body: r.body });
      repositories.sentEmails
        .create({
          id: randomId('EML'),
          recipientName: candidate.fullName,
          recipientEmail: r.to,
          templateTitle: `${label} invite`,
          subject: r.subject,
          dateSent: nowISO(),
          status: res.sent ? 'Sent' : 'Failed',
          relatedEntity: candidate.fullName,
        })
        .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
        .catch(() => {});
      toast.success(res.sent ? `${label} link sent to the candidate.` : `${label} created — email could not be sent.`);
    } catch {
      toast.error(`${label} created, but sending the email failed.`);
    }
  };
  const rejectStage = (label: string) => {
    setStageDecision(label, 'Rejected', 'Rejected');
    toast.info('Candidate marked as rejected.');
  };

  const openScreening = () => {
    setSr(candidate.screeningReview ?? blankScreening());
    setOpenForm('screening');
  };
  const updateSr = <K extends keyof ScreeningReview>(key: K, value: ScreeningReview[K]) =>
    setSr(prev => ({ ...prev, [key]: value }));

  const openHrCall = () => {
    setHc(candidate.hrCall ?? {
      ...blankHrCall(),
      currentCtc: candidate.currentCtc ?? '',
      expectedCtc: candidate.expectedCtc ?? '',
      noticePeriodDays: candidate.noticePeriodDays ?? 0,
    });
    setOpenForm('hrcall');
  };
  const updateHc = <K extends keyof HRCallRecord>(key: K, value: HRCallRecord[K]) =>
    setHc(prev => ({ ...prev, [key]: value }));

  const openGrade = () => {
    if (!asgInvite) return;
    setGradeScore(asgInvite.score != null ? String(asgInvite.score) : '');
    setGradeComments(asgInvite.gradeComments ?? '');
    setOpenForm('grade');
  };
  const submitGrade = () => {
    if (!asgInvite) return;
    const value = Number(gradeScore);
    if (Number.isNaN(value) || value < 0 || value > ASSIGNMENT_MAX_MARKS) {
      toast.error(`Enter a score between 0 and ${ASSIGNMENT_MAX_MARKS}.`);
      return;
    }
    gradeAssignment.mutate({ invite: asgInvite, value, notes: gradeComments });
  };

  const openFeedback = (iv: Interview) => {
    setFbInterview(iv);
    setFbRec(iv.grading?.recommendation ?? 'Hire');
    setFbComments(iv.grading?.interviewerComments ?? '');
    setOpenForm('feedback');
  };
  const submitFeedback = () => {
    if (!fbInterview) return;
    gradeInterview.mutate(
      { interviewId: fbInterview.id, recommendation: fbRec, comments: fbComments },
      {
        onSuccess: () => {
          toast.success('Interview feedback saved.');
          setOpenForm(null);
          setFbInterview(null);
        },
        onError: () => toast.error('Could not save feedback — try again.'),
      },
    );
  };

  const latestInterview = myInterviews[myInterviews.length - 1];

  // Future, still-open interviews — surfaced in the "Upcoming interviews" card.
  const upcomingInterviews = myInterviews
    .filter(iv => iv.status !== 'Cancelled' && iv.status !== 'Completed')
    .filter(iv => {
      const t = new Date(iv.dateTime).getTime();
      return !Number.isNaN(t) && t >= Date.now() - 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const scheduleBtn = (type: ScheduleType, text: string, primary = true) => (
    <Button key={text} size="sm" variant={primary ? 'default' : 'outline'} onClick={() => schedule(type)}>
      <CalendarPlus size={13} /> {text}
    </Button>
  );

  const stageActions = (idx: number): React.ReactNode => {
    const label = stages[idx].label;
    const btns: React.ReactNode[] = [];

    if (label === 'Screening')
      btns.push(
        <Button key="screen" size="sm" variant="outline" onClick={openScreening}>
          <ClipboardList size={13} /> {candidate.screeningReview ? 'Edit screening notes' : 'Record screening'}
        </Button>,
      );

    if (label === 'HR Call' && hrCallReached && !decided)
      btns.push(
        <Button key="hrform" size="sm" onClick={openHrCall}>
          <Phone size={13} /> {candidate.hrCall?.completed ? 'Edit call notes' : 'Record HR call'}
        </Button>,
      );

    if (label === 'IQ Test') {
      const iqPassed = myIq[0]?.qualificationStatus === 'Passed';
      if (!iqReached)
        btns.push(
          <Button key="sendiq" size="sm" onClick={() => openSendTest('iq')}>
            <Send size={13} /> Send IQ test
          </Button>,
        );
      // Failed, disqualified, or any other issue — re-assign a fresh link.
      else if (!iqPassed)
        btns.push(
          <Button key="resendiq" size="sm" variant="outline" onClick={() => openSendTest('iq')}>
            <Send size={13} /> Re-assign IQ test
          </Button>,
        );
    }

    if (label === 'Assessment') {
      if (!asgReached)
        btns.push(
          <Button key="sendasm" size="sm" onClick={() => openSendTest('assignment')}>
            <Send size={13} /> Send Assessment
          </Button>,
        );
      if (asgInvite?.status === 'Submitted')
        btns.push(
          <Button key="grade" size="sm" onClick={openGrade}>
            <Star size={13} /> Grade submission
          </Button>,
        );
      if (asgInvite?.status === 'Graded')
        btns.push(
          <Button key="review" size="sm" variant="outline" onClick={openGrade}>
            <CheckCircle2 size={13} /> Review grade
          </Button>,
        );
      // Failed or hasn't completed it (any issue) — re-assign a fresh link.
      if (
        asgReached &&
        asgInvite &&
        asgInvite.status !== 'Submitted' &&
        !(asgInvite.status === 'Graded' && asgInvite.passed)
      )
        btns.push(
          <Button
            key="resendasm"
            size="sm"
            variant="outline"
            onClick={() => openSendTest('assignment')}
          >
            <Send size={13} /> Re-assign Assessment
          </Button>,
        );
    }

    if (label === 'Interview Schedule') {
      if (!interviewReached) btns.push(scheduleBtn('Interview', 'Schedule Interview'));
    }

    if (label === 'Physical Interview') {
      if (latestInterview)
        btns.push(
          <Button key="fb" size="sm" variant="outline" onClick={() => openFeedback(latestInterview)}>
            <MessageSquarePlus size={13} /> {latestInterview.grading ? 'Edit feedback' : 'Add feedback'}
          </Button>,
        );
      if (latestInterview && !decided)
        btns.push(
          <Button key="select" size="sm" onClick={selectForRole}>
            <Award size={13} /> Select for role
          </Button>,
        );
    }

    if (label === 'Decision' && !decided) {
      // Reached only once shortlisted — let HR finalize the offer or step back.
      if (!offerShortlisted && interviewDone)
        btns.push(
          <Button key="d-shortlist" size="sm" onClick={shortlistForOffer}>
            <UserCheck size={13} /> Shortlist for offer
          </Button>,
        );
      if (offerShortlisted) {
        btns.push(
          <Button key="d-select" size="sm" onClick={selectForRole}>
            <Award size={13} /> Select for role
          </Button>,
        );
        btns.push(
          <Button key="d-reject" size="sm" variant="outline" onClick={rejectCandidate}>
            <ThumbsDown size={13} /> Reject
          </Button>,
        );
      }
    }

    if (!btns.length) return null;
    return <div className="mt-4 flex flex-wrap gap-2 border-t border-[#ECEDF0] pt-3">{btns}</div>;
  };

  // The Accept / On Hold / Reject (or Next) gate shown in each step's header.
  const stageGate = (idx: number): React.ReactNode => {
    const label = stages[idx].label;
    // Actionable on any reached stage at or before the candidate's current position,
    // as long as they haven't been finally selected/rejected.
    const isCurrent = idx <= currentIndex && !decided;
    const showGate = isCurrent && ['Applied', 'Screening', 'HR Call'].includes(label);
    const showResultDecision =
      isCurrent && ((label === 'IQ Test' && iqDone) || (label === 'Assessment' && asgDone));
    const showNext = isCurrent && label === 'Interview Schedule' && interviewReached;

    if (showGate || showResultDecision)
      return (
        <>
          <button
            onClick={() => acceptStage(label)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check size={12} /> Accept
          </button>
          <button
            onClick={() => holdStage(label)}
            className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-[#EDEEF1]"
          >
            <Pause size={12} /> On Hold
          </button>
          <button
            onClick={() => rejectStage(label)}
            className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
          >
            <ThumbsDown size={12} /> Reject
          </button>
        </>
      );

    if (showNext)
      return (
        <button
          onClick={() => nextStage(label)}
          className="inline-flex items-center gap-1 rounded-md bg-accent-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-accent-700"
        >
          Next <ChevronRight size={12} />
        </button>
      );

    return (
      <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-gray-500">
        {stages[idx].desc}
      </span>
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* LEFT — profile, contact, documents */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 text-center shadow-2xs">
            <div className="relative mx-auto w-fit">
              <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-2xl font-bold text-white">
                {candidate.fullName.slice(0, 2).toUpperCase()}
              </span>
              <span
                className={`absolute bottom-1 right-1 size-4 rounded-full ring-4 ring-[#FFFFFF] ${
                  selected ? 'bg-emerald-500' : rejected ? 'bg-red-500' : onHold ? 'bg-yellow-500' : 'bg-accent-500'
                }`}
              />
            </div>
            <h1 className="mt-3 font-display text-base font-bold text-gray-900">{candidate.fullName}</h1>
            <p className="text-[12px] text-gray-500">{candidate.appliedRole}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              <span className="rounded-full bg-accent-50 px-2 py-0.5 font-mono text-[9px] font-bold text-accent-600">
                {candidate.status}
              </span>
              {fit && (
                <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${fitStyle(fit)}`}>
                  {fit}
                  {candidate.fitRatingOverride && <span className="ml-0.5 opacity-60">*</span>}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2.5">
              <a
                href={candidate.phone ? `tel:${candidate.phone}` : undefined}
                aria-label="Call candidate"
                className="grid size-10 place-items-center rounded-full bg-accent-50 text-accent-600 transition hover:bg-accent-100"
              >
                <Phone size={16} />
              </a>
              <a
                href={candidate.email ? `mailto:${candidate.email}` : undefined}
                aria-label="Email candidate"
                className="grid size-10 place-items-center rounded-full bg-accent-50 text-accent-600 transition hover:bg-accent-100"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {/* Contact details */}
          <div className="space-y-2.5 rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Details</h3>
              <span className="font-mono text-[10px] text-gray-400">{candidate.id}</span>
            </div>
            <Detail icon={<Mail size={13} />} value={candidate.email} />
            <Detail icon={<Phone size={13} />} value={candidate.phone || '—'} />
            <Detail icon={<MapPin size={13} />} value={candidate.location || '—'} />
            <Detail
              icon={<Briefcase size={13} />}
              value={`${candidate.currentCompany || '—'} · ${candidate.currentDesignation || '—'}`}
            />
            <Detail
              icon={<Clock4 size={13} />}
              value={`${candidate.totalExperienceYears} yrs · ${candidate.noticePeriodDays}d notice`}
            />
            <Detail
              icon={<Wallet size={13} />}
              value={`Current ${candidate.currentCtc || '—'} → Expected ${candidate.expectedCtc || '—'}`}
            />
            <Detail
              icon={<CalendarDays size={13} />}
              value={`Applied ${fmtDate(candidate.appliedDate)} · ${candidate.sourceOfApplication}`}
            />
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 shadow-2xs">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Documents</h3>
            <button
              onClick={openResume}
              className="flex w-full items-center gap-2 rounded-lg border border-[#ECEDF0] bg-[#F7F8FA] px-3 py-2 text-left text-[12px] font-medium text-gray-700 transition hover:bg-[#EDEEF1] hover:text-accent-600"
            >
              <FileText size={14} className="text-accent-600" /> Résumé
              <Eye size={13} className="ml-auto text-gray-400" />
            </button>
            {candidateDocs.length > 0 && (
              <p className="mt-2 font-mono text-[10px] text-gray-400">{candidateDocs.length} document(s) on file</p>
            )}
          </div>
        </aside>

        {/* CENTER — pipeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] px-4 py-3 shadow-2xs">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Pipeline progress
              </p>
              <p className="truncate text-[12px] text-gray-700">
                {candidate.appliedRole} · {candidate.department}
              </p>
            </div>
            {nextRound && decisionOf(stages[currentIndex].label) === 'Accepted' ? (
              <button
                onClick={() => schedule(nextRound)}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-700"
              >
                <CalendarPlus size={14} /> {roundLabel[nextRound]}
              </button>
            ) : (
              <span
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                  selected
                    ? 'bg-emerald-50 text-emerald-700'
                    : rejected
                      ? 'bg-red-50 text-red-600'
                      : onHold
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-[#F1F3F5] text-gray-500'
                }`}
              >
                {selected ? (
                  <Award size={14} />
                ) : rejected ? (
                  <Flag size={14} />
                ) : onHold ? (
                  <Pause size={14} />
                ) : (
                  <Clock4 size={14} />
                )}
                {selected ? 'Selected for role' : rejected ? 'Rejected' : onHold ? 'On hold' : 'Round in progress'}
              </span>
            )}
          </div>

          <div
            className="rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 shadow-2xs transition-all duration-500 ease-out"
            style={{ opacity: stepIn ? 1 : 0, transform: stepIn ? 'translateY(0)' : 'translateY(10px)' }}
          >
            <ol className="relative">
          {stages.map((stage, i) => {
            const state = stepState(i);
            const StageIcon = stage.Icon;
            const last = i === stages.length - 1;
            const pathDone = i < currentIndex; // the rail below this node is already travelled
            const muted = state === 'todo';
            const badgeCls =
              state === 'done'
                ? 'bg-emerald-600 text-white'
                : state === 'rejected'
                  ? 'bg-red-600 text-white'
                  : state === 'current'
                    ? 'bg-accent-600 text-white ring-4 ring-accent-100'
                    : 'bg-[#EDEEF1] text-gray-500';
            // Accordion: future (todo) steps start collapsed; any step can be toggled.
            const isCollapsed = collapsedSteps[i] ?? state === 'todo';
            const toggleStep = () => setCollapsedSteps(prev => ({ ...prev, [i]: !isCollapsed }));
            return (
              <li
                key={stage.label}
                className="relative flex gap-3 transition-all duration-500 sm:gap-4"
                style={{
                  transitionDelay: `${i * 80}ms`,
                  opacity: stepIn ? 1 : 0,
                  transform: stepIn ? 'translateY(0)' : 'translateY(8px)',
                }}
              >
                {/* Rail: "Step N" badge + connector */}
                <div className="flex flex-col items-center">
                  <span
                    className={`grid h-7 place-items-center whitespace-nowrap rounded-md px-2.5 text-[11px] font-bold shadow-sm transition-all duration-300 ${badgeCls}`}
                  >
                    {state === 'done' ? (
                      <span className="flex items-center gap-1">
                        <Check size={12} strokeWidth={2.5} /> Step {i + 1}
                      </span>
                    ) : (
                      <>Step {i + 1}</>
                    )}
                  </span>
                  {!last && (
                    <span
                      className={`my-1.5 w-0 flex-1 border-l-2 ${
                        pathDone ? 'border-emerald-400' : 'border-dashed border-[#D7DAE0]'
                      }`}
                    />
                  )}
                </div>

                {/* Content card */}
                <div className={`min-w-0 flex-1 ${last ? 'pb-1' : 'pb-5'}`}>
                  <div
                    className={`rounded-xl border p-4 transition-all ${
                      state === 'current'
                        ? 'border-accent-200 bg-[#F7F8FA] shadow-2xs'
                        : 'border-[#ECEDF0] bg-[#F7F8FA]'
                    } ${muted ? 'opacity-80' : ''}`}
                  >
                    <div className={`flex items-center gap-2 ${isCollapsed ? '' : 'mb-3 border-b border-[#ECEDF0] pb-2.5'}`}>
                      <button
                        type="button"
                        onClick={toggleStep}
                        className="flex min-w-0 items-center gap-2 text-left"
                        aria-expanded={!isCollapsed}
                      >
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                            muted ? 'bg-[#F1F3F5] text-gray-400' : 'bg-accent-50 text-accent-600'
                          }`}
                        >
                          <StageIcon size={14} />
                        </span>
                        <h4 className={`truncate text-sm font-bold ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
                          {stage.label}
                        </h4>
                        {isCollapsed && (
                          <span className="truncate font-mono text-[10px] text-gray-400">· {stage.desc}</span>
                        )}
                      </button>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {!isCollapsed && stageGate(i)}
                        <button
                          type="button"
                          onClick={toggleStep}
                          aria-label={isCollapsed ? 'Expand step' : 'Collapse step'}
                          className="grid size-6 shrink-0 place-items-center rounded-md text-gray-400 transition hover:bg-[#EDEEF1] hover:text-gray-700"
                        >
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <>
                        {stageDetail(i)}
                        {stageActions(i)}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
            </ol>
          </div>
        </div>

        {/* RIGHT — activity feed + upcoming interviews */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 shadow-2xs">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Activity</h3>
            <ol className="relative space-y-4 border-l border-[#E4E6EA] pl-5">
              {events.map((ev, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[23px] top-1 size-2.5 rounded-full ring-4 ring-[#FFFFFF] ${toneDot[ev.tone]}`}
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

          {upcomingInterviews.length > 0 && (
            <div className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 shadow-2xs">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <CalendarClock size={14} className="text-accent-600" /> Upcoming interviews
              </h3>
              <div className="space-y-2.5">
                {upcomingInterviews.map(iv => {
                  const online = iv.interviewType === 'Online' || iv.meetingMode !== 'In-Person';
                  return (
                    <div key={iv.id} className="rounded-lg border border-[#ECEDF0] bg-[#F7F8FA] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-gray-800">
                          {online ? 'Online' : 'Offline'} interview
                        </p>
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 font-mono text-[9px] font-bold text-accent-600">
                          {iv.status}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-600">
                        <CalendarDays size={11} className="text-gray-400" /> {fmtDateTime(iv.dateTime)}
                      </p>
                      {iv.interviewerName && iv.interviewerName !== 'To be assigned' && (
                        <p className="mt-0.5 text-[11px] text-gray-500">Interviewer: {iv.interviewerName}</p>
                      )}
                      {iv.emailStatus && (
                        <p className="mt-1 font-mono text-[10px] text-gray-400">Invite email: {iv.emailStatus}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Right-side drawer — fill in the details for the active stage */}
      <Sheet open={openForm !== null} onOpenChange={open => !open && setOpenForm(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {openForm === 'screening' && <ShieldCheck size={15} className="text-accent-600" />}
              {openForm === 'hrcall' && <Phone size={15} className="text-accent-600" />}
              {openForm === 'grade' && <Star size={15} className="text-accent-600" />}
              {openForm === 'feedback' && <MessageSquarePlus size={15} className="text-accent-600" />}
              {openForm === 'screening'
                ? 'Screening review'
                : openForm === 'hrcall'
                  ? 'HR introductory call'
                  : openForm === 'grade'
                    ? 'Grade assignment'
                    : openForm === 'feedback'
                      ? `Interview feedback${fbInterview ? ` — ${fbInterview.interviewRound}` : ''}`
                      : ''}
            </SheetTitle>
            <SheetDescription>
              {candidate.fullName} · {candidate.appliedRole}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-4">
            {/* Screening review form */}
            {openForm === 'screening' && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2">
                  <p className="text-[11px] italic text-gray-500">
                    Capture why this candidate is worth a call and what stands out.
                  </p>
                  {fit && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${fitStyle(fit)}`}>
                      {fit}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <SectionLabel>Screening ratings</SectionLabel>
                  {SCREENING_CRITERIA.map(c => (
                    <div key={c.key} className="flex items-center justify-between gap-3">
                      <label className="font-semibold text-gray-700">{c.label}</label>
                      <RatingRow
                        value={sr[c.key] as number}
                        onChange={v => updateSr(c.key, v as ScreeningReview[typeof c.key])}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-lg bg-[#F7F8FA] px-3 py-2">
                    <span className="font-semibold text-gray-700">Average</span>
                    <span className="font-mono text-sm font-bold text-accent-600">
                      {screeningAvg(sr).toFixed(1)} / 5
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionLabel>Summary</SectionLabel>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">Overall screening remarks</label>
                    <textarea
                      placeholder="Your overall read on this candidate before the HR call…"
                      value={sr.remarks}
                      onChange={e => updateSr('remarks', e.target.value)}
                      rows={3}
                      className={FIELD_CLS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* HR call form — grouped sections + rating pills */}
            {openForm === 'hrcall' && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2">
                  <p className="text-[11px] italic text-gray-500">
                    Document the candidate call securely.
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      candidate.hrCall?.completed
                        ? 'bg-green-50 text-green-600'
                        : 'bg-yellow-50 text-yellow-600'
                    }`}
                  >
                    {candidate.hrCall?.completed ? 'Completed' : 'Pending Call'}
                  </span>
                </div>

                {/* Engagement ratings */}
                <div className="space-y-3">
                  <SectionLabel>Engagement</SectionLabel>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Communication Quality</label>
                      <RatingRow value={hc.communicationRating} onChange={v => updateHc('communicationRating', v)} />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Interest Level</label>
                      <RatingRow value={hc.interestLevel} onChange={v => updateHc('interestLevel', v)} />
                    </div>
                  </div>
                </div>

                {/* Availability & compensation */}
                <div className="space-y-3">
                  <SectionLabel>Availability & Compensation</SectionLabel>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Availability to Join</label>
                      <input
                        type="text"
                        placeholder="Immediate, 15 days, 1 month..."
                        value={hc.candidateAvailability}
                        onChange={e => updateHc('candidateAvailability', e.target.value)}
                        className={FIELD_CLS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Notice Period (days)</label>
                      <input
                        type="number"
                        min={0}
                        value={hc.noticePeriodDays}
                        onChange={e => updateHc('noticePeriodDays', Number(e.target.value))}
                        className={FIELD_CLS}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Current CTC (LPA)</label>
                      <input
                        type="text"
                        placeholder="e.g. 12 LPA"
                        value={hc.currentCtc}
                        onChange={e => updateHc('currentCtc', e.target.value)}
                        className={FIELD_CLS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Expected CTC (LPA)</label>
                      <input
                        type="text"
                        placeholder="e.g. 18 LPA"
                        value={hc.expectedCtc}
                        onChange={e => updateHc('expectedCtc', e.target.value)}
                        className={FIELD_CLS}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">Work Mode Preference</label>
                    <select
                      value={hc.workModePreference}
                      onChange={e => updateHc('workModePreference', e.target.value as HRCallRecord['workModePreference'])}
                      className={FIELD_CLS}
                    >
                      <option value="Onsite">Onsite</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Assessment notes */}
                <div className="space-y-3">
                  <SectionLabel>Assessment Notes</SectionLabel>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">Professional Background Summary</label>
                    <textarea
                      placeholder="Brief technical stack & experience outline..."
                      value={hc.professionalBackgroundSummary}
                      onChange={e => updateHc('professionalBackgroundSummary', e.target.value)}
                      rows={3}
                      className={FIELD_CLS}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Role Understanding</label>
                      <input
                        type="text"
                        placeholder="How well they grasp the role"
                        value={hc.roleUnderstanding}
                        onChange={e => updateHc('roleUnderstanding', e.target.value)}
                        className={FIELD_CLS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-700">Reason for Job Change</label>
                      <input
                        type="text"
                        placeholder="e.g. Looking for growth"
                        value={hc.reasonForJobChange}
                        onChange={e => updateHc('reasonForJobChange', e.target.value)}
                        className={FIELD_CLS}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">Cultural Fit Remarks</label>
                    <input
                      type="text"
                      placeholder="Attitude matches our horizontal principles..."
                      value={hc.culturalFitRemarks}
                      onChange={e => updateHc('culturalFitRemarks', e.target.value)}
                      className={FIELD_CLS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">HR Recommendation</label>
                    <textarea
                      placeholder="Your overall recommendation on this candidate..."
                      value={hc.hrRecommendation}
                      onChange={e => updateHc('hrRecommendation', e.target.value)}
                      rows={2}
                      className={FIELD_CLS}
                    />
                  </div>
                </div>

                {/* Outcome */}
                <div className="space-y-3">
                  <SectionLabel>Outcome</SectionLabel>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700">Recommended Next Step</label>
                    <select
                      value={hc.nextStep}
                      onChange={e => updateHc('nextStep', e.target.value as HRCallRecord['nextStep'])}
                      className={FIELD_CLS}
                    >
                      <option value="Proceed to Interview">Proceed to Panel Interview</option>
                      <option value="Schedule Follow-Up Call">Schedule Follow-Up Call</option>
                      <option value="Request More Information">Request More Information</option>
                      <option value="Keep on Hold">Keep on Hold</option>
                      <option value="Reject">Reject Candidate</option>
                    </select>
                  </div>
                  {hc.nextStep === 'Reject' && (
                    <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-600">
                      Completing will mark the candidate as rejected.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Grade assignment form */}
            {openForm === 'grade' && (
              <>
                {asgInvite?.submissionDocId && (
                  <button
                    onClick={() => openDocument(asgInvite.submissionDocId!)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-secondary cursor-pointer"
                  >
                    <Download size={14} /> {asgInvite.submissionFileName ?? 'Download submission'}
                  </button>
                )}
                <div>
                  <Label htmlFor="grade-score" className="text-sm font-medium">
                    Score (out of {ASSIGNMENT_MAX_MARKS}) — pass ≥ {ASSIGNMENT_PASS_MARKS}
                  </Label>
                  <Input
                    id="grade-score"
                    type="number"
                    min={0}
                    max={ASSIGNMENT_MAX_MARKS}
                    value={gradeScore}
                    onChange={e => setGradeScore(e.target.value)}
                    placeholder="e.g. 72"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="grade-comments" className="text-sm font-medium">
                    Evaluator comments
                  </Label>
                  <Textarea
                    id="grade-comments"
                    value={gradeComments}
                    onChange={e => setGradeComments(e.target.value)}
                    placeholder="Strengths, gaps, overall assessment…"
                    rows={4}
                    className="mt-2"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  A pass schedules the interview and notifies the candidate. A fail marks them not
                  selected and sends the outcome email.
                </p>
              </>
            )}

            {/* Interview feedback form */}
            {openForm === 'feedback' && (
              <>
                <div>
                  <Label htmlFor="fb-rec" className="text-sm font-medium">
                    Recommendation
                  </Label>
                  <select
                    id="fb-rec"
                    value={fbRec}
                    onChange={e => setFbRec(e.target.value)}
                    className={SELECT_CLS}
                  >
                    <option value="Strong Hire">Strong Hire</option>
                    <option value="Hire">Hire</option>
                    <option value="Hold">Hold</option>
                    <option value="Re-Interview Required">Re-Interview Required</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="fb-comments" className="text-sm font-medium">
                    Interviewer comments
                  </Label>
                  <Textarea
                    id="fb-comments"
                    value={fbComments}
                    onChange={e => setFbComments(e.target.value)}
                    placeholder="Strengths, concerns, overall fit…"
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </>
            )}
          </SheetBody>

          <SheetFooter className="justify-end">
            <Button variant="outline" onClick={() => setOpenForm(null)}>
              Cancel
            </Button>
            {openForm === 'screening' && (
              <Button onClick={() => saveScreening.mutate(sr)} disabled={saveScreening.isPending}>
                Save screening
              </Button>
            )}
            {openForm === 'hrcall' && (
              <Button onClick={() => saveHrCall.mutate(hc)} disabled={saveHrCall.isPending}>
                Complete HR Call
              </Button>
            )}
            {openForm === 'grade' && (
              <Button onClick={submitGrade} disabled={gradeAssignment.isPending}>
                Save grade
              </Button>
            )}
            {openForm === 'feedback' && (
              <Button onClick={submitFeedback} disabled={gradeInterview.isPending}>
                Save feedback
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {sendTest && (
        <SendTestModal
          candidate={candidate}
          kind={sendTest.kind}
          testUrl={sendTest.url}
          onClose={() => setSendTest(null)}
          onConfirm={confirmSendTest}
        />
      )}
    </div>
  );
}

const SELECT_CLS =
  'mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/40 focus:outline-none';

// Greige field styling that matches the candidate profile feedback panel.
const FIELD_CLS =
  'mt-1.5 w-full rounded-md border border-[#E4E6EA] bg-[#EDEEF1] px-2.5 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

function screeningAvg(r: ScreeningReview): number {
  const vals = [r.resumeRelevance, r.experienceMatch, r.skillMatch, r.standoutFactor, r.communication];
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">{k}</p>
      <p className="text-[12px] text-gray-700">{v}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
      {children}
      <span className="h-px flex-1 bg-[#E4E6EA]" />
    </p>
  );
}

function RatingRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-1.5 flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`grid size-8 place-items-center rounded-md border text-xs font-bold transition ${
            n <= value
              ? 'border-accent-600 bg-accent-600 text-white shadow-sm'
              : 'border-[#E4E6EA] bg-[#EDEEF1] text-gray-400 hover:border-accent-400 hover:text-accent-600'
          }`}
          aria-label={`Rate ${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#ECEDF0] pb-1.5 last:border-0">
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
