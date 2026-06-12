'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Candidate, Interview } from '@/types';
import { useInterviews } from '@/features/interviews/hooks';
import { useToast } from '@/components/Toaster';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { sendCustomEmail } from '@/lib/api/notifications';
import { pushCalendarEvent } from '@/lib/api/calendar';
import { listDocuments, documentPreviewUrl } from '@/lib/api/documents';
import { encodeInterviewSheet } from '@/lib/interview-sheet';
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
}

const InterviewSchedulerContext = createContext<InterviewSchedulerApi | null>(null);

export function InterviewScheduleProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Candidate | null>(null);
  const { data: interviews = [] } = useInterviews();

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
    // One interview per candidate — block re-scheduling once one is booked.
    const existing = interviews.find(
      iv => iv.candidateId === candidate.id && iv.status !== 'Cancelled',
    );
    if (existing) {
      toast.info(
        `An interview is already scheduled for ${candidate.fullName} (${new Date(
          existing.dateTime,
        ).toLocaleString()}).`,
      );
      return;
    }
    setPending(candidate);
  };

  const confirm = async (input: InterviewScheduleResult) => {
    if (!pending) return;
    const c = pending;
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

    // 1) Persist the interview record (drives the timeline + Upcoming Interviews).
    try {
      await repositories.interviews.create(interview);
    } catch {
      toast.error('Could not save the interview — please try again.');
      return;
    }
    qc.invalidateQueries({ queryKey: qk.interviews.all });
    setPending(null);

    const position = c.appliedRole || c.department || 'the role';

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
    // 2) Create the event on the connected HR Google Calendar. Google emails its
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
          organizerName: `${BRAND.name} HR`,
          attendees,
          eventUid: id,
        };

    // 2) Email the candidate the (possibly edited) invitation, with the calendar
    // invite attached and HR cc'd. Log delivery status.
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
      repositories.sentEmails
        .create({
          id: randomId('EML'),
          recipientName: c.fullName,
          recipientEmail: c.email,
          templateTitle: 'Interview Invitation',
          subject: input.emailSubject,
          dateSent: nowISO(),
          status: emailStatus === 'Sent' ? 'Sent' : 'Failed',
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

      // Resolve the candidate's uploaded resume to a public inline-preview link.
      let resumeUrl = '';
      try {
        const docs = await listDocuments('candidate', c.id);
        const resumeDoc = docs.find(d => d.category === 'resume') ?? docs[0];
        if (resumeDoc) resumeUrl = documentPreviewUrl(resumeDoc.id);
      } catch {
        /* resume optional — proceed without it */
      }

      // Build the public question-sheet link (candidate basics + questions encoded
      // in the URL, so it works for an external interviewer with no app access).
      let sheetUrl = '';
      if (input.questionSet && input.questionSet.questions.length) {
        const encoded = encodeInterviewSheet({
          interviewId: id,
          candidateName: c.fullName,
          role: position,
          department: c.department,
          experienceYears: c.totalExperienceYears,
          relevantExperienceYears: c.relevantExperienceYears,
          email: c.email,
          phone: c.phone,
          currentCompany: c.currentCompany,
          currentDesignation: c.currentDesignation,
          resumeUrl,
          interviewerName: input.interviewerName,
          whenIso: input.dateTimeIso,
          mode: input.type,
          roleLabel: input.questionSet.roleLabel,
          questions: input.questionSet.questions,
        });
        sheetUrl = `${window.location.origin}/interview-sheet?d=${encodeURIComponent(encoded)}`;
      }

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
        `Mode: ${input.type}`,
        ...(input.location ? [`Location: ${input.location}`] : []),
        input.notes ? `\nNotes: ${input.notes}` : '',
        '',
        `— ${BRAND.name}`,
      ].join('\n');
      // Resume + question sheet go as labelled buttons (anchors), not raw URLs.
      const links = [
        ...(resumeUrl ? [{ label: 'View candidate resume', url: resumeUrl }] : []),
        ...(sheetUrl ? [{ label: 'Open interview questions', url: sheetUrl }] : []),
      ];
      sendCustomEmail({
        to: input.interviewerEmail,
        subject: `Interview scheduled: ${c.fullName} for ${position}`,
        body: ivBody,
        ...(links.length ? { links } : {}),
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

    if (emailStatus === 'Sent') {
      toast.success('Interview scheduled successfully and invitation sent.');
    } else if (!c.email) {
      toast.info('Interview scheduled — no candidate email on file, so no invitation was sent.');
    } else if (emailStatus === 'Failed') {
      toast.info('Interview scheduled, but the invitation email could not be sent.');
    } else {
      toast.success('Interview scheduled successfully.');
    }
  };

  return (
    <InterviewSchedulerContext.Provider value={{ openInterviewSchedule }}>
      {children}
      {pending && (
        <InterviewScheduleModal
          candidate={pending}
          busyInterviews={busyInterviews}
          onConfirm={confirm}
          onClose={() => setPending(null)}
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
