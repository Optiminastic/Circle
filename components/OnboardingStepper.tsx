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
  Send,
  Loader2,
  Lock,
  Info,
  Eye,
  Download,
} from 'lucide-react';
import { BGVRequirement, OnboardingChecklist } from '@/types';
import { useCandidates, useBgvs, useUpdateBgv, useStartBgv } from '@/features/candidates/hooks';
import { useDocRequests, useDocRequestMutations } from '@/features/doc-requests/hooks';
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
import { buildOnboardingEmailDraft } from '@/lib/onboarding-email-templates';

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

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export function OnboardingStepper({ checklist }: OnboardingStepperProps) {
  const toast = useToast();
  const { data: candidates = [] } = useCandidates();
  const { data: requests = [] } = useDocRequests();
  const { data: bgvs = [] } = useBgvs();
  const { sendComposed, markOfferSigned, setJoiningDate, markFirstDayArrived } = useOnboardingEmails();
  const { create: createDocRequest, reactivate: reactivateDocRequest } = useDocRequestMutations();
  const updateBgv = useUpdateBgv();
  const startBgv = useStartBgv();
  const promote = usePromoteFromOnboarding();

  const [openInfo, setOpenInfo] = useState<Record<number, boolean>>({});
  const [composer, setComposer] = useState<(ComposerSeed & { kind: OnboardingEmailKind }) | null>(
    null,
  );
  // The offer letter uses a richer modal (attachment + signed-copy upload link).
  const [sendOfferOpen, setSendOfferOpen] = useState(false);
  // Editable request-documents email modal (To / Subject / Message).
  const [requestDocsOpen, setRequestDocsOpen] = useState(false);
  // Joining-date picker value for the "Joining date confirmation" step.
  const [joiningInput, setJoiningInput] = useState(checklist.joiningDate ?? '');

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
  const bgv = bgvs.find(b => b.candidateId === checklist.candidateId);
  const toEmail = candidate?.email || checklist.candidateEmail || '';

  // Signed offer letter the candidate uploaded via the 48h public link (stored in
  // S3 + the documents table as category "Signed Offer Letter").
  const { data: candidateDocs = [] } = useDocuments('candidate', checklist.candidateId);
  const signedOfferDoc = candidateDocs
    .filter(d => d.category === 'Signed Offer Letter')
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  // The 48h signed-copy upload link (a "signed-offer" doc-request) — used to offer
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
        : 'The candidate can upload their signed copy via the 48-hour link in the offer email, or mark it received here manually.',
      action: { kind: 'mark-signed', cta: 'Mark received' },
    },
    {
      Icon: FileText,
      label: 'Documents verification',
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
      done: bgvVerified,
      desc: bgv ? bgv.overallStatus : 'Not started',
      detail: bgvVerified
        ? 'Background verification is cleared.'
        : bgv
          ? `Background check is "${bgv.overallStatus}". Mark it verified once all checks pass.`
          : 'Background verification has not started yet. Kick it off to begin the checks.',
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
  const openComposer = (emailKind: OnboardingEmailKind, cta: string, startDate?: string) => {
    const draft = buildOnboardingEmailDraft(emailKind, candidate, startDate ? { startDate } : undefined);
    setComposer({ kind: emailKind, title: `Send ${cta}`, to: toEmail, subject: draft.subject, body: draft.body });
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

  const beginBgv = () => {
    if (!candidate) return;
    startBgv.mutate(candidate, {
      onSuccess: () => toast.success('Background verification started.'),
      onError: () => toast.error('Could not start BGV — try again.'),
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
      a.kind === 'confirm-joining' ||
      // Hide the generic "Mark received" once a copy is uploaded — HR confirms it
      // via the "Confirm valid" button next to Preview/Download instead.
      (a.kind === 'mark-signed' && !done && !signedOfferDoc) ||
      a.kind === 'start-bgv' ||
      (a.kind === 'verify-bgv' && !done) ||
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
    <div className="rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5">
      <OnboardingEmailComposer
        open={!!composer}
        seed={composer}
        sending={sendComposed.isPending}
        onClose={() => setComposer(null)}
        onSend={sendFromComposer}
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
      <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
        Onboarding progress <span className="text-gray-400">· tap ⓘ on a stage for details</span>
      </p>

      <ol className="relative px-1 py-3">
        {stages.map((stage, i) => {
          const state = stepState(i);
          const StageIcon = stage.Icon;
          const last = i === stages.length - 1;
          const pathDone = i < currentIndex;
          const muted = state === 'todo';
          const dotCls =
            state === 'done' ? 'bg-emerald-500' : state === 'current' ? 'bg-accent-500' : 'bg-gray-300';
          const infoShown = !!openInfo[i];
          const showAction = showActionFor(i);
          const gateMet = gateMetFor(i);
          const pending = pendingFor(i);
          const { label: actionLabel, Icon: ActionIcon } = actionMetaFor(i);
          const isJoining = stage.action.kind === 'confirm-joining';

          return (
            <li key={stage.label} className="relative flex gap-4">
              {/* Rail: stage avatar + status badge + connecting thread */}
              <div className="relative flex w-9 shrink-0 flex-col items-center">
                <div className={`relative z-10 ${muted ? 'opacity-60' : ''}`}>
                  <span
                    className={`grid size-9 place-items-center rounded-full ring-2 ring-white ${
                      state === 'done'
                        ? 'bg-emerald-50 text-emerald-600'
                        : state === 'current'
                          ? 'bg-accent-50 text-accent-600'
                          : 'bg-[#F1F3F5] text-gray-400'
                    }`}
                  >
                    {state === 'done' ? <Check size={16} /> : <StageIcon size={15} />}
                  </span>
                  {state === 'done' && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                      <Check size={9} strokeWidth={3} />
                    </span>
                  )}
                  {state === 'current' && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-accent-500 ring-2 ring-white" />
                  )}
                </div>
                {!last && (
                  <span className={`mt-1.5 w-px flex-1 ${pathDone ? 'bg-emerald-300' : 'bg-[#E4E6EA]'}`} />
                )}
              </div>

              {/* Content — feed entry */}
              <div className={`min-w-0 flex-1 ${last ? 'pb-1' : 'pb-7'}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-md ${
                          muted ? 'bg-[#F1F3F5] text-gray-400' : 'bg-accent-50 text-accent-600'
                        }`}
                      >
                        <StageIcon size={12} />
                      </span>
                      <span className={`text-sm font-semibold ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
                        {stage.label}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#E4E6EA] bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        <span className={`size-1.5 rounded-full ${dotCls}`} />
                        {stage.desc}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    {stage.at && (
                      <span className="hidden font-mono text-[10px] text-gray-400 sm:inline">
                        {fmtDate(stage.at)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpenInfo(prev => ({ ...prev, [i]: !infoShown }))}
                      aria-label={infoShown ? 'Hide details' : 'View details'}
                      aria-expanded={infoShown}
                      title="View details"
                      className={`grid size-8 shrink-0 place-items-center rounded-full border transition ${
                        infoShown
                          ? 'border-accent-200 bg-accent-50 text-accent-600'
                          : 'border-[#E4E6EA] bg-white text-gray-400 hover:bg-[#F1F3F5] hover:text-gray-600'
                      }`}
                    >
                      <Info size={15} />
                    </button>
                  </div>
                </div>

                {/* Detail — revealed by the info "i" button */}
                {infoShown && (
                  <div
                    className={`mt-3 rounded-xl bg-[#F7F8FA] p-3.5 ${
                      state === 'current'
                        ? 'border border-[#ECEDF0] border-l-2 border-l-accent-400'
                        : 'border border-[#ECEDF0]'
                    }`}
                  >
                    <p className="text-[12.5px] leading-relaxed text-gray-600">{stage.detail}</p>
                    {stage.at && (
                      <p className="mt-2 text-[11px] text-gray-400">Recorded on {fmtDate(stage.at)}</p>
                    )}
                  </div>
                )}

                {/* Action row */}
                {showAction && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {isJoining && (
                      <input
                        type="date"
                        value={joiningInput}
                        onChange={e => setJoiningInput(e.target.value)}
                        disabled={!gateMet}
                        className="h-6 rounded-md border border-[#E4E6EA] bg-white px-2 text-[11px] text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-50"
                      />
                    )}
                    <button
                      onClick={() => onActionClickFor(i)}
                      disabled={!gateMet || pending}
                      title={!gateMet ? 'Complete the previous step first' : undefined}
                      className="inline-flex h-6 items-center gap-1 rounded-md bg-accent-600 px-2 text-[10px] font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : !gateMet ? (
                        <Lock size={11} />
                      ) : (
                        <ActionIcon size={11} />
                      )}
                      {actionLabel}
                    </button>
                    {!gateMet && (
                      <span className="text-[11px] text-gray-400">
                        Complete the earlier step to unlock this.
                      </span>
                    )}
                  </div>
                )}

                {/* Signed offer letter the candidate uploaded — preview / download. */}
                {stage.action.kind === 'mark-signed' && signedOfferDoc && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        window.open(documentPreviewUrl(signedOfferDoc.id), '_blank', 'noopener,noreferrer')
                      }
                      className="inline-flex h-6 items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2 text-[10px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
                    >
                      <Eye size={11} /> Preview signed offer
                    </button>
                    <button
                      onClick={() => downloadDocument(signedOfferDoc.id, signedOfferDoc.fileName)}
                      className="inline-flex h-6 items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2 text-[10px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
                    >
                      <Download size={11} /> Download
                    </button>
                    {/* HR confirms the uploaded copy is properly signed → completes the step. */}
                    {!checklist.offerSignedReceivedAt && (
                      <button
                        onClick={markSigned}
                        disabled={markOfferSigned.isPending}
                        className="inline-flex h-6 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[10px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        title="Confirm the signed offer letter is valid"
                      >
                        {markOfferSigned.isPending ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Check size={11} />
                        )}
                        Confirm valid &amp; received
                      </button>
                    )}
                  </div>
                )}

                {/* Signed-copy upload link expired (nothing uploaded, not yet marked
                    received) — one button to re-open it (48h) so the candidate can
                    upload again. */}
                {stage.action.kind === 'mark-signed' && !signedOfferDone && signOfferReq && signOfferExpired && (
                  <div className="mt-3">
                    <button
                      onClick={() =>
                        reactivateDocRequest.mutate(
                          { id: signOfferReq.id, hours: 48 },
                          {
                            onSuccess: () => toast.success('Upload link re-activated for 48 hours.'),
                            onError: () => toast.error('Could not activate the link — try again.'),
                          },
                        )
                      }
                      disabled={reactivateDocRequest.isPending}
                      className="inline-flex h-6 items-center gap-1 rounded-md bg-accent-600 px-2 text-[10px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
                    >
                      {reactivateDocRequest.isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Send size={11} />
                      )}
                      Activate link again
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
