'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  Clock4,
  CalendarDays,
  CalendarClock,
  CalendarX,
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
  Info,
  Send,
  Eye,
  Star,
  Download,
  Pencil,
  Link2,
  Linkedin,
  ExternalLink,
} from 'lucide-react';
import {
  CandidateStatus,
  HRCallRecord,
  Interview,
  InterviewQuestionResponse,
  ScheduleType,
  ScreeningReview,
  StageDecision,
  TestInvite,
} from '@/types';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';
import { EditCandidateDialog } from '@/components/EditCandidateDialog';
import { RefreshButton } from '@/components/RefreshButton';
import { useSchedules } from '@/features/schedule/hooks';
import { useInterviews, useInterviewMutations } from '@/features/interviews/hooks';
import { useHrIdentity } from '@/features/employees/hooks';
import { fetchRenderedTemplate } from '@/features/email-templates/hooks';
import { useIqTests } from '@/features/assessments/hooks';
import { useEnsureOnboarding } from '@/features/onboarding/hooks';
import { useScheduler } from '@/store/schedule-store';
import { useInterviewScheduler } from '@/store/interview-schedule-store';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { effectiveFit, fitStyle, FIT_THRESHOLD } from '@/lib/screening';
import { sendTestEmail, sendCustomEmail } from '@/lib/api/notifications';
import { pushCalendarEvent } from '@/lib/api/calendar';
import { BRAND } from '@/lib/brand';
import {
  ASSIGNMENT_MAX_MARKS,
  ASSIGNMENT_PASS_MARKS,
  IQ_DURATION_MIN,
  ASSESSMENT_DURATION_MIN,
} from '@/data/test-banks';
import { randomId, randomToken, nowISO } from '@/lib/utils';
import { SendTestModal, SendTestResult } from '@/components/SendTestModal';
import { useToast } from '@/components/Toaster';
import { openDocument, useDocuments } from '@/features/documents/hooks';
import { documentPreviewUrl } from '@/lib/api/documents';
import { INTERVIEW_MODULES, type InterviewBank } from '@/lib/question-banks';
import { useInterviewBanks, useInterviewKitSends } from '@/features/question-banks/hooks';
import { saveInterviewSheet } from '@/lib/interview-sheet';
import { PageLoading } from '@/components/PageLoading';
import { Select } from '@/components/Select';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

type StepState = 'done' | 'current' | 'todo' | 'rejected';

// One-line description of what each step is — shown under the stage name so the
// feed reads like a narrative of the candidate's journey.
const STAGE_NOTES: Record<string, string> = {
  Applied: 'Candidate submitted their application',
  Screening: 'HR reviews the résumé and overall fit',
  'HR Call': 'Introductory call with the candidate',
  'Interview Schedule': 'Interview date being arranged',
  'IQ Test': 'Logical-reasoning aptitude test',
  Assessment: 'Role-specific skills assessment',
  'Physical Interview': 'In-person interview round',
  Decision: 'Final hiring decision',
};

