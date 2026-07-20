'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Candidate, Interview } from '@/types';
import { useInterviews } from '@/features/interviews/hooks';
import { useToast } from '@/components/Toaster';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { sendCustomEmail } from '@/lib/api/notifications';
import { pushCalendarEvent, deleteCalendarEvent } from '@/lib/api/calendar';
import { fetchRenderedTemplate } from '@/features/email-templates/hooks';
import { BRAND } from '@/lib/brand';
import { HR_EMAIL } from '@/lib/config';
import { randomId, nowISO } from '@/lib/utils';
import {
  InterviewScheduleModal,
  BusyInterview,
  InterviewScheduleResult,
} from '@/components/InterviewScheduleModal';

interface InterviewSchedulerApi {
  /** Open the rich "Schedule Interview" dialog for a candidate. */
  openInterviewSchedule: (candidate: Candidate) => void;
  /** Re-open the dialog pre-filled with the existing slot to reschedule it. */
  rescheduleInterview: (candidate: Candidate) => void;
  /** Cancel the candidate's interview + remove its Google Calendar events, freeing
   *  the slot for another candidate. */
  cancelInterview: (candidate: Candidate) => void;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const splitLocal = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
};

/**
 * The interviewer is notified for a slot one hour AFTER the candidate's time
 * (e.g. candidate 10:00 → interviewer 11:00). The candidate-facing time/invite is
 * never shifted — only the interviewer's email + calendar invite.
 */
const INTERVIEWER_OFFSET_MIN = 60;
const addMinutesIso = (iso: string, mins: number) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Date(d.getTime() + mins * 60_000).toISOString();
};

// Flatten `[[label|url]]` link tokens to "label: url" — a Google Calendar event
// description is plain text, not HTML.
const plainText = (body: string): string =>
  (body || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_m, label, url) => `${label.trim()}: ${url.trim()}`);

const InterviewSchedulerContext = createContext<InterviewSchedulerApi | null>(null);

