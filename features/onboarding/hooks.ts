'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BUDDY_RESOURCE_LINKS } from '@/lib/onboarding-email-templates';
import { AppointmentLetterData, Candidate, OfferLetterData, OnboardingChecklist } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { optimisticOptions } from '@/lib/query/mutations';
import { toggleOnboardingTask } from '@/services/onboarding.service';
import { buildEmployeeFromCandidate } from '@/services/employee.service';
import { buildOnboardingForCandidate } from '@/services/candidate.service';
import { sendTestEmail, sendCustomEmail, type TestEmailTemplate } from '@/lib/api/notifications';
import { markCandidateArrived } from '@/lib/api/handoff';
import { documentPreviewUrl, promoteCandidateDocuments } from '@/lib/api/documents';
import { nowISO, randomId } from '@/lib/utils';
import { allocateEmployeeCode } from '@/lib/api/employee-codes';
import { useAuth } from '@/store/auth-store';

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
  | 'joining_date'
  | 'appointment_letter';

// The checklist field each email stamps when sent.
const stampByKind: Record<OnboardingEmailKind, () => Partial<OnboardingChecklist>> = {
  job_offer: () => ({ jobOfferSentAt: nowISO() }),
  offer_letter: () => ({ offerLetterSentAt: nowISO() }),
  office_invite: () => ({ officeInviteSentAt: nowISO() }),
  joining_date: () => ({ joiningDateConfirmedAt: nowISO() }),
  appointment_letter: () => ({ appointmentLetterSentAt: nowISO() }),
};

/**
 * Manual onboarding-email actions. Each send fires the candidate-facing email
 * (best-effort) and stamps the timestamp on the checklist so the stepper
 * advances regardless of mail delivery. `markOfferSigned` records that HR
 * received the signed offer back.
 */
// Labels for the onboarding-stage "times emailed" count badge — only the
// stages the badge is shown on need an entry here.
const EMAIL_LOG_LABEL: Partial<Record<OnboardingEmailKind, string>> = {
  offer_letter: 'Offer letter sent',
  joining_date: 'Joining date confirmation',
  appointment_letter: 'Appointment letter sent',
};

