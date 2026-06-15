'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate, OnboardingChecklist } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { optimisticOptions } from '@/lib/query/mutations';
import { toggleOnboardingTask } from '@/services/onboarding.service';
import { buildEmployeeFromCandidate } from '@/services/employee.service';
import { buildOnboardingForCandidate } from '@/services/candidate.service';
import { sendTestEmail, sendCustomEmail } from '@/lib/api/notifications';
import { nowISO } from '@/lib/utils';

export function useOnboarding() {
  return useQuery({ queryKey: qk.onboarding.all, queryFn: () => repositories.onboarding.list() });
}

/**
 * Idempotently move a candidate into onboarding by spinning up their checklist.
 * Used when a candidate is selected for the role. Checks the live list first so
 * re-selecting never collides with the existing record (PK = candidateId).
 */
export function useEnsureOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (candidate: Candidate) => {
      const list = await repositories.onboarding.list();
      if (list.some(o => o.candidateId === candidate.id)) return;
      await repositories.onboarding.create(buildOnboardingForCandidate(candidate));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.onboarding.all }),
  });
}

export function useToggleOnboardingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidateName, taskId }: { candidateName: string; taskId: string }) => {
      const list = qc.getQueryData<OnboardingChecklist[]>(qk.onboarding.all) ?? [];
      const target = list.find(o => o.candidateName === candidateName);
      if (!target) return;
      await repositories.onboarding.update(target.candidateId, toggleOnboardingTask(target, taskId));
    },
    ...optimisticOptions<{ candidateName: string; taskId: string }, OnboardingChecklist>(
      qc,
      qk.onboarding.all,
      ({ candidateName, taskId }) =>
        prev =>
          prev.map(o => (o.candidateName === candidateName ? toggleOnboardingTask(o, taskId) : o)),
    ),
  });
}

export type OnboardingEmailKind =
  | 'job_offer'
  | 'offer_letter'
  | 'office_invite'
  | 'appointment_letter';

// The checklist field each email stamps when sent.
const stampByKind: Record<OnboardingEmailKind, () => Partial<OnboardingChecklist>> = {
  job_offer: () => ({ jobOfferSentAt: nowISO() }),
  offer_letter: () => ({ offerLetterSentAt: nowISO() }),
  office_invite: () => ({ officeInviteSentAt: nowISO() }),
  appointment_letter: () => ({ appointmentLetterSentAt: nowISO() }),
};

/**
 * Manual onboarding-email actions. Each send fires the candidate-facing email
 * (best-effort) and stamps the timestamp on the checklist so the stepper
 * advances regardless of mail delivery. `markOfferSigned` records that HR
 * received the signed offer back.
 */
export function useOnboardingEmails() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.onboarding.all });

  const send = useMutation({
    mutationFn: async (input: {
      candidateId: string;
      candidateName: string;
      email: string;
      role?: string;
      salary?: string;
      kind: OnboardingEmailKind;
    }) => {
      let emailed = false;
      let emailReason: string | undefined;
      if (input.email) {
        const res = await sendTestEmail({
          to: input.email,
          candidateName: input.candidateName,
          template: input.kind,
          position: input.role,
          salary: input.salary,
        }).catch(() => ({ sent: false, reason: undefined } as { sent: boolean; reason?: string }));
        emailed = res.sent;
        emailReason = res.reason;
      }
      await repositories.onboarding.patch(input.candidateId, stampByKind[input.kind]());
      return { emailed, emailReason };
    },
    onSuccess: invalidate,
  });

  // Send an HR-edited onboarding email (custom subject/body) and stamp the stage.
  const sendComposed = useMutation({
    mutationFn: async (input: {
      candidateId: string;
      kind: OnboardingEmailKind;
      to: string;
      subject: string;
      body: string;
    }) => {
      let emailed = false;
      let emailReason: string | undefined;
      if (input.to) {
        const res = await sendCustomEmail({
          to: input.to,
          subject: input.subject,
          body: input.body,
        }).catch(() => ({ sent: false, reason: undefined } as { sent: boolean; reason?: string }));
        emailed = res.sent;
        emailReason = res.reason;
      }
      await repositories.onboarding.patch(input.candidateId, stampByKind[input.kind]());
      return { emailed, emailReason };
    },
    onSuccess: invalidate,
  });

  const markOfferSigned = useMutation({
    mutationFn: (candidateId: string) =>
      repositories.onboarding.patch(candidateId, { offerSignedReceivedAt: nowISO() }),
    onSuccess: invalidate,
  });

  return { send, sendComposed, markOfferSigned };
}

/** Promote a finished onboarding into a full employee (touches 3 resources). */
export function usePromoteFromOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checklist: OnboardingChecklist) => {
      const candidates = qc.getQueryData<Candidate[]>(qk.candidates.all) ?? [];
      const candidate = candidates.find(c => c.id === checklist.candidateId);
      if (!candidate) return;
      // Snapshot the onboarding email milestones onto the employee — the
      // onboarding record itself is removed below.
      const employee = {
        ...buildEmployeeFromCandidate(candidate),
        joining: {
          offerLetterSentAt: checklist.offerLetterSentAt,
          offerSignedReceivedAt: checklist.offerSignedReceivedAt,
          officeInviteSentAt: checklist.officeInviteSentAt,
          appointmentLetterSentAt: checklist.appointmentLetterSentAt,
        },
      };
      await repositories.employees.create(employee);
      await repositories.onboarding.remove(checklist.candidateId);
      await repositories.candidates.patch(checklist.candidateId, { status: 'Shortlisted' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.employees.all });
      qc.invalidateQueries({ queryKey: qk.onboarding.all });
      qc.invalidateQueries({ queryKey: qk.candidates.all });
    },
  });
}