export function InterviewScheduleProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Candidate | null>(null);
  const [mode, setMode] = useState<'schedule' | 'reschedule'>('schedule');
  // True while the candidate invitation is in flight — locks the modal open.
  const [sending, setSending] = useState(false);
  // The interview already created for the open modal. A retry after a failed
  // email reuses this so we re-send only — never duplicating the interview
  // record or the calendar event.
  const sessionRef = useRef<{
    candidateId: string;
    id: string;
    position: string;
    eventFields: Record<string, unknown>;
    /** Calendar/.ics fields for the interviewer's copy (shifted +1h). */
    interviewerEventFields: Record<string, unknown>;
    /** Did Google create the event (→ it emails the invite from hr@)? When true
     *  we DON'T also send the app's own email, so only one message goes out. */
    candidatePushed: boolean;
    interviewerPushed: boolean;
    meetLink?: string | null;
    googleEventId?: string | null;
  } | null>(null);
  const { data: interviews = [] } = useInterviews();

  const closeModal = () => {
    setPending(null);
    setMode('schedule');
    setSending(false);
    sessionRef.current = null;
  };

  // The candidate's current (non-cancelled) interview, used to reschedule.
  const existingFor = (candidateId: string) =>
    interviews.find(iv => iv.candidateId === candidateId && iv.status !== 'Cancelled');

  // Existing interview windows — used to block double-booking the same slot.
  const busyInterviews: BusyInterview[] = useMemo(() => {
    const slots: BusyInterview[] = [];
    for (const iv of interviews) {
      if (iv.status === 'Cancelled') continue;
      const start = new Date(iv.dateTime).getTime();
      if (Number.isNaN(start)) continue;
      slots.push({
        start,
        end: start + (iv.durationMinutes || 45) * 60_000,
        candidateId: iv.candidateId,
        candidateName: iv.candidateName,
      });
    }
    return slots;
  }, [interviews]);

  const openInterviewSchedule = (candidate: Candidate) => {
    // One interview per candidate — point HR at reschedule once one is booked.
    const existing = existingFor(candidate.id);
    if (existing) {
      toast.info(
        `An interview is already scheduled for ${candidate.fullName} — use "Reschedule" to change the slot.`,
      );
      return;
    }
    setMode('schedule');
    setPending(candidate);
  };

  const rescheduleInterview = (candidate: Candidate) => {
    if (!existingFor(candidate.id)) {
      // Nothing booked yet — fall back to scheduling a fresh one.
      setMode('schedule');
      setPending(candidate);
      return;
    }
    setMode('reschedule');
    setPending(candidate);
  };

  const cancelInterview = (candidate: Candidate) => {
    const existing = existingFor(candidate.id);
    if (!existing) {
      toast.info(`No scheduled interview to cancel for ${candidate.fullName}.`);
      return;
    }
    toast.confirm({
      title: `Cancel ${candidate.fullName}'s interview?`,
      description:
        'This cancels the interview and removes the event from the HR, interviewer and candidate calendars. The time slot becomes free for another candidate.',
      confirmLabel: 'Cancel interview',
      onConfirm: async () => {
        // Remove both calendar events (candidate + interviewer +1h). Google
        // notifies attendees of the cancellation (sendUpdates=all). Best-effort.
        deleteCalendarEvent(existing.id).catch(() => {});
        deleteCalendarEvent(`${existing.id}-interviewer`).catch(() => {});
        try {
          await repositories.interviews.patch(existing.id, { status: 'Cancelled' });
          qc.invalidateQueries({ queryKey: qk.interviews.all });
          toast.success('Interview cancelled — calendar events removed, slot freed.');
        } catch {
          toast.error('Could not cancel the interview — please try again.');
        }
      },
    });
  };

  const confirm = async (input: InterviewScheduleResult) => {
    if (!pending || sending) return;
    const c = pending;
    setSending(true);

    const position = c.appliedRole || c.department || 'the role';

    // --- Reschedule: update the existing interview in place, then re-notify. ---
    if (mode === 'reschedule') {
      const existing = existingFor(c.id);
      if (!existing) {
        setSending(false);
        toast.error('No interview found to reschedule.', { position: 'top-center' });
        return;
      }
      try {
        await repositories.interviews.patch(existing.id, {
          dateTime: input.dateTimeIso,
          durationMinutes: input.durationMin,
          interviewRound: input.type === 'Online' ? 'Online' : 'Onsite',
          meetingMode: input.type === 'Online' ? 'Google Meet' : 'In-Person',
          meetingLink: input.type === 'Online' ? input.location : '',
          location: input.location,
          interviewType: input.type,
          interviewerName: input.interviewerName || existing.interviewerName,
          interviewerEmail: input.interviewerEmail,
          additionalNotes: input.notes,
          status: 'Scheduled',
        });
        qc.invalidateQueries({ queryKey: qk.interviews.all });
      } catch {
        setSending(false);
        toast.error('Could not update the interview — please try again.', { position: 'top-center' });
        return;
      }

      // Candidate's event holds candidate + HR; the interviewer gets a separate
      // event shifted +1h (below), so the two never collide on a calendar.
      const interviewerIso = addMinutesIso(input.dateTimeIso, INTERVIEWER_OFFSET_MIN);
      const attendees = [c.email, HR_EMAIL].filter(
        (e): e is string => !!e && e.trim().length > 0,
      );
      const interviewerAttendees = [input.interviewerEmail, HR_EMAIL].filter(
        (e): e is string => !!e && e.trim().length > 0,
      );
      // Update the same calendar event (keyed by the interview id). In-person by
      // default. When Google creates it, its invite from hr@ is the candidate's
      // email — carry the composed subject + body on the event and skip the app one.
      let reschedPushed = false;
      try {
        const r = await pushCalendarEvent({
          appEventId: existing.id,
          type: 'Interview',
          title: input.emailSubject,
          dateTimeIso: input.dateTimeIso,
          durationMin: input.durationMin,
          location: input.location,
          attendees,
          notes: plainText(input.emailBody),
          online: false,
        });
        reschedPushed = r.pushed;
      } catch {
        /* calendar sync is best-effort */
      }

      // Move the interviewer's own event (+1h) too.
      let reschedInterviewerPushed = false;
      if (input.interviewerEmail) {
        try {
          const r = await pushCalendarEvent({
            appEventId: `${existing.id}-interviewer`,
            type: 'Interview',
            title: `Assigned a interview for ${position} : ${c.fullName}`,
            dateTimeIso: interviewerIso,
            durationMin: input.durationMin,
            // No office location on the interviewer's event (candidate-only).
            attendees: interviewerAttendees,
            notes: `Rescheduled interview for ${c.fullName} (${position}).`,
            online: false,
          });
          reschedInterviewerPushed = r.pushed;
        } catch {
          /* calendar sync is best-effort */
        }
      }

      let emailStatus: Interview['emailStatus'] = 'Not Sent';
      if (c.email) {
        if (reschedPushed) {
          emailStatus = 'Sent'; // the hr@ calendar invite is the candidate's email
        } else {
          try {
            const r = await sendCustomEmail({
              to: c.email,
              subject: input.emailSubject,
              body: input.emailBody,
              eventStartIso: input.dateTimeIso,
              eventDurationMin: input.durationMin,
              eventSummary: `Interview - ${c.fullName} - ${position}`,
              eventLocation: input.location,
              organizerEmail: HR_EMAIL,
              organizerName: `${BRAND.company} HR`,
              attendees,
              eventUid: existing.id,
            });
            emailStatus = r.sent ? 'Sent' : 'Failed';
          } catch {
            emailStatus = 'Failed';
          }
          if (emailStatus !== 'Sent') {
            setSending(false);
            toast.error('Reschedule email not sent — please try again.', { position: 'top-center' });
            return;
          }
        }
        repositories.sentEmails
          .create({
            id: randomId('EML'),
            recipientName: c.fullName,
            recipientEmail: c.email,
            templateTitle: reschedPushed ? 'Interview Rescheduled (Google Calendar)' : 'Interview Rescheduled',
            subject: input.emailSubject,
            dateSent: nowISO(),
            status: 'Sent',
            relatedEntity: c.fullName,
          })
          .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
          .catch(() => {});
      }

      // Notify the interviewer of the new time too — only when Google didn't send
      // them the updated (+1h) invite already.
      if (input.interviewerEmail && !reschedInterviewerPushed) {
        // Copy comes from Settings → Email templates ("Interview rescheduled —
        // interviewer").
        fetchRenderedTemplate('interview_reschedule_interviewer', {
          interviewer_name: input.interviewerName || 'there',
          candidate_name: c.fullName,
          role: position,
          date_time: new Date(interviewerIso).toLocaleString(),
        })
          .then(tpl => {
            if (!tpl) return;
            sendCustomEmail({
              to: input.interviewerEmail,
              subject: tpl.subject,
              body: tpl.body,
              eventStartIso: interviewerIso,
              eventDurationMin: input.durationMin,
              eventSummary: `Interview - ${c.fullName} - ${position}`,
              // Interviewer .ics carries no office location (candidate-only).
              organizerEmail: HR_EMAIL,
              organizerName: `${BRAND.company} HR`,
              attendees: interviewerAttendees,
              eventUid: `${existing.id}-interviewer`,
            }).catch(() => {});
          })
          .catch(() => {});
      }

      repositories.interviews
        .patch(existing.id, { emailStatus })
        .then(() => qc.invalidateQueries({ queryKey: qk.interviews.all }))
        .catch(() => {});

      closeModal();
      toast.success(
        emailStatus === 'Sent'
          ? 'Interview rescheduled — candidate notified.'
          : 'Interview rescheduled — no candidate email on file.',
        { position: 'top-center' },
      );
      return;
    }

    // 1) Create the interview record + calendar event ONCE per modal session.
    // A retry after a failed email reuses the stored session, so re-sending the
    // invitation never duplicates the interview record or the calendar event.
    let session = sessionRef.current;
    if (!session || session.candidateId !== c.id) {
      const id = randomId('INT');

      const interview: Interview = {
        id,
        candidateId: c.id,
        candidateName: c.fullName,
        appliedRole: c.appliedRole,
        department: c.department,
        interviewRound: input.type === 'Online' ? 'Online' : 'Onsite',
        interviewerName: input.interviewerName || 'To be assigned',
        interviewerEmail: input.interviewerEmail,
        dateTime: input.dateTimeIso,
        meetingMode: input.type === 'Online' ? 'Google Meet' : 'In-Person',
        meetingLink: input.type === 'Online' ? input.location : '',
        location: input.location,
        interviewType: input.type,
        candidateEmail: c.email,
        candidatePhone: c.phone,
        additionalNotes: input.notes,
        durationMinutes: input.durationMin,
        status: 'Scheduled',
        emailStatus: 'Not Sent',
        createdAt: nowISO(),
      };

      // Persist the interview record (drives the timeline + Upcoming Interviews).
      try {
        await repositories.interviews.create(interview);
      } catch {
        setSending(false);
        toast.error('Could not save the interview — please try again.', { position: 'top-center' });
        return;
      }
      qc.invalidateQueries({ queryKey: qk.interviews.all });

      // Calendar invite (.ics) details. The candidate's event holds the candidate
      // + HR only; the interviewer gets a SEPARATE event shifted +1h (below), so
      // their calendar never shows the candidate's time. HR is the organizer.
      const interviewerIso = addMinutesIso(input.dateTimeIso, INTERVIEWER_OFFSET_MIN);
      const attendees = [c.email, HR_EMAIL].filter(
        (e): e is string => !!e && e.trim().length > 0,
      );
      const interviewerAttendees = [input.interviewerEmail, HR_EMAIL].filter(
        (e): e is string => !!e && e.trim().length > 0,
      );
      const eventDescription = [
        `Candidate: ${c.fullName}`,
        `Role applied: ${position} (${c.department})`,
        `Experience: ${c.totalExperienceYears} yrs total · ${c.relevantExperienceYears} yrs relevant`,
        `Email: ${c.email || '—'}`,
        `Phone: ${c.phone || '—'}`,
        `Interviewer: ${input.interviewerName || '—'}`,
        `Mode: ${input.type}`,
        input.notes ? `Notes: ${input.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      // Create the event on the connected HR Google Calendar. Google emails its
      // own invite to the attendees (candidate + interviewer + HR) via
      // sendUpdates=all, and the event shows on the HR calendar embedded on the
      // Calendar page. No-op (returns pushed:false) if Google isn't connected.
      let pushed = false;
      let meetLink: string | null | undefined;
      let googleEventId: string | null | undefined;
      try {
        const res = await pushCalendarEvent({
          appEventId: id,
          type: 'Interview',
          // Google's invite (from hr@) IS the candidate's email — carry the
          // composed subject + body on the event itself.
          title: input.emailSubject,
          dateTimeIso: input.dateTimeIso,
          durationMin: input.durationMin,
          location: input.location,
          attendees,
          notes: plainText(input.emailBody),
          online: false,
        });
        pushed = res.pushed;
        meetLink = res.meetLink;
        googleEventId = res.googleEventId;
      } catch {
        /* calendar sync is best-effort */
      }

      // Attach an .ics invite to the emails only when Google did NOT create the
      // event (e.g. the shared account isn't connected) — avoids duplicate entries.
      const eventFields = pushed
        ? {}
        : {
            eventStartIso: input.dateTimeIso,
            eventDurationMin: input.durationMin,
            eventSummary: `Interview - ${c.fullName} - ${position}`,
            eventLocation: input.location,
            eventDescription,
            organizerEmail: HR_EMAIL,
            organizerName: `${BRAND.company} HR`,
            attendees,
            eventUid: id,
          };

      // Interviewer's own calendar event, shifted +1h. Pushed once per session so
      // a retry never duplicates it. If Google isn't connected, the interviewer's
      // email carries the .ics (interviewerEventFields) at the shifted time.
      let interviewerEventFields: Record<string, unknown> = {};
      let interviewerPushed = false;
      if (input.interviewerEmail) {
        try {
          const ivRes = await pushCalendarEvent({
            appEventId: `${id}-interviewer`,
            type: 'Interview',
            title: `Assigned a interview for ${position} : ${c.fullName}`,
            dateTimeIso: interviewerIso,
            durationMin: input.durationMin,
            // No office location on the interviewer's event — they get the
            // candidate brief + time only (office address is for the candidate).
            attendees: interviewerAttendees,
            notes: eventDescription,
            online: false,
          });
          interviewerPushed = ivRes.pushed;
        } catch {
          /* calendar sync is best-effort */
        }
        interviewerEventFields = interviewerPushed
          ? {}
          : {
              eventStartIso: interviewerIso,
              eventDurationMin: input.durationMin,
              eventSummary: `Interview - ${c.fullName} - ${position}`,
              // Interviewer .ics carries no office location (candidate-only).
              eventDescription,
              organizerEmail: HR_EMAIL,
              organizerName: `${BRAND.company} HR`,
              attendees: interviewerAttendees,
              eventUid: `${id}-interviewer`,
            };
      }

      session = {
        candidateId: c.id,
        id,
        position,
        eventFields,
        interviewerEventFields,
        candidatePushed: pushed,
        interviewerPushed,
        meetLink,
        googleEventId,
      };
      sessionRef.current = session;
    }

    const { id, eventFields, interviewerEventFields, candidatePushed, interviewerPushed, meetLink, googleEventId } =
      session;

    // 2) Notify the candidate. When Google created the event, its invite from hr@
    // (carrying the composed subject + body) IS the email — don't send a second
    // one from notification@. Only fall back to the app email (with an .ics) when
    // Google isn't connected. This step gates the modal.
    let emailStatus: Interview['emailStatus'] = 'Not Sent';
    if (c.email) {
      if (candidatePushed) {
        emailStatus = 'Sent'; // the hr@ calendar invite is the candidate's email
      } else {
        try {
          const r = await sendCustomEmail({
            to: c.email,
            subject: input.emailSubject,
            body: input.emailBody,
            ...eventFields,
          });
          emailStatus = r.sent ? 'Sent' : 'Failed';
        } catch {
          emailStatus = 'Failed';
        }
        // Keep the modal open so HR can fix + retry; the interview/event is
        // preserved in the session, so a retry only re-sends the email.
        if (emailStatus !== 'Sent') {
          setSending(false);
          toast.error('Email not sent — please try again.', { position: 'top-center' });
          return;
        }
      }

      repositories.sentEmails
        .create({
          id: randomId('EML'),
          recipientName: c.fullName,
          recipientEmail: c.email,
          templateTitle: candidatePushed ? 'Interview Invitation (Google Calendar)' : 'Interview Invitation',
          subject: input.emailSubject,
          dateSent: nowISO(),
          status: 'Sent',
          relatedEntity: c.fullName,
        })
        .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
        .catch(() => {});
    }

    // 3) Notify the interviewer — only when Google didn't already send them the
    // (+1h) invite from hr@.
    if (input.interviewerEmail && !interviewerPushed) {
      // Interviewer's slot is +1h vs the candidate's.
      const interviewerIso = addMinutesIso(input.dateTimeIso, INTERVIEWER_OFFSET_MIN);
      const when = new Date(interviewerIso);
      const whenStr = Number.isNaN(when.getTime())
        ? interviewerIso
        : when.toLocaleString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

      // Interviewer brief — candidate details + the time only. Mode and office
      // location are intentionally omitted (those are for the candidate); the
      // resume + interview questions are sent separately from the Physical
      // Interview step once the candidate gets there.
      // Copy comes from Settings → Email templates ("Interview schedule —
      // interviewer"), so HR's saved edits are what actually goes out.
      fetchRenderedTemplate('interview_schedule_interviewer', {
        interviewer_name: input.interviewerName || 'there',
        candidate_name: c.fullName,
        role: position,
        department: c.department,
        experience: `${c.totalExperienceYears} yrs total · ${c.relevantExperienceYears} yrs relevant`,
        current_company: c.currentCompany || '—',
        current_designation: c.currentDesignation || '—',
        candidate_email: c.email || '—',
        candidate_phone: c.phone || '—',
        date_time: whenStr,
        notes: input.notes || '',
      })
        .then(tpl => {
          if (!tpl) return;
          sendCustomEmail({
            to: input.interviewerEmail,
            subject: tpl.subject,
            body: tpl.body,
            ...interviewerEventFields,
          }).catch(() => {});
        })
        .catch(() => {});
    }

    // 4) Backfill the interview record with the calendar id, meet link + status.
    repositories.interviews
      .patch(id, {
        emailStatus,
        googleEventId: googleEventId ?? id,
        ...(meetLink ? { meetingLink: meetLink } : {}),
      })
      .then(() => qc.invalidateQueries({ queryKey: qk.interviews.all }))
      .catch(() => {});

    // The invitation went out (or there was no candidate email to send to) —
    // close the modal and confirm to HR.
    closeModal();

    if (emailStatus === 'Sent') {
      toast.success('Email sent successfully — interview scheduled.', { position: 'top-center' });
    } else {
      toast.info('Interview scheduled — no candidate email on file, so no invitation was sent.', {
        position: 'top-center',
      });
    }
  };

  const pendingExisting = pending ? existingFor(pending.id) : undefined;
  const initial =
    mode === 'reschedule' && pendingExisting
      ? {
          ...splitLocal(pendingExisting.dateTime),
          type: (pendingExisting.interviewType ??
            (pendingExisting.meetingMode === 'In-Person' ? 'Offline' : 'Online')) as
            | 'Online'
            | 'Offline',
          interviewerName: pendingExisting.interviewerName,
          interviewerEmail: pendingExisting.interviewerEmail,
          notes: pendingExisting.additionalNotes,
        }
      : undefined;

  return (
    <InterviewSchedulerContext.Provider
      value={{ openInterviewSchedule, rescheduleInterview, cancelInterview }}
    >
      {children}
      {pending && (
        <InterviewScheduleModal
          key={`${pending.id}-${mode}`}
          candidate={pending}
          busyInterviews={busyInterviews}
          onConfirm={confirm}
          onClose={closeModal}
          isSending={sending}
          mode={mode}
          initial={initial}
        />
      )}
    </InterviewSchedulerContext.Provider>
  );
}

export function useInterviewScheduler(): InterviewSchedulerApi {
  const ctx = useContext(InterviewSchedulerContext);
  if (!ctx)
    throw new Error('useInterviewScheduler must be used within an InterviewScheduleProvider');
  return ctx;
}
