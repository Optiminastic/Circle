'use client';

import React, { useState } from 'react';
import {
  FileSignature,
  PenLine,
  FileText,
  ShieldCheck,
  Fingerprint,
  CalendarCheck,
  DoorOpen,
  Mail,
  BadgeCheck,
  Check,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  Clock4,
  Lock,
  ChevronDown,
  Eye,
  Download,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { BGVRequirement, OnboardingChecklist } from '@/types';
import { useCandidates, useBgvs, useUpdateBgv, useStartBgv } from '@/features/candidates/hooks';
import { useOngridOnboard } from '@/features/bgv/hooks';
import { sendCustomEmail } from '@/lib/api/notifications';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from './Select';
import {
  useDocRequests,
  useDocRequestMutations,
  isDocRequestLive,
} from '@/features/doc-requests/hooks';
import { SIGN_OFFER_TTL_HOURS } from '@/lib/sign-offer';
import { useDocuments, downloadDocument } from '@/features/documents/hooks';
import { documentPreviewUrl } from '@/lib/api/documents';
import {
  useOnboardingEmails,
  usePromoteFromOnboarding,
  OnboardingEmailKind,
} from '@/features/onboarding/hooks';
import { nowISO } from '@/lib/utils';
import { useToast } from '@/components/Toaster';
import { OnboardingEmailComposer, type ComposerSeed } from '@/components/OnboardingEmailComposer';
import { SendOfferLetterModal } from '@/components/SendOfferLetterModal';
import { RequestDocumentsModal } from '@/components/RequestDocumentsModal';
import { StartBgvModal } from '@/components/StartBgvModal';
import { RefreshButton } from '@/components/RefreshButton';
import { bgvCheckByCode } from '@/lib/bgv-services';
import { buildOnboardingEmailDraft } from '@/lib/onboarding-email-templates';
import { fetchRenderedTemplate } from '@/features/email-templates/hooks';
import { HR_EMAIL } from '@/lib/config';

interface OnboardingStepperProps {
  checklist: OnboardingChecklist;
}

type StageAction =
  | { kind: 'email'; emailKind: OnboardingEmailKind; cta: string }
  | { kind: 'mark-signed'; cta: string }
  | { kind: 'request-docs'; cta: string }
  | { kind: 'start-bgv'; cta: string }
  | { kind: 'verify-bgv'; cta: string }
  | { kind: 'confirm-joining'; cta: string }
  | { kind: 'mark-arrived'; cta: string }
  | { kind: 'convert-employee'; cta: string }
  | { kind: 'none' };

type StepState = 'done' | 'current' | 'todo';

// Per-stage icon colour shown once the step is DONE (greyscale otherwise) —
// same visual system as the candidate Recruitment Progress flow.
const STAGE_ICON_COLOR: Record<string, string> = {
  'Offer letter': 'bg-blue-50 text-blue-600',
  'Signed offer received': 'bg-violet-50 text-violet-600',
  'Joining Documents': 'bg-orange-50 text-orange-600',
  'Background verification': 'bg-purple-50 text-purple-600',
  'Joining date confirmation': 'bg-pink-50 text-pink-600',
  'First day': 'bg-green-50 text-green-600',
  'Appointment letter': 'bg-indigo-50 text-indigo-600',
  Employee: 'bg-emerald-50 text-emerald-600',
};

// One-line subtitle under each stage name (collapsed row) — static, unlike
// `desc` which reflects live status.
const STAGE_NOTES: Record<string, string> = {
  'Offer letter': 'Send the formal offer for review & signature',
  'Signed offer received': 'Candidate returns their signed copy',
  'Joining Documents': 'Collect & verify joining paperwork',
  'Background verification': 'Run background checks via OnGrid',
  'Joining date confirmation': 'Confirm & share the first working day',
  'First day': "Candidate's first day at the office",
  'Appointment letter': 'Confirm full terms of employment',
  Employee: 'Convert into the employee directory',
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

/** How long the signed-offer upload link stays live: "Expires in 71h 12m" / "Link expired". */
const fmtLinkExpiry = (iso: string): string => {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return '';
  if (ms <= 0) return 'Link expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`;
};

export function OnboardingStepper({ checklist }: OnboardingStepperProps) {
  const toast = useToast();
  const { data: candidates = [] } = useCandidates();
  const { data: requests = [] } = useDocRequests();
  const { data: bgvs = [] } = useBgvs();
  const { sendComposed, markOfferSigned, setJoiningDate, markFirstDayArrived } = useOnboardingEmails();
  const { create: createDocRequest, reactivate: reactivateDocRequest } = useDocRequestMutations();
  const updateBgv = useUpdateBgv();
  const startBgv = useStartBgv();
  const ongridOnboard = useOngridOnboard();
  const promote = usePromoteFromOnboarding();

  // Only one step accordion is open at a time. `null` = the user hasn't chosen
  // yet, so it defaults to the current step; `-1` = explicitly none.
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [composer, setComposer] = useState<(ComposerSeed & { kind: OnboardingEmailKind }) | null>(
    null,
  );
  // Separate composer for the "documents invalid" email sent when HR rejects a BGV.
  const [invalidEmail, setInvalidEmail] = useState<ComposerSeed | null>(null);
  const [sendingInvalid, setSendingInvalid] = useState(false);
  // The offer letter uses a richer modal (attachment + signed-copy upload link).
  const [sendOfferOpen, setSendOfferOpen] = useState(false);
  // Editable request-documents email modal (To / Subject / Message).
  const [requestDocsOpen, setRequestDocsOpen] = useState(false);
  // "Start verification" check-picker (which BGV services to run).
  const [startBgvOpen, setStartBgvOpen] = useState(false);
  // Joining-date picker value for the "Joining date confirmation" step.
  const [joiningInput, setJoiningInput] = useState(checklist.joiningDate ?? '');
  // Re-activation duration picker for the joining-documents upload link.
  const [docReqHours, setDocReqHours] = useState(24);

  const candidate = candidates.find(c => c.id === checklist.candidateId);
  // Resending mints a fresh link, so pick the request that actually holds the
  // candidate's uploads (most submissions / bank), not just the newest.
  const docRequest = requests
    .filter(r => r.candidateId === checklist.candidateId && r.kind !== 'signed-offer')
    .sort(
      (a, b) =>
        (b.submissions?.length ?? 0) +
        (b.bankDetails?.accountNumber ? 1 : 0) -
        ((a.submissions?.length ?? 0) + (a.bankDetails?.accountNumber ? 1 : 0)) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  // Live/expiry status of the joining-documents upload link, and a copy-link
  // action — shown on the Joining Documents step until it's fully verified.
  const docReqLive = docRequest ? isDocRequestLive(docRequest) : false;
  const fmtDocReqExpiry = (req: NonNullable<typeof docRequest>): string => {
    const ms = new Date(req.expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`;
  };
  const copyDocLink = () => {
    if (!docRequest) return;
    const link = `${window.location.origin}/onboarding-docs/${docRequest.id}`;
    navigator.clipboard?.writeText(link).then(
      () => toast.success('Upload link copied.'),
      () => toast.error('Could not copy the link.'),
    );
  };
  const bgv = bgvs.find(b => b.candidateId === checklist.candidateId);
  const toEmail = candidate?.email || checklist.candidateEmail || '';

  // Signed offer letter the candidate uploaded via the 72h public link (stored in
  // S3 + the documents table as category "Signed Offer Letter").
  const { data: candidateDocs = [] } = useDocuments('candidate', checklist.candidateId);
  const signedOfferDoc = candidateDocs
    .filter(d => d.category === 'Signed Offer Letter')
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  // The 72h signed-copy upload link (a "signed-offer" doc-request) — used to offer
  // a reactivate button once it has expired and nothing has been uploaded yet.
  const signOfferReq = requests
    .filter(r => r.candidateId === checklist.candidateId && r.kind === 'signed-offer')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const signOfferExpired = signOfferReq ? new Date(signOfferReq.expiresAt).getTime() <= Date.now() : false;
  // Signed offer confirmed received (uploaded or HR-marked). Once true, the offer
  // is settled: no more resending the offer letter or reactivating the link.
  const signedOfferDone = Boolean(checklist.offerSignedReceivedAt) || Boolean(signedOfferDoc);


  const verifiedCount = docRequest?.submissions?.filter(s => s.status === 'Verified').length ?? 0;
  const requiredCount = docRequest?.requiredDocs?.length ?? 0;
  const docsRequested = Boolean(docRequest);
  const docsVerified = docRequest?.status === 'Verified';
  const bgvVerified = bgv?.overallStatus === 'Verified';
  // Once the candidate's data is sent to OnGrid, HR's part of this step is done —
  // the external check runs for ~20 days and must NOT block the rest of onboarding.
  const bgvSent = Boolean(bgv?.ongridIndividualId);
  const joiningConfirmed = Boolean(checklist.joiningDateConfirmedAt);
  const firstDayArrived = Boolean(checklist.firstDayArrivedAt);
  const joined =
    checklist.progressPercentage === 100 ||
    checklist.onboardingStatus === 'Joined' ||
    checklist.onboardingStatus === 'Onboarding Completed';

  const stages: {
    Icon: typeof ShieldCheck;
    label: string;
    done: boolean;
    desc: string;
    at?: string;
    detail: string;
    action: StageAction;
  }[] = [
    {
      Icon: FileSignature,
      label: 'Offer letter',
      done: Boolean(checklist.offerLetterSentAt),
      desc: checklist.offerLetterSentAt ? 'Sent' : 'Pending',
      at: checklist.offerLetterSentAt,
      detail:
        'Email the candidate their formal offer letter to review. They are asked to sign it and send the signed copy back.',
      action: { kind: 'email', emailKind: 'offer_letter', cta: 'offer letter' },
    },
    {
      Icon: PenLine,
      label: 'Signed offer received',
      // Completes only when HR confirms the signed copy is valid — an upload alone
      // does NOT auto-complete it.
      done: Boolean(checklist.offerSignedReceivedAt),
      desc: checklist.offerSignedReceivedAt ? 'Received' : signedOfferDoc ? 'Uploaded — review' : 'Awaiting',
      at: checklist.offerSignedReceivedAt,
      detail: signedOfferDoc
        ? 'The candidate uploaded their signed offer letter. Preview/download it below, then confirm it is properly signed to complete this step.'
        : 'The candidate can upload their signed copy via the 72-hour link in the offer email, or mark it received here manually.',
      action: { kind: 'mark-signed', cta: 'Mark received' },
    },
    {
      Icon: FileText,
      label: 'Joining Documents',
      // Completes only when every uploaded joining document has been VERIFIED —
      // not merely when the upload link was sent.
      done: docsVerified,
      desc: docsVerified
        ? 'Verified'
        : docRequest
          ? `${verifiedCount}/${requiredCount} verified`
          : docsRequested
            ? 'Requested'
            : 'Pending',
      detail: docsVerified
        ? 'All joining documents have been received and verified.'
        : docRequest
          ? `${verifiedCount} of ${requiredCount} documents verified. Verify each upload in the Joining documents panel on the right; preview/download them below.`
          : 'Email the candidate a secure link to upload their joining documents, then verify each upload in the Joining documents panel.',
      action: { kind: 'request-docs', cta: docsRequested ? 'Resend link' : 'Request documents' },
    },
    {
      Icon: Fingerprint,
      label: 'Background verification',
      // Sending to OnGrid completes this step for onboarding purposes — the actual
      // verification runs externally (~20 days) and never blocks the next steps.
      done: bgvVerified || bgvSent,
      desc: bgvVerified ? 'Verified' : bgvSent ? 'Sent · verifying' : bgv ? bgv.overallStatus : 'Not started',
      detail: bgvVerified
        ? 'Background verification is cleared.'
        : bgvSent
          ? 'Sent to OnGrid — verification is in progress (this can take ~20 days). You can continue onboarding now, and record the outcome (Verified / Invalid) here whenever it comes back.'
          : bgv
            ? `Background check is "${bgv.overallStatus}". Send it to OnGrid to begin.`
            : 'Background verification has not started yet. Start it to pick which checks to run.',
      action: bgv ? { kind: 'verify-bgv', cta: 'Mark BGV verified' } : { kind: 'start-bgv', cta: 'Start BGV' },
    },
    {
      Icon: CalendarCheck,
      label: 'Joining date confirmation',
      done: joiningConfirmed,
      desc: joiningConfirmed
        ? `Confirmed${checklist.joiningDate ? ` · ${fmtDate(checklist.joiningDate)}` : ''}`
        : 'Pending',
      at: checklist.joiningDateConfirmedAt,
      detail:
        'Pick the first working day and email the candidate to confirm it (with the office address and what to bring).',
      action: { kind: 'confirm-joining', cta: 'Confirm & email' },
    },
    {
      Icon: DoorOpen,
      label: 'First day',
      done: firstDayArrived,
      desc: firstDayArrived ? 'Arrived' : 'Pending',
      at: checklist.firstDayArrivedAt,
      detail:
        "On the candidate's first office day, mark them arrived — this also pushes their profile + documents to the external onboarding system (feed webhook).",
      action: { kind: 'mark-arrived', cta: 'Mark arrived' },
    },
    {
      Icon: Mail,
      label: 'Appointment letter',
      done: Boolean(checklist.appointmentLetterSentAt),
      desc: checklist.appointmentLetterSentAt ? 'Sent' : 'Pending',
      at: checklist.appointmentLetterSentAt,
      detail:
        'Email the candidate their letter of appointment confirming the full terms of their employment.',
      action: { kind: 'email', emailKind: 'appointment_letter', cta: 'appointment letter' },
    },
    {
      Icon: BadgeCheck,
      label: 'Employee',
      done: joined,
      desc: joined ? 'Onboarded' : 'Pending',
      detail: joined
        ? 'The candidate has been onboarded into the employee directory.'
        : 'The final step — convert the candidate into an employee once the appointment letter is out.',
      action: { kind: 'convert-employee', cta: 'Convert to employee' },
    },
  ];

  // First not-yet-done stage is "current"; everything before it is done.
  const firstOpen = stages.findIndex(s => !s.done);
  const currentIndex = firstOpen === -1 ? stages.length - 1 : firstOpen;

  const stepState = (i: number): StepState =>
    i < currentIndex ? 'done' : i === currentIndex ? (stages[i].done ? 'done' : 'current') : 'todo';

  // Open the editable composer pre-filled from the template for this email kind.
  // The offer letter is editable in Settings → Email templates, so it reads from
  // there; the other kinds still use their built-in draft.
  const openComposer = (emailKind: OnboardingEmailKind, cta: string, startDate?: string) => {
    const draft = buildOnboardingEmailDraft(emailKind, candidate, startDate ? { startDate } : undefined);
    setComposer({ kind: emailKind, title: `Send ${cta}`, to: toEmail, subject: draft.subject, body: draft.body });
    if (emailKind !== 'offer_letter') return;
    fetchRenderedTemplate('offer_letter', {
      candidate_name: candidate?.fullName || 'Candidate',
      role: candidate?.appliedRole || 'the role',
      ctc: candidate?.expectedCtc || candidate?.currentCtc || '[Annual CTC]',
      joining_date: startDate || '[start date]',
      hr_email: HR_EMAIL,
    })
      .then(tpl => {
        if (!tpl) return;
        setComposer(prev =>
          prev && prev.kind === 'offer_letter'
            ? { ...prev, subject: tpl.subject, body: tpl.body }
            : prev,
        );
      })
      .catch(() => {});
  };

  const sendFromComposer = (subject: string, body: string) => {
    if (!composer) return;
    const cta = composer.title.replace(/^Send\s+/i, '');
    sendComposed.mutate(
      { candidateId: checklist.candidateId, kind: composer.kind, to: composer.to, subject, body },
      {
        onSuccess: ({ emailed, emailReason }) => {
          if (emailed) toast.success(`Sent the ${cta} to ${composer.to}.`);
          else if (emailReason === 'not_configured')
            toast.info(`${cta} recorded. Email not sent — SMTP is not configured.`);
          else if (!composer.to) toast.info(`${cta} recorded, but no email on file.`);
          else toast.info(`${cta} recorded, but the email could not be sent.`);
          setComposer(null);
        },
        onError: () => toast.error(`Could not send the ${cta} — try again.`),
      },
    );
  };

  const markSigned = () =>
    markOfferSigned.mutate(checklist.candidateId, {
      onSuccess: () => toast.success('Signed offer recorded.'),
      onError: () => toast.error('Could not record the signed offer — try again.'),
    });

  // Opens the editable request-documents email modal (To / Subject / Message).
  const requestDocs = () => setRequestDocsOpen(true);

  // Store the picked joining date, then open the confirmation email pre-filled with it.
  const confirmJoining = () => {
    if (!joiningInput) {
      toast.error('Pick a joining date first.');
      return;
    }
    setJoiningDate.mutate(
      { candidateId: checklist.candidateId, date: joiningInput },
      {
        onSuccess: () => openComposer('joining_date', 'joining date', fmtDate(joiningInput)),
        onError: () => toast.error('Could not save the joining date — try again.'),
      },
    );
  };

  const markArrived = () =>
    markFirstDayArrived.mutate(checklist.candidateId, {
      onSuccess: () => toast.success('Marked arrived — pushed to the onboarding feed.'),
      onError: () => toast.error('Could not mark arrived — try again.'),
    });

  // "Send for verification" opens the check-picker; the modal hands back the
  // selected verification codes. We record them on the BGV record and then push
  // the candidate + their documents to OnGrid in one go.
  const beginBgv = () => {
    if (!candidate) return;
    setStartBgvOpen(true);
  };
  const confirmBgv = async (services: string[]) => {
    if (!candidate) return;
    try {
      // Record which verifications HR selected (create the record or update it on
      // a re-send), so the "verifications sent" list reflects this selection.
      if (bgv) {
        await updateBgv.mutateAsync({ ...bgv, services });
      } else {
        await startBgv.mutateAsync({ candidate, services });
      }
    } catch {
      toast.error('Could not save the selected verifications — try again.');
      return;
    }
    // Send everything to OnGrid (identity + accepted documents).
    ongridOnboard.mutate(candidate.id, {
      onSuccess: res => {
        if (res.ok) {
          const up = (res.documents ?? []).filter(d => d.status === 'uploaded').length;
          toast.success(
            `Sent to OnGrid for verification — individual ${res.individualId}, ${up} document(s) uploaded.`,
          );
          setStartBgvOpen(false);
        } else if (res.reason === 'no_consent') {
          toast.error('Candidate has not given verification consent yet.');
        } else if (res.reason === 'no_gender') {
          toast.error('Candidate has no gender on file — needed for OnGrid.');
        } else if (res.reason === 'not_configured') {
          toast.info('OnGrid is not configured on the server.');
        } else {
          toast.error(`OnGrid could not onboard the candidate: ${res.reason ?? 'unknown error'}.`);
        }
      },
      onError: () => toast.error('Could not reach OnGrid — try again.'),
    });
  };

  const verifyBgvNow = () => {
    if (!bgv) return;
    const cleared: BGVRequirement = {
      ...bgv,
      overallStatus: 'Verified',
      documents: bgv.documents.map(d => ({ ...d, status: 'Verified' })),
      verificationTimeline: [
        ...bgv.verificationTimeline,
        { date: nowISO(), action: 'Background verification cleared from onboarding', performedBy: 'HR' },
      ],
    };
    updateBgv.mutate(cleared, {
      onSuccess: () => toast.success('Background verification marked as cleared.'),
      onError: () => toast.error('Could not update BGV — try again.'),
    });
  };

  // Reject a BGV: open an editable email telling the candidate their documents /
  // details are invalid. Records the rejection on the BGV once the email is sent.
  const openInvalidEmail = () => {
    if (!candidate) return;
    const role = candidate.appliedRole || 'the role';
    setInvalidEmail({
      title: 'Documents invalid',
      to: candidate.email || checklist.candidateEmail || '',
      subject: 'Issue with your submitted documents — Optiminastic',
      body: [
        `Dear ${candidate.fullName || 'Candidate'},`,
        '',
        `Thank you for submitting your documents for ${role}.`,
        '',
        'During verification, we found that some of the documents or details you provided could not be validated. This may be due to unclear scans, mismatched information, or missing documents.',
        '',
        'Please re-check and re-share the correct documents/details so we can proceed with your onboarding. If you have any questions, just reply to this email.',
        '',
        'Warm regards,',
        'Optiminastic HR Team',
      ].join('\n'),
    });
  };

  const sendInvalidEmail = async (subject: string, body: string) => {
    if (!invalidEmail) return;
    const to = invalidEmail.to.trim();
    if (!to) {
      toast.error('No candidate email on file to send to.');
      return;
    }
    setSendingInvalid(true);
    try {
      const res = await sendCustomEmail({ to, subject, body });
      if (res.sent) toast.success(`Sent to ${to}.`);
      else if (res.reason === 'not_configured') toast.info('Email not sent — SMTP is not configured.');
      else toast.info('The email could not be sent.');
      // Record the rejection on the BGV record for the timeline.
      if (bgv) {
        updateBgv.mutate({
          ...bgv,
          overallStatus: 'Rejected',
          verificationTimeline: [
            ...bgv.verificationTimeline,
            { date: nowISO(), action: 'Documents marked invalid — candidate emailed', performedBy: 'HR' },
          ],
        });
      }
      setInvalidEmail(null);
    } catch {
      toast.error('Could not send the email — try again.');
    } finally {
      setSendingInvalid(false);
    }
  };

  const convertToEmployee = () => {
    promote.mutate(checklist, {
      onSuccess: () => toast.success(`${checklist.candidateName} onboarded into the employee directory.`),
      onError: () => toast.error('Could not convert to employee — try again.'),
    });
  };

  // --- per-stage action helpers (each entry drives its own button) ---
  const gateMetFor = (i: number) => (i === 0 ? true : stages[i - 1].done);
  const showActionFor = (i: number) => {
    const a = stages[i].action;
    const done = stages[i].done;
    // Once the signed offer is received, stop offering to (re)send the offer letter.
    if (a.kind === 'email' && a.emailKind === 'offer_letter') return !signedOfferDone;
    return (
      a.kind === 'email' ||
      a.kind === 'request-docs' ||
      // Before it's confirmed: the date picker + "Confirm & email" in the action
      // row. After confirming, that row is hidden — re-sending a new date moves
      // into the step's details dropdown ("Re-send joining date").
      (a.kind === 'confirm-joining' && !done) ||
      // Hide the generic "Mark received" once a copy is uploaded — HR confirms it
      // via the "Confirm valid" button next to Preview/Download instead.
      (a.kind === 'mark-signed' && !done && !signedOfferDoc) ||
      a.kind === 'start-bgv' ||
      // Once onboarded to OnGrid, HR decides via the green "Verified" / red
      // "Invalid" buttons instead of this generic action.
      (a.kind === 'verify-bgv' && !done && !bgv?.ongridIndividualId) ||
      (a.kind === 'mark-arrived' && !done) ||
      (a.kind === 'convert-employee' && !done)
    );
  };
  const pendingFor = (i: number) => {
    const a = stages[i].action;
    return (
      (sendComposed.isPending && a.kind === 'email' && sendComposed.variables?.kind === a.emailKind) ||
      (markOfferSigned.isPending && a.kind === 'mark-signed') ||
      (createDocRequest.isPending && a.kind === 'request-docs') ||
      (setJoiningDate.isPending && a.kind === 'confirm-joining') ||
      (markFirstDayArrived.isPending && a.kind === 'mark-arrived') ||
      (startBgv.isPending && a.kind === 'start-bgv') ||
      (updateBgv.isPending && a.kind === 'verify-bgv') ||
      (promote.isPending && a.kind === 'convert-employee')
    );
  };
  const onActionClickFor = (i: number) => {
    const a = stages[i].action;
    switch (a.kind) {
      case 'email':
        // The offer letter opens the richer send modal (attach + signed-copy link).
        if (a.emailKind === 'offer_letter') {
          setSendOfferOpen(true);
          return;
        }
        return openComposer(a.emailKind, a.cta);
      case 'mark-signed':
        return markSigned();
      case 'request-docs':
        return requestDocs();
      case 'confirm-joining':
        return confirmJoining();
      case 'mark-arrived':
        return markArrived();
      case 'start-bgv':
        return beginBgv();
      case 'verify-bgv':
        return verifyBgvNow();
      case 'convert-employee':
        return convertToEmployee();
    }
  };
  const actionMetaFor = (i: number) => {
    const a = stages[i].action;
    const label =
      a.kind === 'email'
        ? `${stages[i].done ? 'Resend' : 'Send'} ${a.cta}`
        : a.kind === 'request-docs'
          ? stages[i].done
            ? 'Resend link'
            : a.cta
          : a.kind !== 'none'
            ? a.cta
            : '';
    const Icon =
      a.kind === 'email' || a.kind === 'request-docs'
        ? Send
        : a.kind === 'convert-employee'
          ? BadgeCheck
          : a.kind === 'verify-bgv' || a.kind === 'start-bgv'
            ? Fingerprint
            : a.kind === 'confirm-joining'
              ? CalendarCheck
              : a.kind === 'mark-arrived'
                ? DoorOpen
                : PenLine;
    return { label, Icon };
  };

  return (
    <div className="rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs">
      <OnboardingEmailComposer
        open={!!composer}
        seed={composer}
        sending={sendComposed.isPending}
        onClose={() => setComposer(null)}
        onSend={sendFromComposer}
      />
      {/* "Documents invalid" email, opened by the red Invalid button on the BGV step. */}
      <OnboardingEmailComposer
        open={!!invalidEmail}
        seed={invalidEmail}
        sending={sendingInvalid}
        onClose={() => setInvalidEmail(null)}
        onSend={sendInvalidEmail}
      />
      {sendOfferOpen && (
        <SendOfferLetterModal
          candidate={candidate}
          candidateId={checklist.candidateId}
          candidateName={checklist.candidateName}
          email={toEmail}
          offerLetter={checklist.offerLetter}
          onClose={() => setSendOfferOpen(false)}
        />
      )}
      {requestDocsOpen && (
        <RequestDocumentsModal
          candidateId={checklist.candidateId}
          candidateName={checklist.candidateName}
          email={toEmail}
          role={candidate?.appliedRole}
          prior={docRequest}
          onClose={() => setRequestDocsOpen(false)}
        />
      )}
      {startBgvOpen && (
        <StartBgvModal
          candidateName={checklist.candidateName}
          pending={startBgv.isPending || updateBgv.isPending || ongridOnboard.isPending}
          onStart={confirmBgv}
          onClose={() => setStartBgvOpen(false)}
        />
      )}
      {/* Header — title + step count, matching the candidate Recruitment
          Progress flow. */}
      <div className="flex items-center gap-2.5 border-b border-[#ECEDF0] px-5 py-4">
        <h3 className="text-sm font-bold text-gray-900">Onboarding Progress</h3>
        <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-[11px] font-semibold text-accent-700">
          {stages.length} Steps
        </span>
        {/* Pull fresh uploads / statuses without a full page reload. No explicit
            keys: refetch every active query so documents (per-entity keys) and the
            checklist/doc-requests/BGV all come back current. */}
        <RefreshButton title="Check for new uploads & status changes" className="ml-auto h-7 w-7" />
      </div>

      <div className="space-y-2.5 p-4">
        {stages.map((stage, i) => {
          const state = stepState(i);
          const StageIcon = stage.Icon;
          const last = i === stages.length - 1;
          const pathDone = i < currentIndex;
          const muted = state === 'todo';
          // Icon square colour: the stage's own colour once DONE, else greyscale.
          const doneColor = STAGE_ICON_COLOR[stage.label] ?? 'bg-accent-50 text-accent-600';
          const iconCls = state === 'done' ? doneColor : 'bg-[#F1F3F5] text-gray-400';
          const pillCls =
            state === 'done'
              ? 'bg-emerald-50 text-emerald-700'
              : state === 'current'
                ? 'bg-accent-50 text-accent-700'
                : 'bg-[#F1F3F5] text-gray-500';
          // Default (openStep === null) opens whichever step is current.
          const activeStep = openStep ?? currentIndex;
          const infoShown = activeStep === i;
          const toggleInfo = () => setOpenStep(activeStep === i ? -1 : i);
          const showAction = showActionFor(i);
          const gateMet = gateMetFor(i);
          const pending = pendingFor(i);
          const { label: actionLabel, Icon: ActionIcon } = actionMetaFor(i);
          const isJoining = stage.action.kind === 'confirm-joining';
          // Simple one-click actions get a quick icon button in the collapsed
          // header; joining-date needs its date picker, so it's expanded-only.
          const showHeaderAction = showAction && !isJoining;

          return (
            <div key={stage.label} className="relative flex gap-3">
              {/* Rail: status node + connecting thread (process flow) */}
              <div className="relative flex w-6 shrink-0 flex-col items-center">
                <span className="mt-4">
                  {state === 'done' ? (
                    <span className="grid size-6 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check size={13} strokeWidth={3} />
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
                  <span className={`mt-1 w-0.5 flex-1 ${pathDone ? 'bg-emerald-400' : 'bg-[#E4E6EA]'}`} />
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

                  {/* Right group — signed-offer link status, date, status pill,
                      quick action, chevron */}
                  {stage.action.kind === 'email' &&
                    stage.action.emailKind === 'offer_letter' &&
                    signOfferReq &&
                    !signedOfferDone && (
                      <>
                        {signOfferExpired && (
                          <button
                            type="button"
                            onClick={() =>
                              reactivateDocRequest.mutate(
                                { id: signOfferReq.id, hours: SIGN_OFFER_TTL_HOURS },
                                {
                                  onSuccess: () =>
                                    toast.success(
                                      `Upload link re-activated for ${SIGN_OFFER_TTL_HOURS} hours.`,
                                    ),
                                  onError: () =>
                                    toast.error('Could not activate the link — try again.'),
                                },
                              )
                            }
                            disabled={reactivateDocRequest.isPending}
                            title="Re-activate the signed-offer upload link"
                            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[10px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {reactivateDocRequest.isPending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Send size={11} />
                            )}
                            Activate link
                          </button>
                        )}
                        <span
                          className={`hidden shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold sm:inline-flex ${
                            signOfferExpired
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          <Clock4 size={11} /> {fmtLinkExpiry(signOfferReq.expiresAt)}
                        </span>
                      </>
                    )}
                  {/* Joining-documents upload link: expiry + reactivate + copy —
                      shown until every required document is verified. */}
                  {stage.action.kind === 'request-docs' && docRequest && !docsVerified && (
                    <div className="hidden shrink-0 items-center gap-1.5 rounded-md border border-[#E4E6EA] bg-[#F7F8FA] px-2 py-1 sm:flex">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold ${
                          docReqLive ? 'text-amber-700' : 'text-red-600'
                        }`}
                      >
                        <Clock4 size={11} /> {fmtDocReqExpiry(docRequest)}
                      </span>
                      {!docReqLive && (
                        <>
                          <Select
                            value={docReqHours}
                            onChange={e => setDocReqHours(Number(e.target.value))}
                            className="rounded-md border border-[#E4E6EA] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-600"
                          >
                            <option value={24}>24h</option>
                            <option value={48}>48h</option>
                            <option value={72}>72h</option>
                            <option value={168}>7 days</option>
                          </Select>
                          <button
                            type="button"
                            onClick={() =>
                              reactivateDocRequest.mutate(
                                { id: docRequest.id, hours: docReqHours },
                                {
                                  onSuccess: () => toast.success('Upload link reactivated.'),
                                  onError: () => toast.error('Could not reactivate the link — try again.'),
                                },
                              )
                            }
                            disabled={reactivateDocRequest.isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-accent-300 bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-700 transition hover:bg-accent-100 disabled:opacity-60"
                          >
                            {reactivateDocRequest.isPending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <RefreshCw size={11} />
                            )}
                            Reactivate
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={copyDocLink}
                        className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 transition hover:border-accent-400 hover:text-accent-600"
                      >
                        <Copy size={11} /> Copy link
                      </button>
                    </div>
                  )}
                  {stage.at && (
                    <span className="hidden shrink-0 font-mono text-[10px] text-gray-400 md:inline">
                      {fmtDate(stage.at)}
                    </span>
                  )}
                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${pillCls}`}
                  >
                    {stage.desc}
                  </span>
                  {showHeaderAction && (
                    <button
                      type="button"
                      onClick={() => onActionClickFor(i)}
                      disabled={!gateMet || pending}
                      title={!gateMet ? 'Complete the previous step first' : actionLabel}
                      className={`grid size-8 shrink-0 place-items-center rounded-full border transition ${
                        !gateMet
                          ? 'cursor-not-allowed border-[#E4E6EA] bg-white text-gray-300'
                          : 'border-[#E4E6EA] bg-white text-accent-600 hover:border-accent-300 hover:bg-accent-50'
                      }`}
                    >
                      {pending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : !gateMet ? (
                        <Lock size={14} />
                      ) : (
                        <ActionIcon size={14} />
                      )}
                    </button>
                  )}
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

                {/* Expanded section — details + every action for this step */}
                {infoShown && (
                  <div className="space-y-3 rounded-b-2xl border-t border-[#C21C51]/15 bg-white px-3.5 py-3">
                    <p className="text-[12.5px] leading-relaxed text-gray-600">{stage.detail}</p>

                    {/* Joining date: once confirmed, the action row is gone. Re-send an
                        UPDATED joining date from here — pick a new date and it re-opens
                        the confirmation email pre-filled with that date. */}
                    {stage.action.kind === 'confirm-joining' && stage.done && (
                      <div className="border-t border-[#ECEDF0] pt-3">
                        <p className="text-[12px] font-semibold text-gray-800">Re-send joining date</p>
                        <p className="mb-2 text-[11px] text-gray-500">
                          Confirmed for {fmtDate(checklist.joiningDate)}. Pick a new date to share an
                          updated joining date with the candidate.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <DatePicker
                            value={joiningInput}
                            onChange={setJoiningInput}
                            placeholder="Pick a new date"
                            className="h-8 w-[168px]"
                          />
                          <button
                            onClick={confirmJoining}
                            disabled={setJoiningDate.isPending || !joiningInput}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-600 px-3 text-[12px] font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {setJoiningDate.isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CalendarCheck size={13} />
                            )}
                            Re-send joining date
                          </button>
                        </div>
                      </div>
                    )}

                    {/* BGV: the checks HR picked — shown until they're sent (then the
                        "Sent for verification" list below takes over). */}
                    {(stage.action.kind === 'start-bgv' || stage.action.kind === 'verify-bgv') &&
                      !bgv?.ongridIndividualId &&
                      !!bgv?.services?.length && (
                        <div>
                          <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
                            Verifications selected ({bgv.services.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {bgv.services.map(code => {
                              const check = bgvCheckByCode(code);
                              return (
                                <span
                                  key={code}
                                  title={check?.name}
                                  className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-1.5 py-0.5 text-[11px] text-gray-700"
                                >
                                  <span className="font-mono text-[10px] font-bold text-accent-700">
                                    {code}
                                  </span>
                                  {check?.name && <span className="text-gray-500">· {check.name}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* BGV: send the candidate + documents to OnGrid for verification. */}
                    {(stage.action.kind === 'start-bgv' || stage.action.kind === 'verify-bgv') && (
                      <div className="border-t border-[#ECEDF0] pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-gray-800">OnGrid verification</p>
                            <p className="text-[11px] text-gray-500">
                              Select the verifications and send the candidate’s details &amp; documents to OnGrid.
                            </p>
                          </div>
                          <button
                            onClick={beginBgv}
                            disabled={ongridOnboard.isPending}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
                          >
                            {ongridOnboard.isPending && <Loader2 size={13} className="animate-spin" />}
                            {bgv?.ongridIndividualId ? 'Re-send for verification' : 'Send for verification'}
                          </button>
                        </div>

                        {bgv?.ongridIndividualId && (
                          <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5">
                            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-800">
                              <CheckCircle2 size={13} /> Sent to OnGrid
                              <span className="font-mono text-[10.5px] font-normal text-emerald-700">
                                · individual {bgv.ongridIndividualId}
                              </span>
                            </p>

                            {/* The verifications this candidate's data was sent for. */}
                            {!!bgv.services?.length && (
                              <div className="mt-2">
                                <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700/70">
                                  Sent for verification
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {bgv.services.map(code => {
                                    const check = bgvCheckByCode(code);
                                    return (
                                      <span
                                        key={code}
                                        title={check?.name}
                                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-1.5 py-0.5 text-[10.5px] text-gray-700"
                                      >
                                        <span className="font-mono text-[9.5px] font-bold text-accent-700">
                                          {code}
                                        </span>
                                        {check?.name && <span className="text-gray-500">· {check.name}</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Documents pushed to OnGrid. */}
                            {!!bgv.ongridDocuments?.length && (
                              <div className="mt-2">
                                <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700/70">
                                  Documents sent
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {bgv.ongridDocuments.map((d, i) => (
                                    <span
                                      key={`${d.docType}-${i}`}
                                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${
                                        d.status === 'uploaded'
                                          ? 'border-emerald-200 bg-white text-emerald-700'
                                          : 'border-amber-200 bg-white text-amber-700'
                                      }`}
                                    >
                                      {d.docType}
                                      <span className="font-mono text-[9px] uppercase">{d.status}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {bgv.ongridOnboardedAt && (
                              <p className="mt-2 text-[10px] text-gray-400">
                                Sent {fmtDate(bgv.ongridOnboardedAt)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {stage.at && (
                      <p className="text-[11px] text-gray-400">Recorded on {fmtDate(stage.at)}</p>
                    )}

                    {/* Action row */}
                    {showAction && (
                      <div className="flex flex-wrap items-center gap-2">
                        {isJoining && (
                          <DatePicker
                            value={joiningInput}
                            onChange={setJoiningInput}
                            disabled={!gateMet}
                            placeholder="Pick a date"
                            className="h-8 w-[168px]"
                          />
                        )}
                        <button
                          onClick={() => onActionClickFor(i)}
                          disabled={!gateMet || pending}
                          title={!gateMet ? 'Complete the previous step first' : undefined}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-600 px-3 text-[12px] font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : !gateMet ? (
                            <Lock size={13} />
                          ) : (
                            <ActionIcon size={13} />
                          )}
                          {actionLabel}
                        </button>
                      </div>
                    )}

                    {/* BGV decision — shown once the candidate is on OnGrid: HR reviews
                        and either passes them (green) or rejects with an email (red). */}
                    {stage.action.kind === 'verify-bgv' &&
                      !!bgv?.ongridIndividualId &&
                      !bgvVerified && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={verifyBgvNow}
                            disabled={updateBgv.isPending}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {updateBgv.isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            Verified
                          </button>
                          <button
                            onClick={openInvalidEmail}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[12px] font-semibold text-white transition hover:bg-red-700"
                          >
                            <XCircle size={13} /> Invalid
                          </button>
                          <span className="text-[11px] text-gray-400">
                            Review the candidate in OnGrid, then pass or reject.
                          </span>
                        </div>
                      )}

                    {/* Signed offer letter the candidate uploaded — preview / download. */}
                    {stage.action.kind === 'mark-signed' && signedOfferDoc && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            window.open(documentPreviewUrl(signedOfferDoc.id), '_blank', 'noopener,noreferrer')
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-white px-3 text-[12px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
                        >
                          <Eye size={13} /> Preview signed offer
                        </button>
                        <button
                          onClick={() => downloadDocument(signedOfferDoc.id, signedOfferDoc.fileName)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-white px-3 text-[12px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
                        >
                          <Download size={13} /> Download
                        </button>
                        {/* HR confirms the uploaded copy is properly signed → completes the step. */}
                        {!checklist.offerSignedReceivedAt && (
                          <button
                            onClick={markSigned}
                            disabled={markOfferSigned.isPending}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            title="Confirm the signed offer letter is valid"
                          >
                            {markOfferSigned.isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            Confirm valid &amp; received
                          </button>
                        )}
                      </div>
                    )}

                    {/* Signed-copy upload link expired (nothing uploaded, not yet marked
                        received) — one button to re-open it (72h) so the candidate can
                        upload again. */}
                    {stage.action.kind === 'mark-signed' &&
                      !signedOfferDone &&
                      signOfferReq &&
                      signOfferExpired && (
                        <button
                          onClick={() =>
                            reactivateDocRequest.mutate(
                              { id: signOfferReq.id, hours: SIGN_OFFER_TTL_HOURS },
                              {
                                onSuccess: () =>
                                  toast.success(`Upload link re-activated for ${SIGN_OFFER_TTL_HOURS} hours.`),
                                onError: () => toast.error('Could not activate the link — try again.'),
                              },
                            )
                          }
                          disabled={reactivateDocRequest.isPending}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {reactivateDocRequest.isPending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Send size={13} />
                          )}
                          Activate link again
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