export function useOnboardingEmails() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.onboarding.all });

  // Record a send in the shared email log so pipeline-step "times emailed"
  // badges can count it. Best-effort — never blocks the onboarding flow.
  const logSentEmail = (params: {
    candidateId: string;
    candidateName?: string;
    email: string;
    kind: OnboardingEmailKind;
    subject: string;
  }) => {
    const label = EMAIL_LOG_LABEL[params.kind];
    if (!label || !params.email) return;
    const list = qc.getQueryData<OnboardingChecklist[]>(qk.onboarding.all) ?? [];
    const candidateName =
      params.candidateName || list.find(o => o.candidateId === params.candidateId)?.candidateName || '';
    repositories.sentEmails
      .create({
        id: randomId('EML'),
        recipientName: candidateName,
        recipientEmail: params.email,
        templateTitle: label,
        subject: params.subject,
        dateSent: nowISO(),
        status: 'Sent',
        relatedEntity: candidateName,
      })
      .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
      .catch(() => {});
  };

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
          // joining_date has no backend template — it's always sent via sendComposed,
          // so this template-based path is never called with it.
          template: input.kind as TestEmailTemplate,
          position: input.role,
          salary: input.salary,
        }).catch(() => ({ sent: false, reason: undefined } as { sent: boolean; reason?: string }));
        emailed = res.sent;
        emailReason = res.reason;
        if (emailed) {
          const subject =
            input.kind === 'offer_letter'
              ? input.role
                ? `Your offer letter for ${input.role} at Optiminastic — please review & sign`
                : 'Your offer letter from Optiminastic — please review & sign'
              : input.kind === 'appointment_letter'
                ? input.role
                  ? `Letter of appointment — ${input.role} at Optiminastic`
                  : 'Your letter of appointment — Optiminastic'
                : '';
          logSentEmail({
            candidateId: input.candidateId,
            candidateName: input.candidateName,
            email: input.email,
            kind: input.kind,
            subject,
          });
        }
      }
      await repositories.onboarding.patch(input.candidateId, stampByKind[input.kind]());
      return { emailed, emailReason };
    },
    onSuccess: invalidate,
  });

  // Send an HR-edited onboarding email (custom subject/body) and stamp the stage.
  // `attachment` (optional) carries the offer-letter PDF.
  const sendComposed = useMutation({
    mutationFn: async (input: {
      candidateId: string;
      kind: OnboardingEmailKind;
      to: string;
      subject: string;
      body: string;
      attachment?: { name: string; base64: string; type: string };
      links?: { label: string; url: string }[];
    }) => {
      let emailed = false;
      let emailReason: string | undefined;
      if (input.to) {
        const res = await sendCustomEmail({
          to: input.to,
          subject: input.subject,
          body: input.body,
          links: input.links,
          attachmentName: input.attachment?.name,
          attachmentBase64: input.attachment?.base64,
          attachmentType: input.attachment?.type,
        }).catch(() => ({ sent: false, reason: undefined } as { sent: boolean; reason?: string }));
        emailed = res.sent;
        emailReason = res.reason;
        if (emailed) {
          logSentEmail({
            candidateId: input.candidateId,
            email: input.to,
            kind: input.kind,
            subject: input.subject,
          });
        }
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

  const markAppointmentSigned = useMutation({
    mutationFn: (candidateId: string) =>
      repositories.onboarding.patch(candidateId, { appointmentSignedReceivedAt: nowISO() }),
    onSuccess: invalidate,
  });

  // HR manually proceeds past Joining Documents despite one or more required
  // docs still being unverified — an explicit override, not an auto-complete.
  const markJoiningDocsSkipped = useMutation({
    mutationFn: (candidateId: string) =>
      repositories.onboarding.patch(candidateId, { joiningDocsSkippedAt: nowISO() }),
    onSuccess: invalidate,
  });

  // HR manually proceeds past Background verification before it came back
  // Verified from OnGrid (~20 days) — an explicit override, not an auto-complete.
  const markBgvSkipped = useMutation({
    mutationFn: (candidateId: string) =>
      repositories.onboarding.patch(candidateId, { bgvSkippedAt: nowISO() }),
    onSuccess: invalidate,
  });

  // Undo an employee conversion tag on the onboarding record — used when the
  // employee record it points to gets deleted (e.g. a mistaken conversion), so
  // the candidate reverts to "Pending" and stays visible in onboarding.
  const revertEmployeeConversion = useMutation({
    mutationFn: (candidateId: string) =>
      repositories.onboarding.patch(candidateId, {
        convertedToEmployeeAt: null,
        employeeId: null,
      } as unknown as Partial<OnboardingChecklist>),
    onSuccess: invalidate,
  });

  // Record the joining date HR picked (stamped before the confirmation email is
  // composed/sent; the send then stamps joiningDateConfirmedAt via stampByKind).
  const setJoiningDate = useMutation({
    mutationFn: ({ candidateId, date }: { candidateId: string; date: string }) =>
      repositories.onboarding.patch(candidateId, { joiningDate: date }),
    onSuccess: invalidate,
  });

  // Candidate arrived for their first office day: stamp it AND fire the handoff
  // webhook (adds them to the external onboarding feed).
  const markFirstDayArrived = useMutation({
    mutationFn: async (candidateId: string) => {
      await markCandidateArrived(candidateId).catch(() => {
        /* feed is best-effort; still record the arrival locally */
      });
      await repositories.onboarding.patch(candidateId, { firstDayArrivedAt: nowISO() });
    },
    onSuccess: invalidate,
  });

  // Allocation of mail, system & desk — sub-step 1: save the new hire's
  // company email (re-savable via the same call once already set).
  const saveAllocationEmail = useMutation({
    mutationFn: ({ candidateId, email }: { candidateId: string; email: string }) =>
      repositories.onboarding.patch(candidateId, {
        allocationEmail: email,
        allocationEmailSavedAt: nowISO(),
      }),
    onSuccess: invalidate,
  });

  // Sub-step 2: save system + desk assignment.
  const saveSystemDesk = useMutation({
    mutationFn: ({
      candidateId,
      systemName,
      systemPassword,
      systemNumber,
      deskNumber,
    }: {
      candidateId: string;
      systemName: string;
      systemPassword: string;
      systemNumber: string;
      deskNumber: string;
    }) =>
      repositories.onboarding.patch(candidateId, {
        systemName,
        systemPassword,
        systemNumber,
        deskNumber,
        systemDeskSavedAt: nowISO(),
      }),
    onSuccess: invalidate,
  });

  // Sub-step 3: email the assigned buddy their responsibilities, then record
  // who was assigned. Best-effort send, same as the other composed emails —
  // a delivery failure still lets HR record the assignment.
  const sendBuddyAssignment = useMutation({
    mutationFn: async (input: {
      candidateId: string;
      to: string;
      subject: string;
      body: string;
      employeeId: string;
      employeeName: string;
    }) => {
      const res = await sendCustomEmail({
        to: input.to,
        subject: input.subject,
        body: input.body,
        links: BUDDY_RESOURCE_LINKS,
      }).catch(
        () => ({ sent: false, reason: undefined }) as { sent: boolean; reason?: string },
      );
      await repositories.onboarding.patch(input.candidateId, {
        buddyEmployeeId: input.employeeId,
        buddyEmployeeName: input.employeeName,
        buddyAssignedAt: nowISO(),
      });
      return res;
    },
    onSuccess: invalidate,
  });

  // Save the HR-built offer letter (values) onto the onboarding record.
  const saveOfferLetter = useMutation({
    mutationFn: ({ candidateId, offerLetter }: { candidateId: string; offerLetter: OfferLetterData }) =>
      repositories.onboarding.patch(candidateId, { offerLetter }),
    onSuccess: invalidate,
  });

  // Remove the offer letter from the onboarding record (the S3 PDF is deleted by
  // the caller). null clears the JSONB field.
  const deleteOfferLetter = useMutation({
    mutationFn: (candidateId: string) =>
      repositories.onboarding.patch(candidateId, {
        offerLetter: null,
      } as unknown as Partial<OnboardingChecklist>),
    onSuccess: invalidate,
  });

  // Save the HR-built appointment letter (values) onto the onboarding record.
  const saveAppointmentLetter = useMutation({
    mutationFn: ({
      candidateId,
      appointmentLetter,
    }: {
      candidateId: string;
      appointmentLetter: AppointmentLetterData;
    }) => repositories.onboarding.patch(candidateId, { appointmentLetter }),
    onSuccess: invalidate,
  });

  // Remove the appointment letter from the onboarding record. null clears the
  // JSONB field.
  const deleteAppointmentLetter = useMutation({
    mutationFn: (candidateId: string) =>
      repositories.onboarding.patch(candidateId, {
        appointmentLetter: null,
      } as unknown as Partial<OnboardingChecklist>),
    onSuccess: invalidate,
  });

  return {
    send,
    sendComposed,
    markOfferSigned,
    markAppointmentSigned,
    markJoiningDocsSkipped,
    markBgvSkipped,
    revertEmployeeConversion,
    setJoiningDate,
    markFirstDayArrived,
    saveAllocationEmail,
    saveSystemDesk,
    sendBuddyAssignment,
    saveOfferLetter,
    deleteOfferLetter,
    saveAppointmentLetter,
    deleteAppointmentLetter,
  };
}

/** Pull a candidate back OUT of onboarding into the plain Candidates pipeline
 *  for their role — the reverse of useEnsureOnboarding. Only the onboarding
 *  checklist record (metadata) is removed and the candidate's status reverts
 *  to 'Shortlisted'; nothing here ever calls the candidate DELETE endpoint,
 *  which is the only path that cascades to deleting S3 documents — uploaded
 *  onboarding docs are left exactly where they are. */
export function useConvertToCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => {
      await repositories.onboarding.remove(candidateId);
      await repositories.candidates.patch(candidateId, {
        status: 'Shortlisted',
        blacklistedAt: null,
        blacklistReason: null,
      } as unknown as Partial<Candidate>);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.onboarding.all });
      qc.invalidateQueries({ queryKey: qk.candidates.all });
    },
  });
}

