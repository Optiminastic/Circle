'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  FileSignature,
  PenLine,
  Building2,
  ScrollText,
  Fingerprint,
  BadgeCheck,
  Check,
  Send,
  Loader2,
  Lock,
  Info,
} from 'lucide-react';
import { BGVRequirement, OnboardingChecklist } from '@/types';
import { useCandidates, useBgvs, useUpdateBgv, useStartBgv } from '@/features/candidates/hooks';
import { useDocRequests } from '@/features/doc-requests/hooks';
import {
  useOnboardingEmails,
  usePromoteFromOnboarding,
  OnboardingEmailKind,
} from '@/features/onboarding/hooks';
import { nowISO } from '@/lib/utils';
import { useToast } from '@/components/Toaster';

interface OnboardingStepperProps {
  checklist: OnboardingChecklist;
}

type StageAction =
  | { kind: 'email'; emailKind: OnboardingEmailKind; cta: string }
  | { kind: 'mark-signed'; cta: string }
  | { kind: 'start-bgv'; cta: string }
  | { kind: 'verify-bgv'; cta: string }
  | { kind: 'convert-employee'; cta: string }
  | { kind: 'none' };

type StepState = 'done' | 'current' | 'todo';

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export function OnboardingStepper({ checklist }: OnboardingStepperProps) {
  const toast = useToast();
  const { data: candidates = [] } = useCandidates();
  const { data: requests = [] } = useDocRequests();
  const { data: bgvs = [] } = useBgvs();
  const { send, markOfferSigned } = useOnboardingEmails();
  const updateBgv = useUpdateBgv();
  const startBgv = useStartBgv();
  const promote = usePromoteFromOnboarding();

  const [openInfo, setOpenInfo] = useState<Record<number, boolean>>({});

  const candidate = candidates.find(c => c.id === checklist.candidateId);
  const docRequest = requests
    .filter(r => r.candidateId === checklist.candidateId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const bgv = bgvs.find(b => b.candidateId === checklist.candidateId);

  const verifiedCount = docRequest?.submissions?.filter(s => s.status === 'Verified').length ?? 0;
  const requiredCount = docRequest?.requiredDocs?.length ?? 0;
  const docsVerified = docRequest?.status === 'Verified';
  const bgvVerified = bgv?.overallStatus === 'Verified';
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
      Icon: ShieldCheck,
      label: 'Documents verified',
      done: docsVerified,
      desc: docsVerified ? 'Verified' : docRequest ? `${verifiedCount}/${requiredCount} verified` : 'Pending',
      detail: docsVerified
        ? 'All joining documents have been verified.'
        : docRequest
          ? `${verifiedCount} of ${requiredCount} documents verified. Finish verifying the uploads below before sending the offer.`
          : 'No documents collected yet — request and verify them in the panel below.',
      action: { kind: 'none' },
    },
    {
      Icon: FileSignature,
      label: 'Offer letter',
      done: Boolean(checklist.offerLetterSentAt),
      desc: checklist.offerLetterSentAt ? 'Sent' : 'Pending',
      at: checklist.offerLetterSentAt,
      detail:
        'Email the candidate their offer letter to review. They are asked to sign it and send the signed copy back.',
      action: { kind: 'email', emailKind: 'offer_letter', cta: 'offer letter' },
    },
    {
      Icon: PenLine,
      label: 'Signed offer received',
      done: Boolean(checklist.offerSignedReceivedAt),
      desc: checklist.offerSignedReceivedAt ? 'Received' : 'Awaiting',
      at: checklist.offerSignedReceivedAt,
      detail:
        'Once the candidate returns the signed offer, mark it received here to unlock the office invite.',
      action: { kind: 'mark-signed', cta: 'Mark received' },
    },
    {
      Icon: Building2,
      label: 'Office invite',
      done: Boolean(checklist.officeInviteSentAt),
      desc: checklist.officeInviteSentAt ? 'Sent' : 'Pending',
      at: checklist.officeInviteSentAt,
      detail: 'Send a welcome-to-office email with the office address so they can visit and complete formalities.',
      action: { kind: 'email', emailKind: 'office_invite', cta: 'office invite' },
    },
    {
      Icon: ScrollText,
      label: 'Letter of appointment',
      done: Boolean(checklist.appointmentLetterSentAt),
      desc: checklist.appointmentLetterSentAt ? 'Sent' : 'Pending',
      at: checklist.appointmentLetterSentAt,
      detail: 'A few days after the office visit, send the formal letter of appointment confirming their role.',
      action: { kind: 'email', emailKind: 'appointment_letter', cta: 'appointment letter' },
    },
    {
      Icon: Fingerprint,
      label: 'Background verification',
      done: bgvVerified,
      desc: bgv ? bgv.overallStatus : 'Not started',
      detail: bgvVerified
        ? 'Background verification is cleared.'
        : bgv
          ? `Background check is "${bgv.overallStatus}". Mark it verified once all checks pass to enable employee conversion.`
          : 'Background verification has not started yet. Kick it off to begin collecting & checking documents.',
      action: bgv
        ? { kind: 'verify-bgv', cta: 'Mark BGV verified' }
        : { kind: 'start-bgv', cta: 'Start BGV' },
    },
    {
      Icon: BadgeCheck,
      label: 'Employee',
      done: joined,
      desc: joined ? 'Onboarded' : 'Pending',
      detail: joined
        ? 'The candidate has been onboarded into the employee directory.'
        : 'Once background verification is cleared, convert the candidate into an employee. This is the final step.',
      action: { kind: 'convert-employee', cta: 'Convert to employee' },
    },
  ];

  // First not-yet-done stage is "current"; everything before it is done.
  const firstOpen = stages.findIndex(s => !s.done);
  const currentIndex = firstOpen === -1 ? stages.length - 1 : firstOpen;

  const stepState = (i: number): StepState =>
    i < currentIndex ? 'done' : i === currentIndex ? (stages[i].done ? 'done' : 'current') : 'todo';

  const runEmail = (emailKind: OnboardingEmailKind, cta: string) => {
    send.mutate(
      {
        candidateId: checklist.candidateId,
        candidateName: checklist.candidateName,
        email: candidate?.email || checklist.candidateEmail || '',
        role: candidate?.appliedRole,
        kind: emailKind,
      },
      {
        onSuccess: ({ emailed, emailReason }) => {
          if (emailed) toast.success(`Sent the ${cta} to the candidate.`);
          else if (emailReason === 'not_configured')
            toast.info(`${cta} recorded. Email not sent — SMTP is not configured.`);
          else if (!candidate?.email) toast.info(`${cta} recorded, but no email on file.`);
          else toast.info(`${cta} recorded, but the email could not be sent.`);
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
  const gateMetFor = (i: number) => i === 0 || stages[i - 1].done;
  const showActionFor = (i: number) => {
    const a = stages[i].action;
    const done = stages[i].done;
    return (
      a.kind === 'email' ||
      (a.kind === 'mark-signed' && !done) ||
      a.kind === 'start-bgv' ||
      (a.kind === 'verify-bgv' && !done) ||
      (a.kind === 'convert-employee' && !done)
    );
  };
  const pendingFor = (i: number) => {
    const a = stages[i].action;
    return (
      (send.isPending && a.kind === 'email' && send.variables?.kind === a.emailKind) ||
      (markOfferSigned.isPending && a.kind === 'mark-signed') ||
      (startBgv.isPending && a.kind === 'start-bgv') ||
      (updateBgv.isPending && a.kind === 'verify-bgv') ||
      (promote.isPending && a.kind === 'convert-employee')
    );
  };
  const onActionClickFor = (i: number) => {
    const a = stages[i].action;
    switch (a.kind) {
      case 'email':
        return runEmail(a.emailKind, a.cta);
      case 'mark-signed':
        return markSigned();
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
      a.kind === 'email' ? `${stages[i].done ? 'Resend' : 'Send'} ${a.cta}` : a.kind !== 'none' ? a.cta : '';
    const Icon =
      a.kind === 'email'
        ? Send
        : a.kind === 'convert-employee'
          ? BadgeCheck
          : a.kind === 'verify-bgv' || a.kind === 'start-bgv'
            ? Fingerprint
            : PenLine;
    return { label, Icon };
  };

  return (
    <div className="rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5">
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
                        {fmtDateTime(stage.at)}
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
                      <p className="mt-2 text-[11px] text-gray-400">
                        {stage.label === 'Signed offer received' ? 'Recorded' : 'Sent'} on{' '}
                        {fmtDateTime(stage.at)}
                      </p>
                    )}
                  </div>
                )}

                {/* Action row */}
                {showAction && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onActionClickFor(i)}
                      disabled={!gateMet || pending}
                      title={!gateMet ? 'Complete the previous step first' : undefined}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent-600 px-2.5 text-[11px] font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : !gateMet ? (
                        <Lock size={12} />
                      ) : (
                        <ActionIcon size={12} />
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
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