// Per-stage icon colour shown once the step is DONE. Before that (pending / not
// started) the timeline icon is greyscale (see the rail rendering below).
const STAGE_ICON_COLOR: Record<string, string> = {
  Applied: 'bg-emerald-50 text-emerald-600',
  Screening: 'bg-violet-50 text-violet-600',
  'HR Call': 'bg-blue-50 text-blue-600',
  'Interview Schedule': 'bg-orange-50 text-orange-600',
  'IQ Test': 'bg-purple-50 text-purple-600',
  Assessment: 'bg-green-50 text-green-600',
  'Physical Interview': 'bg-pink-50 text-pink-600',
  Decision: 'bg-red-50 text-red-600',
};

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
  const { data: interviewBanks = [] } = useInterviewBanks();
  const { data: kitSends = [] } = useInterviewKitSends();
  const { data: invites = [] } = useQuery({
    queryKey: qk.testInvites.all,
    queryFn: () => repositories.testInvites.list(),
  });
  const { data: candidateDocs = [] } = useDocuments('candidate', id);
  const { openSchedule } = useScheduler();
  const { openInterviewSchedule, rescheduleInterview, cancelInterview } = useInterviewScheduler();
  const { move, update } = useCandidateMutations();
  const { grade: gradeInterview } = useInterviewMutations();
  const hr = useHrIdentity();
  const ensureOnboarding = useEnsureOnboarding();
  const [editOpen, setEditOpen] = useState(false);
  // Read-only candidate details modal, opened by clicking the header name/avatar.
  const [profileOpen, setProfileOpen] = useState(false);
  // Header quick-mail composer (Reject / Reminder-JD) — a simple to/subject/body
  // form that sends via the notification sender.
  const [mail, setMail] = useState<{
    kind: 'reject' | 'reminder';
    subject: string;
    body: string;
  } | null>(null);
  const [mailSending, setMailSending] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();

  const candidate = candidates.find(c => c.id === id);

  // Replay the stepper entrance animation each time the page (or candidate) loads.
  const [stepIn, setStepIn] = useState(false);
  // Right-side drawer used to fill in a stage's details from the candidate flow.
  const [openForm, setOpenForm] = useState<
    null | 'screening' | 'hrcall' | 'grade' | 'feedback' | 'decision' | 'ivpack'
  >(null);
  // "Send to interviewer" pack (Physical Interview): question bank + email.
  const [ivpackBanks, setIvpackBanks] = useState<InterviewBank[]>([]);
  const [ivpackBankId, setIvpackBankId] = useState('');
  // Interviewer's email — editable, pre-filled from the interview record, so HR
  // can fix/override it right here instead of the send failing silently.
  const [ivpackToEmail, setIvpackToEmail] = useState('');
  const [ivpackSubject, setIvpackSubject] = useState('');
  const [ivpackBody, setIvpackBody] = useState('');
  // Physical Interview mode: Offline emails only the interviewer; Online also
  // auto-creates a Google Meet link (behind the scenes, no Google invite emails
  // to anyone) and emails it to both the candidate and the interviewer.
  const [ivpackMode, setIvpackMode] = useState<'Online' | 'Offline'>('Offline');
  // The interview-questions sheet is generated up front (like the IQ/Assessment
  // link) so its URL — plus the résumé URL — can be shown in the modal before
  // sending. Regenerated when the selected bank changes; reused on submit.
  const [ivpackSheet, setIvpackSheet] = useState<{ token: string; url: string; bankId: string } | null>(
    null,
  );
  const [sr, setSr] = useState<ScreeningReview>(blankScreening());
  const [hc, setHc] = useState<HRCallRecord>(blankHrCall());
  const [gradeScore, setGradeScore] = useState('');
  const [gradeComments, setGradeComments] = useState('');
  // Which stages have their detail "i" panel open. Keyed by stage index; detail is
  // hidden by default and revealed on demand to keep each entry compact.
  // Only one step accordion is open at a time. `null` = the user hasn't chosen
  // yet, so it defaults to the candidate's current step; `-1` = explicitly none.
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [fbInterview, setFbInterview] = useState<Interview | null>(null);
  // The responses shown in the feedback modal — from the interview record, or
  // from a Settings interview-kit that the interviewer answered externally.
  const [fbResponses, setFbResponses] = useState<InterviewQuestionResponse[] | null>(null);
  const [fbRec, setFbRec] = useState('Hire');
  const [fbComments, setFbComments] = useState('');
  // Optional HR-written summary of the physical interview.
  const [fbSummary, setFbSummary] = useState('');
  // Final decision (Decision step): the HR summary + the editable outcome email.
  const [decisionSummary, setDecisionSummary] = useState('');
  const [decisionKind, setDecisionKind] = useState<'accept' | 'reject' | null>(null);
  const [decisionSubject, setDecisionSubject] = useState('');
  const [decisionBody, setDecisionBody] = useState('');
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
      // Record the evaluation only — HR decides next via Accept / On Hold / Reject.
      return { invite, passed };
    },
    onSuccess: ({ passed }) => {
      qc.invalidateQueries({ queryKey: qk.testInvites.all });
      qc.invalidateQueries({ queryKey: qk.candidates.all });
      setOpenForm(null);
      setGradeScore('');
      setGradeComments('');
      toast.success(`Grade saved (${passed ? 'pass' : 'fail'}) — now Accept, On Hold, or Reject the stage.`);
    },
    onError: () => toast.error('Could not save the grade — try again.'),
  });

  if (isLoading) return <PageLoading />;
  if (!candidate) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-sm font-semibold text-gray-700">Candidate not found</p>
        <Link
          href="/candidates"
          className="mt-3 inline-block text-xs font-semibold text-accent-600 hover:underline"
        >
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

  // --- Header quick-mail composers (Reject / Reminder-JD) ---
  const mailRole = candidate.appliedRole || candidate.department || 'the role';
  const openRejectMail = () => {
    if (!candidate.email) {
      toast.error('No email on file for this candidate.');
      return;
    }
    setMail({
      kind: 'reject',
      subject: `Update on your application — ${mailRole}`,
      body: [
        `Dear ${candidate.fullName},`,
        '',
        `Thank you for taking the time to apply for the ${mailRole} role at ${BRAND.company} and for sharing your background with us.`,
        '',
        `After careful consideration, we have decided not to move forward with your application at this stage, as the profile is not the right fit for the requirements of this particular role.`,
        '',
        `This is not a reflection of your abilities, and we encourage you to apply for future openings that match your experience. We wish you the very best in your job search.`,
        '',
        'Warm regards,',
        hr.signoff,
      ].join('\n'),
    });
  };
  const openReminderMail = () => {
    if (!candidate.email) {
      toast.error('No email on file for this candidate.');
      return;
    }
    const jobUrl = candidate.jobId
      ? `${window.location.origin}/jobs/${candidate.jobId}`
      : '';
    setMail({
      kind: 'reminder',
      subject: `A quick reminder about the ${mailRole} role at ${BRAND.company}`,
      body: [
        `Dear ${candidate.fullName},`,
        '',
        `This is a friendly reminder about the ${mailRole} position you applied for at ${BRAND.company}. So the role stays fresh in your mind, here is the original job description:`,
        '',
        jobUrl ? `[[View the job description|${jobUrl}]]` : '(Job posting link unavailable.)',
        '',
        `Please review it ahead of the next steps. If you have any questions, just reply to this email.`,
        '',
        'Warm regards,',
        hr.signoff,
      ].join('\n'),
    });
  };
  const sendHeaderMail = async () => {
    if (!mail || !candidate.email || mailSending) return;
    setMailSending(true);
    try {
      const res = await sendCustomEmail({ to: candidate.email, subject: mail.subject, body: mail.body });
      if (res.sent) {
        toast.success(mail.kind === 'reject' ? 'Rejection email sent.' : 'Reminder email sent.');
        setMail(null);
      } else {
        toast.error('Email not sent — please try again.');
      }
    } catch {
      toast.error('Email failed to send.');
    } finally {
      setMailSending(false);
    }
  };
  const mySchedules = schedules.filter(s => s.candidateId === id && s.status !== 'Cancelled');
  const myIq = iqTests.filter(t => t.candidateId === id);
  const myInterviews = interviews.filter(iv => iv.candidateId === id);
  const myInvites = (invites as TestInvite[]).filter(i => i.candidateId === id);
  // Interview kits sent from Settings for this candidate (independent of the
  // pipeline). A 'Completed' one carries the interviewer's answers.
  const myKitSends = kitSends.filter(k => k.candidateId === id);
  const answeredKit = [...myKitSends]
    .filter(k => k.status === 'Completed' && (k.questionResponses?.length ?? 0) > 0)
    .sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? ''))[0];

  // ---- pipeline stage states (shared with the dashboard Kanban) ----
  const hrCallDone = Boolean(candidate.hrCall?.completed);
  const hrCallReached =
    hrCallDone || mySchedules.some(s => s.type === 'HR Call') || candidate.status === 'Moved to HR Call';
  const offerShortlisted = candidate.status === 'Offer Shortlisted';
  // After a re-scheduled retake, show the LATEST attempt (newest first), not the
  // first one created.
  const byCreatedDesc = (a: TestInvite, b: TestInvite) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  const latestIq = [...myIq].sort((a, b) => (b.testDate ?? '').localeCompare(a.testDate ?? ''))[0];
  const iqInvite = myInvites.filter(i => i.kind === 'iq').sort(byCreatedDesc)[0];
  const iqDone =
    myIq.length > 0 || Boolean(iqInvite && ['Completed', 'Auto-Submitted'].includes(iqInvite.status));
  const iqReached = iqDone || Boolean(iqInvite) || mySchedules.some(s => s.type === 'IQ Test');
  // "assignment" and "assessment" are used interchangeably across the flows that
  // create the role-skills test — accept either so the stage resolves regardless.
  const asgInvite = myInvites
    .filter(i => i.kind === 'assignment' || i.kind === 'assessment')
    .sort(byCreatedDesc)[0];
  // The proctored runner (/test) finishes an assessment as Completed/Auto-Submitted
  // (with a score), while the simple runner (/assessment) marks it Graded. Treat any
  // of those — or any recorded score — as done, so HR can act on the result.
  const asgDone =
    !!asgInvite &&
    (['Graded', 'Completed', 'Auto-Submitted'].includes(asgInvite.status) ||
      asgInvite.score != null);
  const asgReached = Boolean(asgInvite) || mySchedules.some(s => s.type === 'Assessment');
  // A completed IQ / Assessment that the candidate did NOT clear (failed or
  // disqualified). Drives the "Reject & email" action on those stages.
  const iqPassed = (latestIq && latestIq.qualificationStatus === 'Passed') || !!iqInvite?.passed;
  const iqFailed = iqDone && !iqPassed;
  const asgFailed = asgDone && !!asgInvite && !asgInvite.passed;
  const interviewDone = myInterviews.some(iv => iv.status === 'Completed');
  // A cancelled interview no longer counts as "scheduled" — so after cancelling,
  // the Interview Schedule step reverts to Pending with the Schedule button
  // available (HR can re-book) until the candidate moves on to the IQ test.
  const interviewReached =
    myInterviews.some(iv => iv.status !== 'Cancelled') || mySchedules.some(s => s.type === 'Interview');
  // The in-person round is "reached" once the interview has actually happened
  // (completed or feedback recorded) — scheduling alone only fills Interview Schedule.
  const interviewConducted = interviewDone || myInterviews.some(iv => !!iv.grading);
  // The interviewer's overall recommendation (submitted via the public sheet, or
  // saved by HR in the feedback modal). Shown on the Physical Interview step; a
  // hire recommendation, once HR saves it, opens the final Decision step.
  const interviewRecommendation = [...myInterviews].reverse().find(iv => iv.grading)?.grading
    ?.recommendation;
  const rejected = candidate.status === 'Rejected';
  const selected = candidate.status === 'Selected';
  const decided = rejected || selected;
  const onHold = candidate.status === 'On Hold';
  // The physical interview must be accepted by HR (saving a hire recommendation
  // in the feedback modal) before the final Decision opens.
  const physicalAccepted = candidate.stageDecisions?.['Physical Interview'] === 'Accepted';

  const stages = [
    {
      label: 'Applied',
      Icon: FileText,
      reached: true,
      done: true,
      desc: fmtDate(candidate.appliedDate),
      when: candidate.appliedAt ?? candidate.appliedDate,
    },
    {
      label: 'Screening',
      Icon: ShieldCheck,
      reached: true,
      done: Boolean(candidate.screeningReview) || Boolean(candidate.fitRating),
      desc: candidate.screeningReview ? 'Screened' : fit ? `Rated ${fit}` : 'Pending',
      when: candidate.screeningReview?.reviewedDate,
    },
    {
      label: 'HR Call',
      Icon: Phone,
      reached: hrCallReached,
      done: hrCallDone,
      desc: hrCallDone ? candidate.hrCall!.nextStep : hrCallReached ? 'Scheduled' : 'Pending',
      when: candidate.hrCall?.completedDate,
    },
    {
      label: 'Interview Schedule',
      Icon: CalendarClock,
      reached: interviewReached || candidate.stageDecisions?.['HR Call'] === 'Accepted',
      done: interviewReached,
      desc: interviewReached ? 'Scheduled' : 'Pending',
      when: mySchedules.find(s => s.type === 'Interview')?.dateTime,
    },
    {
      label: 'IQ Test',
      Icon: BrainCircuit,
      reached: iqReached || candidate.stageDecisions?.['Interview Schedule'] === 'Accepted',
      done: iqDone,
      desc: latestIq
        ? `${latestIq.qualificationStatus} · ${latestIq.scorePercentage}%`
        : iqReached
          ? 'Scheduled'
          : 'Pending',
      when: latestIq?.testDate,
    },
    {
      label: 'Assessment',
      Icon: ClipboardList,
      reached: asgReached || candidate.stageDecisions?.['IQ Test'] === 'Accepted',
      done: asgDone,
      desc: asgDone
        ? asgInvite!.passed
          ? `Passed · ${asgInvite!.score}%`
          : `Failed · ${asgInvite!.score}%`
        : asgReached
          ? 'Scheduled'
          : 'Pending',
      when: asgInvite?.completedAt,
    },
    {
      label: 'Physical Interview',
      Icon: CalendarDays,
      reached: interviewConducted || candidate.stageDecisions?.['Assessment'] === 'Accepted',
      done: interviewDone,
      // Show the interviewer's recommendation once it's in, instead of a generic
      // status — HR reviews it, then a hire opens the Decision step.
      desc: interviewRecommendation
        ? interviewRecommendation
        : interviewReached
          ? 'Awaiting'
          : 'Pending',
      when: myInterviews[0]?.dateTime,
    },
    {
      label: 'Decision',
      Icon: Flag,
      reached: decided || offerShortlisted || physicalAccepted,
      done: decided,
      desc: selected
        ? 'Selected for role'
        : rejected
          ? 'Rejected'
          : offerShortlisted
            ? 'Shortlisted'
            : 'Pending',
      when: candidate.decidedAt,
    },
  ];
  let currentIndex = 0;
  stages.forEach((s, i) => {
    if (s.reached) currentIndex = i;
  });
  // The step where the pipeline HALTS: a failed test (IQ / Assessment) or a
  // rejection. That step and every step after it are crossed out — they must
  // never render as green "done" just because a later step was reached.
  const failIdx = stages.findIndex(
    s => (s.label === 'IQ Test' && iqFailed) || (s.label === 'Assessment' && asgFailed),
  );
  const stopIdx = failIdx >= 0 ? failIdx : rejected ? currentIndex : -1;
  const stepState = (i: number): StepState => {
    // The halt step and everything after it are crossed out.
    if (stopIdx >= 0 && i >= stopIdx) return 'rejected';
    if (i < currentIndex) return 'done';
    if (i === currentIndex) return stages[i].done ? 'done' : 'current';
    return 'todo';
  };

  // ---- activity timeline (line flow) ----
  type Ev = { date: string; title: string; detail?: string; tone: 'accent' | 'green' | 'red' | 'gray' };
  // Prefer the precise real timestamps; fall back to the date-only fields for
  // older records created before those timestamps were captured.
  const appliedWhen = candidate.appliedAt ?? candidate.appliedDate;
  const decidedWhen = candidate.decidedAt ?? appliedWhen;
  const events: Ev[] = [];
  events.push({ date: appliedWhen, title: 'Applied', detail: candidate.appliedRole, tone: 'accent' });
  if (candidate.fitRating)
    events.push({
      date: candidate.screeningReview?.reviewedDate ?? appliedWhen,
      title: `Screening — ${fit}`,
      detail: `${candidate.screeningAnswers?.length ?? 0} questions answered`,
      tone: fit === 'Unfit' ? 'red' : fit === 'Fit' ? 'green' : 'accent',
    });
  mySchedules.forEach(s =>
    events.push({
      date: s.dateTime,
      title: `${s.type} scheduled`,
      detail: s.notes || undefined,
      tone: 'gray',
    }),
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
    .filter(i => i.kind === 'assessment' || i.kind === 'assignment')
    .forEach(i => {
      if (['Completed', 'Auto-Submitted', 'Graded'].includes(i.status))
        events.push({
          date: i.completedAt ?? i.createdAt,
          title: `Assessment — ${i.passed ? 'passed' : 'failed'}`,
          detail:
            i.score != null
              ? `${i.score}%${i.correct != null ? ` · ${i.correct}/${i.total}` : ''}`
              : undefined,
          tone: i.passed ? 'green' : 'red',
        });
      else events.push({ date: i.createdAt, title: 'Assessment sent', tone: 'gray' });
    });
  myInterviews.forEach(iv =>
    events.push({
      date: iv.dateTime,
      title: `${iv.interviewRound} interview`,
      detail: iv.interviewerName,
      tone: 'gray',
    }),
  );
  if (offerShortlisted)
    events.push({
      date: decidedWhen,
      title: 'Shortlisted for the offer',
      detail: 'Confirmation email sent',
      tone: 'green',
    });
  if (selected)
    events.push({
      date: decidedWhen,
      title: 'Selected for the role',
      detail: 'Availability email sent',
      tone: 'green',
    });
  if (rejected) events.push({ date: decidedWhen, title: 'Rejected', tone: 'red' });
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
      // The rating is auto-derived from the answers: any must-have failed → Unfit;
      // otherwise the good-to-have pass rate decides Fit vs Borderline. Spell out
      // the exact reason behind whichever rating was assigned.
      const failedMustHaves = mustHaves.filter(a => !a.passed);
      const goodPassed = goodToHaves.filter(a => a.passed).length;
      const goodTotal = goodToHaves.length;
      const passBar = Math.round(FIT_THRESHOLD * 100);
      const mustLabel = `${mustHaves.length} must-have question${mustHaves.length === 1 ? '' : 's'}`;
      return (
        <div className="space-y-3">
          {fit === 'Unfit' && failedMustHaves.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-red-700">
                <XCircle size={13} className="shrink-0" />
                Marked Unfit — failed must-have screening question
                {failedMustHaves.length > 1 ? 's' : ''}:
              </p>
              <ul className="mt-1.5 space-y-1 pl-5">
                {failedMustHaves.map(a => (
                  <li key={a.questionId} className="list-disc text-[11.5px] leading-snug text-red-700/90">
                    {a.text} <span className="font-semibold">— answered “{a.answer || '—'}”</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fit === 'Fit' && (mustHaves.length > 0 || goodTotal > 0) && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
              <p className="flex items-start gap-1.5 text-[12px] font-semibold text-emerald-700">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                <span>
                  Marked Fit — {mustHaves.length > 0 ? `passed all ${mustLabel}` : 'no blocking questions'}
                  {goodTotal > 0
                    ? `, and cleared ${goodPassed}/${goodTotal} good-to-have (≥ ${passBar}% bar).`
                    : '.'}
                </span>
              </p>
            </div>
          )}
          {fit === 'Borderline' && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-2.5">
              <p className="flex items-start gap-1.5 text-[12px] font-semibold text-amber-700">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>
                  Borderline — passed all must-have questions, but only cleared {goodPassed}/{goodTotal}{' '}
                  good-to-have (below the {passBar}% bar).
                </span>
              </p>
            </div>
          )}
          {review && (
            <div className="space-y-1.5 rounded-lg border border-[#ECEDF0] bg-white p-2.5">
              {SCREENING_CRITERIA.map(c => (
                <div key={c.key} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">{c.label}</span>
                  <span className="font-mono text-[11px] font-bold text-gray-700">
                    {review[c.key] as number}/5
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-[#E4E6EA] pt-1.5">
                <span className="text-[11px] font-semibold text-gray-700">Average</span>
                <span className="font-mono text-[11px] font-bold text-accent-600">
                  {screeningAvg(review).toFixed(1)}/5
                </span>
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
            {h.professionalBackgroundSummary && (
              <p className="rounded-lg bg-[#F1F3F5] p-2.5 text-[11px] italic text-gray-600">
                “{h.professionalBackgroundSummary}”
              </p>
            )}
          </div>
        );
      }
      const s = schedOf('HR Call')[0];
      return empty(
        s ? `Scheduled for ${fmtDateTime(s.dateTime)} — call not completed yet.` : 'HR call not started.',
      );
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
      const asgDoneNow = asgInvite && (asgInvite.status === 'Graded' || asgInvite.score != null);
      if (asgInvite && asgDoneNow) {
        return (
          <div className="space-y-2.5">
            <KV k="Role" v={`${asgInvite.position} MCQ`} />
            <KV k="Result" v={asgInvite.passed ? 'Passed' : 'Failed'} />
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
      }
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
      // Show only the LATEST (active) interview in full; older/cancelled ones are
      // summarised in a single line at the bottom.
      const sortedIvs = [...myInterviews].sort((a, b) =>
        (b.createdAt ?? b.dateTime ?? '').localeCompare(a.createdAt ?? a.dateTime ?? ''),
      );
      const primaryIv = sortedIvs.find(iv => iv.status !== 'Cancelled') ?? sortedIvs[0];
      const cancelledIvs = sortedIvs.filter(
        iv => iv.status === 'Cancelled' && iv.id !== primaryIv.id,
      );
      const online = primaryIv.interviewType === 'Online' || primaryIv.meetingMode !== 'In-Person';
      return (
        <div className="space-y-2.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#ECEDF0] pb-1.5">
              <p className="text-[12px] font-semibold text-gray-800">
                {online ? 'Online' : 'Offline'} interview
              </p>
              <span className="rounded-full border border-[#E4E6EA] bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-gray-500">
                {primaryIv.status}
              </span>
            </div>
            <KV k="When" v={fmtDateTime(primaryIv.dateTime)} />
            {primaryIv.interviewerName && primaryIv.interviewerName !== 'To be assigned' && (
              <KV k="Interviewer" v={primaryIv.interviewerName} />
            )}
            {primaryIv.interviewerEmail && <KV k="Interviewer email" v={primaryIv.interviewerEmail} />}
            <KV k="Mode" v={online ? 'Online' : 'Offline (office)'} />
            <KV
              k="Invitation email"
              v={primaryIv.emailStatus === 'Sent' ? 'Sent ✓ (Yes)' : primaryIv.emailStatus || 'Not sent'}
            />
            <KV k="Calendar invite" v={primaryIv.emailStatus === 'Sent' ? 'Sent ✓ (Yes)' : 'Not sent'} />
            {primaryIv.emailStatus === 'Sent' && primaryIv.status !== 'Cancelled' && (
              <div className="mt-1 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 size={12} /> Candidate invited — calendar event sent; expected to attend on{' '}
                {fmtDateTime(primaryIv.dateTime)}
              </div>
            )}
            {primaryIv.additionalNotes && (
              <p className="rounded bg-white/60 p-2 text-[11px] italic text-gray-600">
                “{primaryIv.additionalNotes}”
              </p>
            )}
          </div>
          {cancelledIvs.length > 0 && (
            <p className="px-1 text-[11px] text-gray-500">
              Cancelled interview{cancelledIvs.length > 1 ? 's' : ''}:{' '}
              {cancelledIvs.map(iv => fmtDateTime(iv.dateTime)).join(' · ')}
            </p>
          )}
        </div>
      );
    }

    if (label === 'Physical Interview') {
      const anyResponses = myInterviews.some(iv => iv.questionResponses?.length);
      if (!interviewReached && myKitSends.length === 0)
        return empty('Schedule the interview first — or send an interview kit from Settings.');
      if (interviewReached && !interviewConducted && !anyResponses && myKitSends.length === 0)
        return empty('Interview scheduled — feedback not recorded yet.');
      return (
        <div className="space-y-2.5">
          {myInterviews.map(iv => (
            <div key={iv.id} className="rounded-lg border border-[#ECEDF0] bg-white p-2.5">
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
              {iv.grading?.summary && (
                <p className="mt-1 text-[11px] text-gray-600">
                  <span className="font-semibold text-gray-500">Summary: </span>
                  {iv.grading.summary}
                </p>
              )}
            </div>
          ))}

          {/* Interview kits sent from Settings — the questions and, once the
              interviewer has answered, their per-question responses. */}
          {myKitSends.map(kit => {
            const responses = (kit.questionResponses ?? []) as {
              text: string;
              selected?: string;
              note?: string;
            }[];
            return (
              <div key={kit.id} className="rounded-lg border border-[#ECEDF0] bg-white p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-gray-800">
                    Interview kit · {kit.roleName}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      kit.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-[#F1F3F5] text-gray-500'
                    }`}
                  >
                    {kit.status === 'Completed' ? 'Answered' : 'Awaiting'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Sent to {kit.interviewerEmail} · {fmtDateTime(kit.sentAt)}
                </p>
                {kit.grading?.recommendation && (
                  <p className="mt-1 text-[11px] text-gray-600">
                    <span className="font-semibold">{kit.grading.recommendation}</span>
                    {kit.grading.interviewerComments ? ` — “${kit.grading.interviewerComments}”` : ''}
                  </p>
                )}
                {/* Questions are only listed once the interviewer has answered —
                    the bare question list before that is just noise here. */}
                {responses.length === 0 ? (
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {kit.questionCount} questions sent — awaiting the interviewer's responses.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {kit.questions.map((q, i) => {
                      const resp = responses.find(r => r.text === q.text) ?? responses[i];
                      return (
                        <div key={i} className="border-b border-[#F1F3F5] pb-1.5 last:border-0">
                          <p className="text-[11px] font-medium text-gray-700">
                            {i + 1}. {q.text}
                          </p>
                          {resp?.selected != null && (
                            <p className="text-[11px] text-emerald-700">
                              Rated: {resp.selected}
                              {resp.note ? ` · ${resp.note}` : ''}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
  const schedule = (type: ScheduleType) =>
    type === 'Interview'
      ? openInterviewSchedule(candidate)
      : openSchedule(candidate.id, candidate.fullName, type);

  const selectForRole = () => {
    update.mutate({ ...candidate, status: 'Selected', decidedAt: nowISO() });
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
    update.mutate({ ...candidate, status: 'Offer Shortlisted', decidedAt: nowISO() });
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
    update.mutate({ ...candidate, status: 'Rejected', decidedAt: nowISO() });
    toast.info('Candidate marked as rejected.');
  };

  // ---- Final decision (Decision step): open the outcome-email composer ----
  const openDecision = (kind: 'accept' | 'reject') => {
    const position = candidate.appliedRole || candidate.department || 'the role';
    const summary = decisionSummary.trim();
    setDecisionKind(kind);
    // Copy comes from Settings → Email templates ("Hired — congratulations" /
    // "Rejected — after interview"), so HR's saved edits seed this composer.
    const iqText = myIq[0]
      ? `${myIq[0].correctAnswers}/${myIq[0].totalQuestions} (${myIq[0].scorePercentage}%)`
      : '—';
    const asgText = asgInvite?.score != null ? `${asgInvite.score}%` : '—';
    fetchRenderedTemplate(kind === 'accept' ? 'hired_congratulations' : 'rejection_interview', {
      candidate_name: candidate.fullName,
      role: position,
      iq_score: iqText,
      assessment_score: asgText,
      summary: summary || '',
      hr_signoff: hr.signoff,
    })
      .then(tpl => {
        if (!tpl) return;
        setDecisionSubject(tpl.subject);
        setDecisionBody(tpl.body);
      })
      .catch(() => {});
    setOpenForm('decision');
  };

  const submitDecision = async () => {
    if (!decisionKind) return;
    const isAccept = decisionKind === 'accept';
    const status: CandidateStatus = isAccept ? 'Selected' : 'Rejected';
    update.mutate({
      ...candidate,
      status,
      stageDecisions: {
        ...(candidate.stageDecisions ?? {}),
        Decision: isAccept ? 'Accepted' : 'Rejected',
      },
      hrRemarks: decisionSummary.trim() || candidate.hrRemarks,
      decidedAt: nowISO(),
    });
    if (isAccept)
      ensureOnboarding.mutate(candidate, {
        onError: () => toast.error('Selected, but could not start onboarding — try again.'),
      });
    setOpenForm(null);
    setDecisionKind(null);
    // Resolved — close the Decision step's accordion too.
    setOpenStep(-1);
    if (!candidate.email) {
      toast.info(`Candidate ${isAccept ? 'selected' : 'rejected'} — no email on file, so none was sent.`);
      return;
    }
    try {
      const res = await sendCustomEmail({
        to: candidate.email,
        subject: decisionSubject,
        body: decisionBody,
      });
      repositories.sentEmails
        .create({
          id: randomId('EML'),
          recipientName: candidate.fullName,
          recipientEmail: candidate.email,
          templateTitle: isAccept ? 'Offer / Congratulations' : 'Rejection',
          subject: decisionSubject,
          dateSent: nowISO(),
          status: res.sent ? 'Sent' : 'Failed',
          relatedEntity: candidate.fullName,
        })
        .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
        .catch(() => {});
      toast.success(
        res.sent
          ? `Candidate ${isAccept ? 'selected' : 'rejected'} — email sent.`
          : `Candidate ${isAccept ? 'selected' : 'rejected'} — email could not be sent.`,
      );
    } catch {
      toast.error(`Candidate ${isAccept ? 'selected' : 'rejected'}, but sending the email failed.`);
    }
  };

  // ---- per-stage Accept / On Hold / Reject gate ----
  const decisionOf = (label: string): StageDecision | undefined => candidate.stageDecisions?.[label];

  const setStageDecision = (label: string, decision: StageDecision, status?: CandidateStatus) => {
    const stageDecisions = { ...(candidate.stageDecisions ?? {}), [label]: decision };
    // Stamp the decision time when this transition reaches a terminal outcome so
    // the activity feed can show when it actually happened.
    const terminal = status === 'Rejected' || status === 'Selected';
    update.mutate({
      ...candidate,
      stageDecisions,
      ...(status ? { status } : {}),
      ...(terminal ? { decidedAt: nowISO() } : {}),
    });
    // Accept / On Hold / Reject / Next all resolve the step that was open —
    // close its accordion automatically instead of leaving it expanded.
    setOpenStep(-1);
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
    // Both IQ and Assessment run in the same proctored window (/test) — full
    // screen, tab-switch limited, auto-submit on disqualification.
    const url = `${window.location.origin}/test/${id}`;
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
      durationMin: kind === 'iq' ? IQ_DURATION_MIN : ASSESSMENT_DURATION_MIN,
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
      const res = await sendCustomEmail({
        to: r.to,
        subject: r.subject,
        body: r.body,
        links: r.links,
      });
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
      toast.success(
        res.sent ? `${label} link sent to the candidate.` : `${label} created — email could not be sent.`,
      );
    } catch {
      toast.error(`${label} created, but sending the email failed.`);
    }
  };
  const rejectStage = (label: string) => {
    setStageDecision(label, 'Rejected', 'Rejected');
    toast.info('Candidate marked as rejected.');
  };

  // Reject a candidate who did NOT clear the IQ test / Assessment, and email them
  // their result. Triggered ONLY by the "Reject & email" button (never automatic).
  // IQ fail → share the IQ score. Assessment fail → share the IQ score + note the
  // assessment was not cleared.
  const rejectAfterTest = (stage: 'IQ Test' | 'Assessment') => {
    const position = candidate.appliedRole || candidate.department || 'the role';
    const iqScoreText = latestIq
      ? `${latestIq.scorePercentage}% (${latestIq.correctAnswers}/${latestIq.totalQuestions} correct)`
      : myIq[0]
        ? `${myIq[0].scorePercentage}%`
        : null;
    const asgScoreText = asgInvite?.score != null ? `${asgInvite.score}%` : null;

    // Mark rejected first, so the pipeline updates even if the email fails.
    setStageDecision(stage, 'Rejected', 'Rejected');

    if (!candidate.email) {
      toast.info('Candidate rejected — no email on file, so no result email was sent.');
      return;
    }
    // Copy comes from Settings → Email templates ("Rejected — IQ test" /
    // "Rejected — assessment"), so HR's saved edits are what goes out.
    fetchRenderedTemplate(stage === 'IQ Test' ? 'rejection_iq' : 'rejection_assessment', {
      candidate_name: candidate.fullName,
      role: position,
      iq_score: iqScoreText ?? '—',
      assessment_score: asgScoreText ?? 'not cleared',
      hr_signoff: hr.signoff,
    })
      .then(tpl => {
        if (!tpl) throw new Error('missing template');
        return sendCustomEmail({ to: candidate.email, subject: tpl.subject, body: tpl.body });
      })
      .then(res => {
        if (res.sent) toast.success(`Candidate rejected — ${stage} result email sent.`);
        else if (res.reason === 'not_configured')
          toast.info('Candidate rejected. Email not sent — SMTP is not configured.');
        else toast.info('Candidate rejected — the result email could not be sent.');
      })
      .catch(() => toast.error('Candidate rejected, but sending the email failed.'));
  };

  const openScreening = () => {
    setSr(candidate.screeningReview ?? blankScreening());
    setOpenForm('screening');
  };
  const updateSr = <K extends keyof ScreeningReview>(key: K, value: ScreeningReview[K]) =>
    setSr(prev => ({ ...prev, [key]: value }));

  const openHrCall = () => {
    setHc(
      candidate.hrCall ?? {
        ...blankHrCall(),
        currentCtc: candidate.currentCtc ?? '',
        expectedCtc: candidate.expectedCtc ?? '',
        noticePeriodDays: candidate.noticePeriodDays ?? 0,
      },
    );
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

  const openFeedback = (
    iv: Interview,
    override?: { responses?: InterviewQuestionResponse[]; recommendation?: string; comments?: string },
  ) => {
    setFbInterview(iv);
    setFbResponses(override?.responses ?? iv.questionResponses ?? null);
    setFbRec(override?.recommendation ?? iv.grading?.recommendation ?? 'Hire');
    setFbComments(override?.comments ?? iv.grading?.interviewerComments ?? '');
    setFbSummary(iv.grading?.summary ?? '');
    setOpenForm('feedback');
  };
  const submitFeedback = () => {
    if (!fbInterview) return;
    // A hire recommendation (Hire / Strong Hire) opens the final Decision step;
    // anything else keeps it closed. HR's saved choice is the gate.
    const positive = fbRec === 'Hire' || fbRec === 'Strong Hire';
    gradeInterview.mutate(
      { interviewId: fbInterview.id, recommendation: fbRec, comments: fbComments, summary: fbSummary },
      {
        onSuccess: () => {
          setStageDecision('Physical Interview', positive ? 'Accepted' : 'On Hold');
          toast.success(
            positive ? 'Feedback saved — proceed to the final decision.' : 'Feedback saved.',
          );
          setOpenForm(null);
          setFbInterview(null);
          setFbResponses(null);
        },
        onError: () => toast.error('Could not save feedback — try again.'),
      },
    );
  };

  // The active (non-cancelled) interview drives the Physical Interview step —
  // its assigned interviewer + email power the "Send to interviewer" pack. Fall
  // back to the most recent one when every interview has been cancelled.
  const latestInterview =
    [...myInterviews]
      .sort((a, b) =>
        (b.createdAt ?? b.dateTime ?? '').localeCompare(a.createdAt ?? a.dateTime ?? ''),
      )
      .find(iv => iv.status !== 'Cancelled') ?? myInterviews[myInterviews.length - 1];

  // ---- Physical Interview: send the resume + question pack to the interviewer ----
  const buildIvpackQuestions = (bank: InterviewBank) =>
    INTERVIEW_MODULES.flatMap(m =>
      (bank.modules[m] ?? [])
        .filter(it => it.text.trim())
        .map(it => ({ text: it.text.trim(), options: [] as string[], module: m })),
    );

  // Create (or re-create) the interview-questions sheet for the selected bank, so
  // its link can be shown in the modal up front and reused on send.
  const regenIvpackSheet = async (bankId: string) => {
    const bank = interviewBanks.find(b => b.id === bankId);
    if (!bank || !latestInterview) {
      setIvpackSheet(null);
      return;
    }
    const position = candidate.appliedRole || candidate.department || 'the role';
    try {
      const token = await saveInterviewSheet({
        interviewId: latestInterview.id,
        candidateName: candidate.fullName,
        role: position,
        department: candidate.department,
        experienceYears: candidate.totalExperienceYears,
        relevantExperienceYears: candidate.relevantExperienceYears,
        email: candidate.email,
        phone: candidate.phone,
        currentCompany: candidate.currentCompany,
        currentDesignation: candidate.currentDesignation,
        resumeUrl: resumeDoc ? documentPreviewUrl(resumeDoc.id) : '',
        interviewerName: latestInterview.interviewerName,
        whenIso: latestInterview.dateTime,
        mode: ivpackMode,
        roleLabel: bank.roleName,
        questions: buildIvpackQuestions(bank),
      });
      setIvpackSheet({ token, url: `${window.location.origin}/interview-sheet?id=${token}`, bankId });
    } catch {
      setIvpackSheet(null);
    }
  };

  const openIvPack = () => {
    const position = candidate.appliedRole || candidate.department || 'the role';
    const banks = interviewBanks;
    setIvpackBanks(banks);
    // Auto-pick the kit for the candidate's applied role: exact role-name match
    // first, then a partial match (either contains the other), else fall back to
    // the first available kit so a default is always selected. The link for the
    // chosen kit is generated up front.
    const norm = (s: string) => s.trim().toLowerCase();
    const pos = norm(position);
    const match =
      banks.find(b => norm(b.roleName) === pos) ??
      banks.find(b => norm(b.roleName).includes(pos) || pos.includes(norm(b.roleName))) ??
      banks[0];
    setIvpackBankId(match?.id ?? '');
    setIvpackSheet(null);
    if (match?.id) void regenIvpackSheet(match.id);
    setIvpackMode((latestInterview?.interviewType as 'Online' | 'Offline') || 'Offline');
    setIvpackToEmail(latestInterview?.interviewerEmail ?? '');
    // Copy comes from Settings → Email templates ("Physical interview —
    // interviewer pack").
    fetchRenderedTemplate('physical_interview_interviewer', {
      interviewer_name: latestInterview?.interviewerName || 'there',
      candidate_name: candidate.fullName,
      role: position,
      department: candidate.department,
      experience: `${candidate.totalExperienceYears} yrs total`,
      hr_signoff: hr.signoff,
    })
      .then(tpl => {
        if (!tpl) return;
        setIvpackSubject(tpl.subject);
        setIvpackBody(tpl.body);
      })
      .catch(() => {});
    setOpenForm('ivpack');
  };

  const submitIvPack = async () => {
    if (!latestInterview) {
      toast.error('No interview found for this candidate.');
      return;
    }
    const toEmail = ivpackToEmail.trim();
    if (!toEmail) {
      toast.error('Enter the interviewer’s email.');
      return;
    }
    const position = candidate.appliedRole || candidate.department || 'the role';
    const bank = ivpackBanks.find(b => b.id === ivpackBankId);
    if (!bank) {
      toast.error('Please select an interview question set.');
      return;
    }
    const isOnline = ivpackMode === 'Online';
    const resumeUrl = resumeDoc ? documentPreviewUrl(resumeDoc.id) : '';
    // Reuse the sheet already generated for this bank (shown in the modal); only
    // create one here if it's missing or the bank changed after generation.
    let sheetToken = ivpackSheet?.bankId === ivpackBankId ? ivpackSheet.token : '';
    if (!sheetToken) {
      try {
        sheetToken = await saveInterviewSheet({
          interviewId: latestInterview.id,
          candidateName: candidate.fullName,
          role: position,
          department: candidate.department,
          experienceYears: candidate.totalExperienceYears,
          relevantExperienceYears: candidate.relevantExperienceYears,
          email: candidate.email,
          phone: candidate.phone,
          currentCompany: candidate.currentCompany,
          currentDesignation: candidate.currentDesignation,
          resumeUrl,
          interviewerName: latestInterview.interviewerName,
          whenIso: latestInterview.dateTime,
          mode: ivpackMode,
          roleLabel: bank.roleName,
          questions: buildIvpackQuestions(bank),
        });
      } catch {
        toast.error('Could not create the interview sheet link. Please try again.');
        return;
      }
    }
    const sheetUrl = `${window.location.origin}/interview-sheet?id=${sheetToken}`;

    setOpenForm(null);

    // Online: mint a Google Meet link behind the scenes — a private, no-attendee
    // calendar event on the shared HR account purely to generate the link. With
    // no attendees, Google notifies no one (no "Where/Who/RSVP" invite chrome);
    // WE deliver the link ourselves via the composed emails below. A separate
    // appEventId (not the interview's own) keeps this from touching — and
    // re-notifying whoever's on — the original schedule-time calendar event.
    let meetLink: string | null | undefined;
    if (isOnline) {
      try {
        const res = await pushCalendarEvent({
          appEventId: `${latestInterview.id}-ivpack-meet`,
          type: 'Interview',
          title: ivpackSubject || `Interview - ${candidate.fullName} - ${position}`,
          dateTimeIso: latestInterview.dateTime,
          durationMin: latestInterview.durationMinutes ?? 45,
          online: true,
        });
        meetLink = res.meetLink;
      } catch {
        /* handled below via the no-link toast */
      }
    }
    {
      // Reflect the mode + the auto-created link + a corrected interviewer
      // email on the interview record, so the next open/re-send starts from it.
      const patch: Record<string, unknown> = {};
      if (toEmail !== (latestInterview.interviewerEmail ?? '')) patch.interviewerEmail = toEmail;
      if (isOnline) {
        patch.interviewType = 'Online';
        patch.interviewRound = 'Online';
        patch.meetingMode = 'Google Meet';
        if (meetLink) patch.meetingLink = meetLink;
      }
      if (Object.keys(patch).length > 0) {
        repositories.interviews
          .patch(latestInterview.id, patch)
          .then(() => qc.invalidateQueries({ queryKey: qk.interviews.all }))
          .catch(() => {});
      }
    }

    const interviewerLinks = [
      ...(resumeUrl ? [{ label: 'View candidate resume', url: resumeUrl }] : []),
      { label: 'Open interview questions', url: sheetUrl },
      ...(isOnline && meetLink ? [{ label: 'Join with Google Meet', url: meetLink }] : []),
    ];
    try {
      const res = await sendCustomEmail({
        to: toEmail,
        subject: ivpackSubject,
        body: ivpackBody,
        links: interviewerLinks,
      });
      repositories.sentEmails
        .create({
          id: randomId('EML'),
          recipientName: latestInterview.interviewerName || 'Interviewer',
          recipientEmail: toEmail,
          templateTitle: 'Interview pack',
          subject: ivpackSubject,
          dateSent: nowISO(),
          status: res.sent ? 'Sent' : 'Failed',
          relatedEntity: candidate.fullName,
        })
        .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
        .catch(() => {});

      // Online: also email the candidate — ONLY the Google Meet link, nothing
      // else (no resume, no interview-kit links — those are interviewer-only).
      // Skipped entirely when there's no real link, so a broken/empty "Join the
      // Google Meet" href never goes out.
      if (isOnline && candidate.email && meetLink) {
        // Copy comes from Settings → Email templates ("Physical interview —
        // candidate (online)"); the template embeds the Meet link itself.
        const tpl = await fetchRenderedTemplate('physical_interview_candidate', {
          candidate_name: candidate.fullName,
          role: position,
          meet_link: meetLink,
          hr_signoff: hr.signoff,
        });
        sendCustomEmail({
          to: candidate.email,
          subject: tpl?.subject ?? `Your interview (online) — ${position} — ${BRAND.company}`,
          body: tpl?.body ?? '',
        })
          .then(r =>
            repositories.sentEmails
              .create({
                id: randomId('EML'),
                recipientName: candidate.fullName,
                recipientEmail: candidate.email!,
                templateTitle: 'Interview — online link',
                subject: `Your interview (online) — ${position} — ${BRAND.company}`,
                dateSent: nowISO(),
                status: r.sent ? 'Sent' : 'Failed',
                relatedEntity: candidate.fullName,
              })
              .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all })),
          )
          .catch(() => {});
      }

      if (!res.sent) {
        toast.error('Pack created — the interviewer email could not be sent.');
      } else if (isOnline && meetLink) {
        toast.success('Sent the Google Meet link to both the interviewer and the candidate.');
      } else {
        toast.success('Interview pack sent to the interviewer.');
        if (isOnline) {
          // Couldn't auto-create a Meet link — nothing to send the candidate,
          // so that email is skipped rather than going out broken.
          toast.info(
            'Could not create a Google Meet link — connect Google Calendar in Global Settings, then try again. The candidate was not emailed.',
          );
        }
      }
    } catch {
      toast.error('Could not send the interview pack — try again.');
    }
  };

  // Future, still-open interviews — surfaced in the "Upcoming interviews" card.
  const upcomingInterviews = myInterviews
    .filter(iv => iv.status !== 'Cancelled' && iv.status !== 'Completed')
    .filter(iv => {
      const t = new Date(iv.dateTime).getTime();
      return !Number.isNaN(t) && t >= Date.now() - 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  // Top-of-entry actions are icon-only buttons tinted with the primary/accent
  // colour; the label lives in the tooltip (title) so the feed stays clean.
  const iconBtn = (
    key: string,
    icon: React.ReactNode,
    title: string,
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#E4E6EA] bg-white text-accent-600 transition hover:border-accent-300 hover:bg-accent-50 disabled:pointer-events-none disabled:opacity-40"
    >
      {icon}
    </button>
  );

  const scheduleBtn = (type: ScheduleType, text: string) =>
    iconBtn(text, <CalendarPlus size={15} />, text, () => schedule(type));

  const stageActions = (idx: number): React.ReactNode => {
    const label = stages[idx].label;
    const btns: React.ReactNode[] = [];

    if (label === 'Screening')
      btns.push(
        iconBtn(
          'screen',
          <ClipboardList size={15} />,
          candidate.screeningReview ? 'Edit screening notes' : 'Record screening',
          openScreening,
        ),
      );

    if (label === 'HR Call' && hrCallReached && !decided)
      btns.push(
        iconBtn(
          'hrform',
          <Phone size={15} />,
          candidate.hrCall?.completed ? 'Edit call notes' : 'Record HR call',
          openHrCall,
        ),
      );

    // IQ test, Assessment and Physical Interview are all INDEPENDENT once the
    // interview schedule mail has gone out — HR can send any of them in any
    // order (no "IQ must pass before Assessment" gating).
    if (label === 'IQ Test') {
      const iqPassed = myIq[0]?.qualificationStatus === 'Passed';
      // Active once the interview is scheduled; Send until it's sent, then
      // Re-assign for a retry, hidden only once the candidate has passed.
      if (interviewReached && !iqPassed)
        btns.push(
          iconBtn(
            iqReached ? 'resendiq' : 'sendiq',
            <Send size={15} />,
            iqReached ? 'Re-assign IQ test' : 'Send IQ test',
            () => openSendTest('iq'),
          ),
        );
    }

    if (label === 'Assessment') {
      const asgPassed = asgInvite?.status === 'Graded' && asgInvite.passed;
      // Active once the interview is scheduled — independent of the IQ result.
      // Send until it's sent, then Re-assign; hidden while awaiting grading
      // (Submitted) or once passed.
      if (interviewReached && !asgPassed && asgInvite?.status !== 'Submitted')
        btns.push(
          iconBtn(
            asgReached ? 'resendasm' : 'sendasm',
            <Send size={15} />,
            asgReached ? 'Re-assign Assessment' : 'Send Assessment',
            () => openSendTest('assignment'),
          ),
        );
      if (asgInvite?.status === 'Submitted')
        btns.push(iconBtn('grade', <Star size={15} />, 'Grade submission', openGrade));
      if (asgInvite?.status === 'Graded')
        btns.push(iconBtn('review', <CheckCircle2 size={15} />, 'Review grade', openGrade));
    }

    if (label === 'Interview Schedule') {
      // A cancelled interview frees the slot — treat the candidate as unbooked so
      // HR can schedule a fresh one instead of a dead reschedule/cancel.
      const hasActiveInterview = myInterviews.some(iv => iv.status !== 'Cancelled');
      if (!hasActiveInterview) btns.push(scheduleBtn('Interview', 'Schedule Interview'));
      // Once booked, allow rescheduling (re-opens the modal and re-emails the
      // candidate) or cancelling (removes the calendar events + frees the slot).
      else {
        btns.push(
          iconBtn('reschedule', <CalendarClock size={15} />, 'Reschedule interview', () =>
            rescheduleInterview(candidate),
          ),
        );
        // Cancel is only allowed while Interview Schedule is the CURRENT step —
        // i.e. the interview is booked but the candidate hasn't moved forward to
        // the IQ test yet (and isn't already decided). Disabled otherwise.
        const canCancel = idx === currentIndex && !decided;
        btns.push(
          iconBtn(
            'cancelinterview',
            <CalendarX size={15} />,
            canCancel
              ? 'Cancel interview'
              : 'Cancel unavailable — the candidate has already moved to the next step',
            () => cancelInterview(candidate),
            !canCancel,
          ),
        );
      }
    }

    if (label === 'Physical Interview') {
      // Feedback is "in" once the interviewer's responses arrive — either on the
      // interview record, or on a Settings interview-kit answered externally.
      const ivResponded = !!latestInterview?.questionResponses?.length;
      const feedbackReceived = ivResponded || !!answeredKit;
      // Send the interviewer pack — DISABLED once feedback has been received (no
      // point re-sending an already-answered kit / interview).
      if (interviewReached)
        btns.push(
          iconBtn(
            'ivpack',
            <Send size={15} />,
            feedbackReceived ? 'Feedback already received' : 'Send to interviewer',
            openIvPack,
            feedbackReceived,
          ),
        );
      // Review feedback — opens the modal showing the interviewer's responses,
      // from the interview or (for an externally-answered Settings kit) the kit.
      if (latestInterview)
        btns.push(
          iconBtn(
            'fb',
            <MessageSquarePlus size={15} />,
            'Review feedback',
            () =>
              ivResponded
                ? openFeedback(latestInterview)
                : answeredKit
                  ? openFeedback(latestInterview, {
                      responses: (answeredKit.questionResponses ?? []) as InterviewQuestionResponse[],
                      recommendation: answeredKit.grading?.recommendation,
                      comments: answeredKit.grading?.interviewerComments,
                    })
                  : undefined,
            !feedbackReceived,
          ),
        );
      // The pass/hold/reject decision is taken via the header gate (below), then
      // the final outcome + email happens on the Decision step.
    }

    // Final decision: a summary textarea + Accept / On Hold / Reject. Accept and
    // Reject open the outcome-email composer; the email carries the IQ/assessment
    // scores and this summary.
    if (label === 'Decision' && physicalAccepted && !decided) {
      return (
        <div className="mt-2.5 space-y-2.5">
          <div>
            <Label className="text-[11px] font-medium text-gray-600">
              Final decision about the candidate
            </Label>
            <Textarea
              value={decisionSummary}
              onChange={e => setDecisionSummary(e.target.value)}
              placeholder="Overall summary / review — included in the outcome email…"
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="xs" onClick={() => openDecision('accept')}>
              <Check size={13} /> Accept
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                move.mutate({ id: candidate.id, status: 'On Hold' });
                toast.info('Candidate placed on hold.');
              }}
            >
              <Pause size={13} /> On Hold
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-600"
              onClick={() => openDecision('reject')}
            >
              <ThumbsDown size={13} /> Reject
            </Button>
          </div>
        </div>
      );
    }

    if (!btns.length) return null;
    return <div className="flex flex-wrap items-center gap-2">{btns}</div>;
  };

  // The Accept / On Hold / Reject (or Next) gate shown in each step's header.
  const stageGate = (idx: number): React.ReactNode => {
    const label = stages[idx].label;
    // Once a stage has been accepted it reads as a finished narrative line — no
    // buttons. This keeps only the single active step "live", like the inspiration.
    if (decisionOf(label) === 'Accepted') return null;
    // Actionable on any reached stage at or before the candidate's current position,
    // as long as they haven't been finally selected/rejected.
    const isCurrent = idx <= currentIndex && !decided;
    // Accept / On Hold / Reject only appears once HR has actually recorded the
    // review for the stage — the screening notes for Screening, or a completed
    // call for HR Call. Before that there's nothing to decide on.
    const showGate =
      isCurrent &&
      ((label === 'Screening' && !!candidate.screeningReview) || (label === 'HR Call' && hrCallDone));
    // Physical Interview has NO accept/hold/reject buttons here — its outcome is
    // driven by the interviewer's recommendation, which HR reviews & saves in the
    // feedback modal (a hire opens the Decision step).
    const showResultDecision =
      isCurrent && ((label === 'IQ Test' && iqDone) || (label === 'Assessment' && asgDone));
    const showNext = isCurrent && label === 'Interview Schedule' && interviewReached;

    if (showGate || showResultDecision) {
      // A failed/disqualified IQ test or Assessment offers only "Reject & email"
      // (rescheduling stays available via the stage's Re-assign action). A pass
      // still gets the normal Accept / On Hold / Reject.
      const testFailed = (label === 'IQ Test' && iqFailed) || (label === 'Assessment' && asgFailed);
      if (testFailed)
        return (
          <button
            onClick={() => rejectAfterTest(label as 'IQ Test' | 'Assessment')}
            className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
          >
            <ThumbsDown size={11} /> Reject &amp; email
          </button>
        );
      return (
        <>
          <button
            onClick={() => acceptStage(label)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check size={11} /> Accept
          </button>
          <button
            onClick={() => holdStage(label)}
            className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-[#F1F3F5]"
          >
            <Pause size={11} /> On Hold
          </button>
          <button
            onClick={() => rejectStage(label)}
            className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
          >
            <ThumbsDown size={11} /> Reject
          </button>
        </>
      );
    }

    if (showNext)
      return (
        <button
          onClick={() => nextStage(label)}
          className="inline-flex items-center gap-1 rounded-md bg-accent-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-accent-700"
        >
          Next <ChevronRight size={11} />
        </button>
      );

    // No HR action available on this stage — the status is shown as a chip in the
    // entry header instead, so the action row renders nothing here.
    return null;
  };

  return (
    <div className="space-y-2 text-xs">
      <EditCandidateDialog
        open={editOpen}
        candidate={candidate}
        onClose={() => setEditOpen(false)}
        onSave={updated => update.mutate(updated)}
      />

      {/* Read-only candidate details (opened by the header name/avatar) — no
          edit or actions, just every detail incl. the LinkedIn URL. */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-sm font-bold text-white">
                {candidate.fullName.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold text-gray-900">
                  {candidate.fullName}
                </span>
                <span className="block truncate text-[12px] font-normal text-gray-500">
                  {candidate.appliedRole || candidate.department}
                </span>
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">Candidate details</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3.5 overflow-y-auto pr-1">
            <ProfileSection title="Contact">
              <ProfileRow label="Email" value={candidate.email} />
              <ProfileRow label="Phone" value={candidate.phone} />
              <ProfileRow label="Location" value={candidate.location} />
              {candidate.gender && <ProfileRow label="Gender" value={candidate.gender} />}
            </ProfileSection>

            <ProfileSection title="Professional">
              <ProfileRow label="Current company" value={candidate.currentCompany} />
              <ProfileRow label="Designation" value={candidate.currentDesignation} />
              <ProfileRow label="Total experience" value={`${candidate.totalExperienceYears} yrs`} />
              <ProfileRow label="Relevant experience" value={`${candidate.relevantExperienceYears} yrs`} />
              <ProfileRow label="Notice period" value={`${candidate.noticePeriodDays} days`} />
            </ProfileSection>

            <ProfileSection title="Compensation">
              <ProfileRow label="Current CTC" value={candidate.currentCtc} />
              <ProfileRow label="Expected CTC" value={candidate.expectedCtc} />
            </ProfileSection>

            <ProfileSection title="Application">
              <ProfileRow label="Applied role" value={candidate.appliedRole} />
              <ProfileRow label="Department" value={candidate.department} />
              <ProfileRow label="Source" value={candidate.sourceOfApplication} />
              {candidate.referralDetails && (
                <ProfileRow label="Referral" value={candidate.referralDetails} />
              )}
              <ProfileRow label="Applied on" value={fmtDate(candidate.appliedDate)} />
              <ProfileRow label="Status" value={candidate.status} />
              {fit && <ProfileRow label="Fit" value={fit} />}
            </ProfileSection>

            <ProfileSection title="Links">
              {candidate.linkedInUrl ? (
                <a
                  href={candidate.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] font-medium text-accent-600 hover:underline"
                >
                  <Linkedin size={14} /> LinkedIn profile{' '}
                  <ExternalLink size={12} className="opacity-60" />
                </a>
              ) : (
                <p className="text-[12px] text-gray-400">No LinkedIn URL on file.</p>
              )}
              {candidate.portfolioLink && (
                <a
                  href={candidate.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] font-medium text-accent-600 hover:underline"
                >
                  <ExternalLink size={14} /> Portfolio
                </a>
              )}
              <button
                type="button"
                onClick={openResume}
                className="flex items-center gap-2 text-[12px] font-medium text-accent-600 hover:underline"
              >
                <FileText size={14} /> View résumé <Eye size={12} className="opacity-60" />
              </button>
            </ProfileSection>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header quick-mail composer (Reject / Reminder-JD). */}
      <Dialog open={!!mail} onOpenChange={open => !open && setMail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mail?.kind === 'reject' ? (
                <ThumbsDown size={15} className="text-red-500" />
              ) : (
                <Mail size={15} className="text-accent-600" />
              )}
              {mail?.kind === 'reject' ? 'Send rejection email' : 'Send JD reminder email'}
            </DialogTitle>
            <DialogDescription className="sr-only">Compose email to the candidate</DialogDescription>
          </DialogHeader>
          {mail && (
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] font-medium text-gray-600">To</Label>
                <div className="mt-1 flex items-center gap-1.5 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-gray-700">
                  <Mail size={13} className="text-gray-400" /> {candidate.email}
                </div>
              </div>
              <div>
                <Label htmlFor="mail-subject" className="text-[11px] font-medium text-gray-600">
                  Subject
                </Label>
                <Input
                  id="mail-subject"
                  value={mail.subject}
                  onChange={e => setMail(m => (m ? { ...m, subject: e.target.value } : m))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mail-body" className="text-[11px] font-medium text-gray-600">
                  Message
                </Label>
                <Textarea
                  id="mail-body"
                  value={mail.body}
                  onChange={e => setMail(m => (m ? { ...m, body: e.target.value } : m))}
                  rows={12}
                  className="mt-1 font-mono text-[12px] leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setMail(null)} disabled={mailSending}>
                  Cancel
                </Button>
                <Button onClick={sendHeaderMail} disabled={mailSending || !mail.subject.trim()}>
                  <Send size={14} /> {mailSending ? 'Sending…' : 'Send email'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-width candidate header: avatar + name/role on the left, résumé
          preview + "View candidate profile" on the right. */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] px-4 py-3 shadow-2xs">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            title="View candidate details"
            className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-lg text-left transition hover:opacity-90"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-sm font-bold text-white">
              {candidate.fullName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-gray-900 group-hover:text-accent-600">
                {candidate.fullName}
              </p>
              <p className="truncate text-[12px] text-gray-500">
                {candidate.appliedRole || candidate.department}
              </p>
            </div>
          </button>
          <span className="shrink-0 font-mono text-[11px] font-medium text-gray-400">
            {candidate.id}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Status tag — which step the candidate is on (or where they were
              rejected / put on hold), plus the terminal Selected/Shortlisted. */}
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              selected || offerShortlisted
                ? 'bg-emerald-50 text-emerald-700'
                : rejected
                  ? 'bg-red-50 text-red-600'
                  : onHold
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-accent-50 text-accent-600'
            }`}
          >
            {selected || offerShortlisted ? (
              <Award size={13} />
            ) : rejected ? (
              <Flag size={13} />
            ) : onHold ? (
              <Pause size={13} />
            ) : (
              <Clock4 size={13} />
            )}
            {selected
              ? 'Selected for role'
              : offerShortlisted
                ? 'Offer shortlisted'
                : rejected
                  ? `Rejected · ${stages[currentIndex].label}`
                  : onHold
                    ? `On hold · ${stages[currentIndex].label}`
                    : stages[currentIndex].label}
          </span>
          <RefreshButton
            queryKeys={[
              qk.candidates.all,
              qk.iqTests.all,
              qk.interviews.all,
              qk.testInvites.all,
              qk.schedules.all,
              qk.bgvs.all,
              qk.assignments.all,
              qk.onboarding.all,
              qk.docRequests.all,
            ]}
            title="Refresh candidate flow"
          />
          <button
            type="button"
            onClick={openResume}
            title="Preview résumé"
            aria-label="Preview résumé"
            className="grid size-9 place-items-center rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] text-gray-500 transition hover:border-accent-400 hover:text-accent-600"
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            onClick={openRejectMail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <ThumbsDown size={14} /> Reject
          </button>
          <button
            type="button"
            onClick={openReminderMail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-600"
          >
            <Mail size={14} /> Reminder JD
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-700"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        {/* LEFT — full candidate details, all in one card, section by section */}
        <aside className="space-y-4">
          <div className="space-y-3.5 rounded-2xl border border-[#E4E6EA] bg-white p-4 shadow-2xs">
          <ProfileSection title="Contact">
            <ProfileRow label="Email" value={candidate.email} />
            <ProfileRow label="Phone" value={candidate.phone} />
            <ProfileRow label="Location" value={candidate.location} />
            {candidate.gender && <ProfileRow label="Gender" value={candidate.gender} />}
          </ProfileSection>

          <ProfileSection title="Professional">
            <ProfileRow label="Current company" value={candidate.currentCompany} />
            <ProfileRow label="Designation" value={candidate.currentDesignation} />
            <ProfileRow label="Total experience" value={`${candidate.totalExperienceYears} yrs`} />
            <ProfileRow label="Relevant experience" value={`${candidate.relevantExperienceYears} yrs`} />
            <ProfileRow label="Notice period" value={`${candidate.noticePeriodDays} days`} />
          </ProfileSection>

          <ProfileSection title="Compensation">
            <ProfileRow label="Current CTC" value={candidate.currentCtc} />
            <ProfileRow label="Expected CTC" value={candidate.expectedCtc} />
          </ProfileSection>

          <ProfileSection title="Application">
            <ProfileRow label="Applied role" value={candidate.appliedRole} />
            <ProfileRow label="Department" value={candidate.department} />
            <ProfileRow label="Source" value={candidate.sourceOfApplication} />
            {candidate.referralDetails && (
              <ProfileRow label="Referral" value={candidate.referralDetails} />
            )}
            <ProfileRow label="Applied on" value={fmtDate(candidate.appliedDate)} />
            <ProfileRow label="Status" value={candidate.status} />
            {fit && <ProfileRow label="Fit" value={fit} />}
          </ProfileSection>

          <ProfileSection title="Links">
            {candidate.linkedInUrl ? (
              <a
                href={candidate.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[12px] font-medium text-accent-600 hover:underline"
              >
                LinkedIn profile
              </a>
            ) : (
              <p className="text-[12px] text-gray-400">No LinkedIn URL on file.</p>
            )}
            {candidate.portfolioLink && (
              <a
                href={candidate.portfolioLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[12px] font-medium text-accent-600 hover:underline"
              >
                Portfolio
              </a>
            )}
            <button
              type="button"
              onClick={openResume}
              className="block text-left text-[12px] font-medium text-accent-600 hover:underline"
            >
              View résumé
            </button>
          </ProfileSection>
          </div>
        </aside>

        {/* CENTER — pipeline */}
        <div className="space-y-4">
          <div
            className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs transition-all duration-500 ease-out"
            style={{ opacity: stepIn ? 1 : 0, transform: stepIn ? 'translateY(0)' : 'translateY(10px)' }}
          >
            {/* Header — title + step count */}
            <div className="flex items-center gap-2.5 border-b border-[#ECEDF0] px-5 py-4">
              <h3 className="text-sm font-bold text-gray-900">Recruitment Progress</h3>
              <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-semibold text-accent-700">
                {stages.length} Steps
              </span>
            </div>

            <div className="space-y-2.5 p-4">
              {stages.map((stage, i) => {
                const state = stepState(i);
                const StageIcon = stage.Icon;
                const last = i === stages.length - 1;
                // The thread below this node is "travelled" (green) only up to the
                // halt point — after a failure/rejection it stays grey.
                const pathDone = i < currentIndex && (stopIdx < 0 || i < stopIdx);
                // Steps beyond the halt point are greyed; the halt step itself
                // (the failed/rejected one) stays visible.
                const muted =
                  state === 'todo' || (stopIdx >= 0 ? i > stopIdx : state === 'rejected' && i > currentIndex);
                // Icon square colour: the stage's own colour once DONE, else
                // greyscale while pending / not started. Decision reflects the outcome.
                const doneColor =
                  stage.label === 'Decision'
                    ? selected
                      ? 'bg-emerald-50 text-emerald-600'
                      : rejected
                        ? 'bg-red-50 text-red-600'
                        : 'bg-[#F1F3F5] text-gray-400'
                    : (STAGE_ICON_COLOR[stage.label] ?? 'bg-accent-50 text-accent-600');
                const iconCls = stage.done ? doneColor : 'bg-[#F1F3F5] text-gray-400';
                // Status pill (Completed / Passed / Scheduled / Pending / …).
                const pill: { label: string; cls: string } = (() => {
                  // A completed test shows Passed/Failed even when the step is
                  // crossed out (the failure is what stopped the pipeline).
                  if (stage.label === 'IQ Test' && stage.done)
                    return myIq[0]?.qualificationStatus === 'Passed'
                      ? { label: 'Passed', cls: 'bg-emerald-50 text-emerald-700' }
                      : { label: 'Failed', cls: 'bg-red-50 text-red-600' };
                  if (stage.label === 'Assessment' && stage.done)
                    return asgInvite?.passed
                      ? { label: 'Passed', cls: 'bg-emerald-50 text-emerald-700' }
                      : { label: 'Failed', cls: 'bg-red-50 text-red-600' };
                  // Steps crossed out (rejected) carry no tag at all — just the
                  // crossed rail icon. The step that actually failed a test already
                  // returned its own Failed pill above, before reaching this check.
                  if (state === 'rejected') return { label: '', cls: '' };
                  if (stage.label === 'Decision') {
                    if (selected) return { label: 'Selected for role', cls: 'bg-emerald-50 text-emerald-700' };
                    if (offerShortlisted) return { label: 'Shortlisted', cls: 'bg-emerald-50 text-emerald-700' };
                    return { label: 'Pending', cls: 'bg-[#F1F3F5] text-gray-500' };
                  }
                  // Physical Interview shows the interviewer's recommendation
                  // (Strong Hire / Hire / Hold / Re-Interview Required / Reject).
                  if (stage.label === 'Physical Interview' && interviewRecommendation) {
                    const rec = interviewRecommendation;
                    const cls = /reject/i.test(rec)
                      ? 'bg-red-50 text-red-600'
                      : /hold|re-?interview/i.test(rec)
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700';
                    return { label: rec, cls };
                  }
                  if (stage.done) return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' };
                  if (state === 'current') {
                    if (stage.label === 'Interview Schedule')
                      return { label: 'Scheduled', cls: 'bg-accent-50 text-accent-700' };
                    if (stage.label === 'Physical Interview')
                      return { label: 'Awaiting', cls: 'bg-accent-50 text-accent-700' };
                    return { label: 'In progress', cls: 'bg-accent-50 text-accent-700' };
                  }
                  return { label: 'Pending', cls: 'bg-[#F1F3F5] text-gray-500' };
                })();
                // Default (openStep === null) opens whichever step is current.
                const activeStep = openStep ?? currentIndex;
                const infoShown = activeStep === i;
                const toggleInfo = () => setOpenStep(activeStep === i ? -1 : i);
                const actions = stageActions(i);
                const gate = stageGate(i);
                return (
                  <div
                    key={stage.label}
                    className="relative flex gap-3 transition-all duration-500"
                    style={{
                      transitionDelay: `${i * 60}ms`,
                      opacity: stepIn ? 1 : 0,
                      transform: stepIn ? 'translateY(0)' : 'translateY(8px)',
                    }}
                  >
                    {/* Rail: status node + connecting thread (process flow) */}
                    <div className="relative flex w-6 shrink-0 flex-col items-center">
                      <span className="mt-4">
                        {state === 'done' ? (
                          <span className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        ) : state === 'rejected' ? (
                          <span className="grid size-6 place-items-center rounded-full bg-red-500 text-white">
                            <XCircle size={13} />
                          </span>
                        ) : state === 'current' ? (
                          <span className="grid size-6 place-items-center rounded-full bg-[#C21C51] ring-4 ring-[#C21C51]/15">
                            <span className="size-2 rounded-full bg-white" />
                          </span>
                        ) : (
                          <span className="size-6 rounded-full border-2 border-[#D8DAE0] bg-white" />
                        )}
                      </span>
                      {!last && (
                        <span
                          className={`mt-1 w-0.5 flex-1 ${pathDone ? 'bg-emerald-400' : 'bg-[#E4E6EA]'}`}
                        />
                      )}
                    </div>

                    {/* Step card */}
                    <div
                      className={`min-w-0 flex-1 rounded-2xl border transition-colors ${
                        infoShown
                          ? 'border-[#C21C51] bg-[#C21C51]/[0.06]'
                          : state === 'current'
                            ? 'border-[#C21C51]/30 bg-[#C21C51]/[0.05]'
                            : 'border-[#E9EAEE] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-3.5 py-3">
                        {/* Clickable identity region (icon + number + name/desc) */}
                        <button
                          type="button"
                          onClick={toggleInfo}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors ${iconCls}`}
                          >
                            <StageIcon size={16} />
                          </span>
                          <span className="hidden shrink-0 font-mono text-[11px] font-semibold text-gray-400 sm:inline">
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block truncate text-sm font-semibold ${muted ? 'text-gray-400' : 'text-gray-900'}`}
                            >
                              {stage.label}
                            </span>
                            {STAGE_NOTES[stage.label] && (
                              <span className="block truncate text-[12px] text-gray-500">
                                {STAGE_NOTES[stage.label]}
                              </span>
                            )}
                          </span>
                        </button>

                        {/* Right group — date, status pill, actions, chevron */}
                        {stage.when && (
                          <span className="hidden shrink-0 font-mono text-[10px] text-gray-400 md:inline">
                            {fmtDateTime(stage.when)}
                          </span>
                        )}
                        {pill.label && (
                          <span
                            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${pill.cls}`}
                          >
                            {pill.label}
                          </span>
                        )}
                        {stage.label !== 'Decision' && actions}
                        <button
                          type="button"
                          onClick={toggleInfo}
                          aria-label={infoShown ? 'Hide details' : 'View details'}
                          aria-expanded={infoShown}
                          title="View details"
                          className={`grid size-8 shrink-0 place-items-center rounded-full border transition ${
                            infoShown
                              ? 'border-[#C21C51]/30 bg-white text-[#C21C51]'
                              : 'border-[#E4E6EA] bg-white text-gray-400 hover:bg-[#F1F3F5] hover:text-gray-600'
                          }`}
                        >
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${infoShown ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Expanded section — required details + actions for this step */}
                      {infoShown && (
                        <div className="space-y-3 rounded-b-2xl border-t border-[#C21C51]/15 bg-white px-3.5 py-3">
                          {stageDetail(i)}
                          {stage.label === 'Decision' && actions && <div>{actions}</div>}
                          {gate && <div className="flex flex-wrap items-center gap-2">{gate}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                    <span className="shrink-0 font-mono text-[10px] text-gray-400">
                      {fmtDateTime(ev.date)}
                    </span>
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
                        <p className="mt-1 font-mono text-[10px] text-gray-400">
                          Invite email: {iv.emailStatus}
                        </p>
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
              {openForm === 'decision' && <Flag size={15} className="text-accent-600" />}
              {openForm === 'ivpack' && <Send size={15} className="text-accent-600" />}
              {openForm === 'screening'
                ? 'Screening review'
                : openForm === 'hrcall'
                  ? 'HR introductory call'
                  : openForm === 'grade'
                    ? 'Grade assignment'
                    : openForm === 'feedback'
                      ? `Interview feedback${fbInterview ? ` — ${fbInterview.interviewRound}` : ''}`
                      : openForm === 'decision'
                        ? decisionKind === 'accept'
                          ? 'Send congratulations email'
                          : 'Send rejection email'
                        : openForm === 'ivpack'
                          ? 'Send pack to interviewer'
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
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${fitStyle(fit)}`}
                    >
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
                  <p className="text-[11px] italic text-gray-500">Document the candidate call securely.</p>
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
                      <RatingRow
                        value={hc.communicationRating}
                        onChange={v => updateHc('communicationRating', v)}
                      />
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
                    <Select
                      value={hc.nextStep}
                      onChange={e => updateHc('nextStep', e.target.value as HRCallRecord['nextStep'])}
                      className={FIELD_CLS}
                    >
                      <option value="Proceed to Interview">Proceed to Panel Interview</option>
                      <option value="Schedule Follow-Up Call">Schedule Follow-Up Call</option>
                      <option value="Request More Information">Request More Information</option>
                      <option value="Keep on Hold">Keep on Hold</option>
                      <option value="Reject">Reject Candidate</option>
                    </Select>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        window.open(
                          documentPreviewUrl(asgInvite.submissionDocId!),
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-secondary cursor-pointer"
                    >
                      <Eye size={14} /> Preview submission
                    </button>
                    <button
                      onClick={() => openDocument(asgInvite.submissionDocId!)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-secondary cursor-pointer"
                    >
                      <Download size={14} /> {asgInvite.submissionFileName ?? 'Download'}
                    </button>
                  </div>
                )}

                {/* Candidate's MCQ answers — selected option marked, correct in green */}
                {asgInvite?.assessmentQuestions && asgInvite.assessmentQuestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Candidate&apos;s answers</Label>
                    <div className="space-y-2.5">
                      {asgInvite.assessmentQuestions.map((q, i) => {
                        const sel = asgInvite.answers?.[String(i)];
                        return (
                          <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
                            <p className="text-[13px] font-semibold text-gray-800">
                              {i + 1}. {q.text}
                            </p>
                            <div className="mt-2 space-y-1.5">
                              {q.options.map((opt, oi) => {
                                const isSel = sel === oi;
                                const isCorrect = q.answer === oi;
                                return (
                                  <div
                                    key={oi}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1 text-[12px] ${
                                      isCorrect
                                        ? 'bg-emerald-50 font-semibold text-emerald-700'
                                        : isSel
                                          ? 'bg-red-50 text-red-600'
                                          : 'text-gray-600'
                                    }`}
                                  >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[10px] font-bold">
                                      {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span className="flex-1">{opt}</span>
                                    {isSel && (
                                      <span className="rounded-full bg-accent-50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-600">
                                        Candidate
                                      </span>
                                    )}
                                    {isCorrect && <CheckCircle2 size={13} className="text-emerald-600" />}
                                  </div>
                                );
                              })}
                              {sel == null && (
                                <p className="text-[11px] text-gray-400">No answer recorded.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                  Saving records the score &amp; comments only. Then Accept (pass), On Hold, or Reject the
                  stage to decide how the candidate moves forward.
                </p>
              </>
            )}

            {/* Interview feedback form */}
            {openForm === 'feedback' && (
              <>
                {fbResponses && fbResponses.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Interviewer&apos;s responses</Label>
                    <div className="space-y-2.5">
                      {fbResponses.map((r, i) => {
                        // Star-rated questions have no options; selected is "1".."5" or "NA".
                        // MCQ questions carry options; selected is the chosen option text.
                        const isRating = (r.options?.length ?? 0) === 0;
                        const isNA = r.selected === 'NA' || r.selected === 'na';
                        return (
                          <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
                            <p className="text-[13px] font-semibold text-gray-800">
                              {i + 1}. {r.text}
                            </p>
                            <p className="mt-1 text-[12px]">
                              {r.selected ? (
                                isNA ? (
                                  <span className="font-medium text-amber-600">Rated: NA</span>
                                ) : isRating ? (
                                  <span className="font-medium text-emerald-700">
                                    Rated: {r.selected} / 5
                                  </span>
                                ) : (
                                  <span className="font-medium text-emerald-700">Answered: {r.selected}</span>
                                )
                              ) : (
                                <span className="text-gray-400">No answer recorded</span>
                              )}
                            </p>
                            {r.note && (
                              <p className="mt-1 text-[12px] text-gray-600">
                                <span className="font-medium text-gray-500">Comment: </span>
                                {r.note}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="fb-rec" className="text-sm font-medium">
                    Recommendation
                  </Label>
                  <Select
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
                  </Select>
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
                <div>
                  <Label htmlFor="fb-summary" className="text-sm font-medium">
                    Feedback summary <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Textarea
                    id="fb-summary"
                    value={fbSummary}
                    onChange={e => setFbSummary(e.target.value)}
                    placeholder="Add your own summary of the interview (optional)…"
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </>
            )}

            {/* Final-decision outcome email (Accept = congrats, Reject = rejection) */}
            {openForm === 'decision' && (
              <>
                <p
                  className={`rounded-lg px-3 py-2 text-[12px] font-medium ${
                    decisionKind === 'accept' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {decisionKind === 'accept'
                    ? 'Accepting marks the candidate Selected and emails this congratulations note.'
                    : 'Rejecting marks the candidate Rejected and emails this note (with their IQ & assessment scores).'}
                </p>
                <div>
                  <Label htmlFor="dec-subject" className="text-sm font-medium">
                    Subject
                  </Label>
                  <Input
                    id="dec-subject"
                    value={decisionSubject}
                    onChange={e => setDecisionSubject(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="dec-body" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="dec-body"
                    value={decisionBody}
                    onChange={e => setDecisionBody(e.target.value)}
                    rows={12}
                    className="mt-2 font-mono text-[12px] leading-relaxed"
                  />
                </div>
              </>
            )}

            {/* Send resume + interview questions to the interviewer */}
            {openForm === 'ivpack' && (
              <>
                <div>
                  <Label htmlFor="ivp-to" className="text-sm font-medium">
                    To (interviewer email)
                  </Label>
                  <Input
                    id="ivp-to"
                    type="email"
                    value={ivpackToEmail}
                    onChange={e => setIvpackToEmail(e.target.value)}
                    placeholder="interviewer@example.com"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="ivp-mode" className="text-sm font-medium">
                    Interview mode
                  </Label>
                  <Select
                    id="ivp-mode"
                    value={ivpackMode}
                    onChange={e => setIvpackMode(e.target.value as 'Online' | 'Offline')}
                    className={SELECT_CLS}
                  >
                    <option value="Offline">Offline (in-person)</option>
                    <option value="Online">Online (Google Meet)</option>
                  </Select>
                </div>
                {ivpackMode === 'Online' && (
                  <p className="rounded-lg bg-accent-50 px-3 py-2 text-[12px] text-accent-700">
                    A Google Meet link is created automatically and emailed to both the candidate and the
                    interviewer (requires Google Calendar connected in Global Settings).
                  </p>
                )}
                <div>
                  <Label htmlFor="ivp-bank" className="text-sm font-medium">
                    Interview question set
                  </Label>
                  {ivpackBanks.length === 0 ? (
                    <p className="mt-2 rounded-md border border-dashed border-border bg-secondary/20 px-3 py-2 text-[12px] text-gray-500">
                      No interview question sets found. Create one in Question Library → Interview Questions.
                    </p>
                  ) : (
                    <Select
                      id="ivp-bank"
                      value={ivpackBankId}
                      onChange={e => {
                        setIvpackBankId(e.target.value);
                        setIvpackSheet(null);
                        if (e.target.value) void regenIvpackSheet(e.target.value);
                      }}
                      className={SELECT_CLS}
                    >
                      <option value="">Select a set…</option>
                      {ivpackBanks.map(b => {
                        const n = INTERVIEW_MODULES.reduce((acc, m) => acc + (b.modules[m]?.length ?? 0), 0);
                        return (
                          <option key={b.id} value={b.id}>
                            {b.roleName} ({n} question{n === 1 ? '' : 's'})
                          </option>
                        );
                      })}
                    </Select>
                  )}
                </div>

                {/* The links that go to the interviewer — shown up front like the
                    IQ/Assessment link, so HR can preview or copy them. */}
                <div className="space-y-2">
                  <div>
                    <Label className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
                      <Link2 size={12} /> Interview kit link
                    </Label>
                    {ivpackSheet ? (
                      <a
                        href={ivpackSheet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-accent-600 hover:underline"
                      >
                        {ivpackSheet.url}
                      </a>
                    ) : (
                      <p className="mt-1 rounded-md border border-dashed border-input bg-secondary/20 px-3 py-2 text-[12px] text-gray-400">
                        Select an interview question set to generate the link.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
                      <FileText size={12} /> Candidate résumé link
                    </Label>
                    {resumeDoc ? (
                      <a
                        href={documentPreviewUrl(resumeDoc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-accent-600 hover:underline"
                      >
                        {documentPreviewUrl(resumeDoc.id)}
                      </a>
                    ) : (
                      <p className="mt-1 rounded-md border border-dashed border-input bg-secondary/20 px-3 py-2 text-[12px] text-gray-400">
                        No résumé uploaded for this candidate.
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="ivp-subject" className="text-sm font-medium">
                    Subject
                  </Label>
                  <Input
                    id="ivp-subject"
                    value={ivpackSubject}
                    onChange={e => setIvpackSubject(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="ivp-body" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="ivp-body"
                    value={ivpackBody}
                    onChange={e => setIvpackBody(e.target.value)}
                    rows={10}
                    className="mt-2 font-mono text-[12px] leading-relaxed"
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
            {openForm === 'decision' && (
              <Button onClick={submitDecision} disabled={update.isPending}>
                <Mail size={14} /> {decisionKind === 'accept' ? 'Select & send email' : 'Reject & send email'}
              </Button>
            )}
            {openForm === 'ivpack' && (
              <Button onClick={submitIvPack} disabled={!ivpackBankId}>
                <Send size={14} />{' '}
                {ivpackMode === 'Online' ? 'Send to candidate & interviewer' : 'Send to interviewer'}
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

// Read-only candidate-details modal helpers.
function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#ECEDF0] pt-3.5 first:border-t-0 first:pt-0">
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] text-gray-500">{label}</span>
      <span className="min-w-0 break-words text-right text-[12px] font-medium text-gray-800">
        {value || '—'}
      </span>
    </div>
  );
}