/** Remove a candidate from onboarding and mark them Blacklisted. Same
 *  storage guarantee as useConvertToCandidate — only the onboarding record
 *  is removed and the candidate's status is patched; uploaded documents in
 *  S3 are never touched. Blacklisted candidates are filtered out of the
 *  regular Candidates list (see CandidateListView) and surface only in the
 *  "Blacklisted candidates" view. */
export function useBlacklistCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidateId, reason }: { candidateId: string; reason: string }) => {
      await repositories.onboarding.remove(candidateId);
      await repositories.candidates.patch(candidateId, {
        status: 'Blacklisted',
        blacklistedAt: nowISO(),
        blacklistReason: reason,
      } as unknown as Partial<Candidate>);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.onboarding.all });
      qc.invalidateQueries({ queryKey: qk.candidates.all });
    },
  });
}

/** Promote a finished onboarding into a full employee (touches 3 resources). */
export function usePromoteFromOnboarding() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (checklist: OnboardingChecklist) => {
      // Defense-in-depth: the UI already hides the "Convert to employee"
      // action once converted, but this guard stops a duplicate employee
      // record from being created even if the mutation somehow fires again
      // (stale UI state, a double-click race, another call site).
      if (checklist.convertedToEmployeeAt || checklist.employeeId) return;
      const candidates = qc.getQueryData<Candidate[]>(qk.candidates.all) ?? [];
      const candidate = candidates.find(c => c.id === checklist.candidateId);
      if (!candidate) return;

      // Step 6 ("Allocation of mail, system & desk") captures the company mailbox
      // HR created in Google Admin. That address is the employee's work email and
      // the key every other system will match them on, so refuse to create a
      // half-formed record without it. Previously this value was saved onto the
      // checklist and then dropped: the employee was created with the candidate's
      // PERSONAL address instead, which downstream code (offboarding handover,
      // granted credentials) treats as the work address.
      const companyEmail = checklist.allocationEmail?.trim();
      if (!companyEmail) {
        throw new Error(
          'Add the company email under "Allocation of mail, system & desk" before converting.',
        );
      }

      // Default the new employee's profile photo to the passport photo they
      // uploaded as a joining document, if one was submitted AND it's actually
      // an image file — candidates sometimes upload a scanned PDF instead of a
      // photo, which an <img> tag can't render, so that case falls back to the
      // initials avatar instead of a broken image.
      const docRequests = await repositories.docRequests.list();
      const joiningDocs = docRequests
        .filter(r => r.candidateId === checklist.candidateId && !r.kind)
        .sort((a, b) => (b.submissions?.length ?? 0) - (a.submissions?.length ?? 0))[0];
      const passportPhoto = joiningDocs?.submissions?.find(
        s => s.docType === 'Passport photo' && /\.(jpe?g|png|gif|webp)$/i.test(s.fileName || ''),
      );

      // Allocated server-side from a sequence so two HR users converting at the
      // same moment cannot mint the same code and overwrite each other's employee.
      const { employeeCode } = await allocateEmployeeCode();

      // Snapshot the onboarding email milestones onto the employee.
      const employee = {
        ...buildEmployeeFromCandidate(candidate, {
          companyEmail,
          employeeCode,
          grantedBy: user?.name || user?.email || 'HR',
        }),
        ...(passportPhoto ? { avatarUrl: documentPreviewUrl(passportPhoto.documentId) } : {}),
        joining: {
          offerLetterSentAt: checklist.offerLetterSentAt,
          offerSignedReceivedAt: checklist.offerSignedReceivedAt,
          officeInviteSentAt: checklist.officeInviteSentAt,
          appointmentLetterSentAt: checklist.appointmentLetterSentAt,
        },
      };
      await repositories.employees.create(employee);
      // Move their resume + joining documents into the employee's own S3
      // folder/entity so the new Documents tab shows them. Best-effort: a
      // failure here must not block the conversion itself.
      try {
        await promoteCandidateDocuments(checklist.candidateId, employee.id);
      } catch {
        // swallowed — logged server-side; conversion proceeds regardless
      }
      // The onboarding record is KEPT (not deleted) so its full step history
      // stays visible — it's just tagged as converted, linking to the new
      // employee id. The onboarding list shows it as "Employee" instead of
      // "Pending".
      await repositories.onboarding.patch(checklist.candidateId, {
        convertedToEmployeeAt: nowISO(),
        employeeId: employee.id,
      });
      await repositories.candidates.patch(checklist.candidateId, { status: 'Shortlisted' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.employees.all });
      qc.invalidateQueries({ queryKey: qk.onboarding.all });
      qc.invalidateQueries({ queryKey: qk.candidates.all });
    },
  });
}
