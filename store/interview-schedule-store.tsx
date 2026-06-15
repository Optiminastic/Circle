'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Candidate, Interview } from '@/types';
import { useInterviews } from '@/features/interviews/hooks';
import { useToast } from '@/components/Toaster';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { sendCustomEmail } from '@/lib/api/notifications';
import { pushCalendarEvent } from '@/lib/api/calendar';
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

      const attendees = [c.email, input.interviewerEmail, HR_EMAIL].filter(
        (e): e is string => !!e && e.trim().length > 0,
      );
      // Update the same calendar event (keyed by the interview id).
      pushCalendarEvent({
        appEventId: existing.id,
        type: 'Interview',
        title: `Interview - ${c.fullName} - ${position}`,
        dateTimeIso: input.dateTimeIso,
        durationMin: input.durationMin,
        location: input.location,
        attendees,
        notes: `Rescheduled interview for ${c.fullName} (${position}).`,
      }).catch(() => {});

      let emailStatus: Interview['emailStatus'] = 'Not Sent';
      if (c.email) {
        try {
          const r = await sendCustomEmail({
            to: c.email,
            subject: input.emailSubject,
            body: input.emailBody,
            cc: [HR_EMAIL],
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
        repositories.sentEmails
          .create({
            id: randomId('EML'),
            recipientName: c.fullName,
            recipientEmail: c.email,
            templateTitle: 'Interview Rescheduled',
            subject: input.emailSubject,
            dateSent: nowISO(),
            status: 'Sent',
            relatedEntity: c.fullName,
          })
          .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
          .catch(() => {});
      }

      // Notify the interviewer of the new time too.
      if (input.interviewerEmail) {
        sendCustomEmail({
          to: input.interviewerEmail,
          subject: `Interview rescheduled: ${c.fullName} for ${position}`,
          body: `Hi ${input.interviewerName || 'there'},\n\nThe interview with ${c.fullName} (${position}) has been rescheduled.\n\nNew time: ${new Date(input.dateTimeIso).toLocaleString()}\n\n— ${BRAND.company}`,
        }).catch(() => {});
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

      // Calendar invite (.ics) details shared by every recipient. The HR account is
      // the organizer, so the event also lands on the HR calendar; candidate +
      // interviewer + HR are attendees and get it on theirs via the invitation.
      const attendees = [c.email, input.interviewerEmail, HR_EMAIL].filter(
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
          title: `Interview - ${c.fullName} - ${position}`,
          dateTimeIso: input.dateTimeIso,
          durationMin: input.durationMin,
          location: input.location,
          attendees,
          notes: eventDescription,
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

      session = { candidateId: c.id, id, position, eventFields, meetLink, googleEventId };
      sessionRef.current = session;
    }

    const { id, eventFields, meetLink, googleEventId } = session;

    // 2) Email the candidate the (possibly edited) invitation, with the calendar
    // invite attached and HR cc'd. This is the step the modal is gated on.
    let emailStatus: Interview['emailStatus'] = 'Not Sent';
    if (c.email) {
      try {
        const r = await sendCustomEmail({
          to: c.email,
          subject: input.emailSubject,
          body: input.emailBody,
          cc: [HR_EMAIL],
          ...eventFields,
        });
        emailStatus = r.sent ? 'Sent' : 'Failed';
      } catch {
        emailStatus = 'Failed';
      }

      // The invitation couldn't be delivered — keep the modal open so HR can
      // fix the issue and try again. The interview/calendar event is preserved
      // in the session, so retrying only re-sends the email.
      if (emailStatus !== 'Sent') {
        setSending(false);
        toast.error('Email not sent — please try again.', { position: 'top-center' });
        return;
      }

      repositories.sentEmails
        .create({
          id: randomId('EML'),
          recipientName: c.fullName,
          recipientEmail: c.email,
          templateTitle: 'Interview Invitation',
          subject: input.emailSubject,
          dateSent: nowISO(),
          status: 'Sent',
          relatedEntity: c.fullName,
        })
        .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
        .catch(() => {});
    }

    // 3) Notify the interviewer (if provided) with the full candidate brief, the
    // candidate's resume link, a public question sheet, and the calendar invite.
    if (input.interviewerEmail) {
      const when = new Date(input.dateTimeIso);
      const whenStr = Number.isNaN(when.getTime())
        ? input.dateTimeIso
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
      const ivBody = [
        `Hi ${input.interviewerName || 'there'},`,
        '',
        "You've been assigned to interview a candidate. Details below:",
        '',
        `Candidate: ${c.fullName}`,
        `Role applied: ${position} (${c.department})`,
        `Experience: ${c.totalExperienceYears} yrs total · ${c.relevantExperienceYears} yrs relevant`,
        `Current: ${c.currentCompany || '—'} — ${c.currentDesignation || '—'}`,
        `Email: ${c.email || '—'}`,
        `Phone: ${c.phone || '—'}`,
        '',
        `When: ${whenStr}`,
        input.notes ? `\nNotes: ${input.notes}` : '',
        '',
        `— ${BRAND.company}`,
      ].join('\n');
      sendCustomEmail({
        to: input.interviewerEmail,
        subject: `Interview scheduled: ${c.fullName} for ${position}`,
        body: ivBody,
        ...eventFields,
      }).catch(() => {});
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
    <InterviewSchedulerContext.Provider value={{ openInterviewSchedule, rescheduleInterview }}>
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
