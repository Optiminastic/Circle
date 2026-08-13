'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Candidate, CandidateStatus, ScheduleEvent, ScheduleType, TestInvite } from '@/types';
import { useSchedules, useScheduleMutations } from '@/features/schedule/hooks';
import { useInterviews } from '@/features/interviews/hooks';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';
import { ScheduleModal, BusySlot } from '@/components/ScheduleModal';
import { useToast } from '@/components/Toaster';
import { sendScheduleEmail, sendTestEmail } from '@/lib/api/notifications';
import { pushCalendarEvent } from '@/lib/api/calendar';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { IQ_DURATION_MIN, ASSESSMENT_DURATION_MIN } from '@/data/test-banks';
import { randomId, randomToken, nowISO } from '@/lib/utils';

interface Pending {
  candidateId: string;
  candidateName: string;
  defaultType: ScheduleType;
}

interface SchedulerApi {
  /** Open the scheduling dialog; on confirm the candidate is shortlisted + an event is created. */
  openSchedule: (candidateId: string, candidateName: string, defaultType?: ScheduleType) => void;
}

const SchedulerContext = createContext<SchedulerApi | null>(null);

const SLOT_MIN = 45;

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);
  const { data: schedules = [] } = useSchedules();
  const { data: interviews = [] } = useInterviews();
  const { data: candidates = [] } = useCandidates();
  const { create } = useScheduleMutations();
  const { move } = useCandidateMutations();

  // Existing booked slots (planned schedules + interviews) so the dialog can
  // prevent overlapping bookings.
  const busySlots: BusySlot[] = useMemo(() => {
    const slots: BusySlot[] = [];
    for (const s of schedules) {
      if (s.status === 'Cancelled') continue;
      const start = new Date(s.dateTime).getTime();
      if (Number.isNaN(start)) continue;
      slots.push({ start, end: start + SLOT_MIN * 60_000, label: `${s.type} · ${s.candidateName}` });
    }
    for (const iv of interviews) {
      const start = new Date(iv.dateTime).getTime();
      if (Number.isNaN(start)) continue;
      slots.push({
        start,
        end: start + (iv.durationMinutes || SLOT_MIN) * 60_000,
        label: `${iv.interviewRound} · ${iv.candidateName}`,
      });
    }
    return slots;
  }, [schedules, interviews]);

  const openSchedule = (
    candidateId: string,
    candidateName: string,
    defaultType: ScheduleType = 'HR Call',
  ) => setPending({ candidateId, candidateName, defaultType });

  const confirm = async ({
    type,
    dateTime,
    durationMin,
    notes,
  }: {
    type: ScheduleType;
    dateTime: string;
    durationMin: number;
    notes: string;
  }) => {
    if (!pending) return;
    const p = pending; // capture — setPending(null) runs before async work below
    const event: ScheduleEvent = {
      id: randomId('SCH'),
      candidateId: p.candidateId,
      candidateName: p.candidateName,
      type,
      title: `${type} · ${p.candidateName}`,
      dateTime,
      notes,
      status: 'Scheduled',
      createdAt: nowISO(),
    };
    create.mutate(event);
    // Advance the candidate to the stage that matches the event so it surfaces
    // in the right view — an HR Call moves them into the HR Calls manager, while
    // the other rounds keep them in the shortlisted pool.
    const nextStatus: CandidateStatus = type === 'HR Call' ? 'Moved to HR Call' : 'Shortlisted';
    move.mutate({ id: p.candidateId, status: nextStatus });
    setPending(null);

    // Best-effort candidate notification — never blocks/undoes the schedule.
    let candidate: Candidate | undefined = candidates.find(c => c.id === p.candidateId);
    if (!candidate?.email) {
      try {
        candidate = await repositories.candidates.get(p.candidateId);
      } catch {
        /* fall through to the no-email path */
      }
    }
    const email = candidate?.email ?? '';

    // Best-effort push to the shared Google Calendar — never blocks/undoes the
    // schedule (mirrors the email sends). No-ops if Google isn't configured.
    pushCalendarEvent({
      appEventId: event.id,
      type,
      title: event.title,
      dateTimeIso: dateTime,
      durationMin,
      notes: notes || undefined,
      attendeeEmail: email || undefined,
    }).catch(() => {
      /* calendar sync is non-critical */
    });

    if (!email) {
      toast.info('Scheduled, but no email on file — candidate not notified.');
      return;
    }

    const emailToast = (res: { sent: boolean; reason?: string }, successMsg: string) => {
      if (res.sent) toast.success(successMsg);
      else if (res.reason === 'not_configured')
        toast.info('Scheduled. Email not sent — SMTP is not configured yet.');
      else toast.info('Scheduled, but the candidate was not emailed.');
    };

    // Log every send so the pipeline step badges can count "times emailed".
    const logSentEmail = (templateTitle: string, subject: string) => {
      repositories.sentEmails
        .create({
          id: randomId('EML'),
          recipientName: p.candidateName,
          recipientEmail: email,
          templateTitle,
          subject,
          dateSent: nowISO(),
          status: 'Sent',
          relatedEntity: p.candidateName,
        })
        .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
        .catch(() => {});
    };

    const position = candidate?.appliedRole || candidate?.department || 'the role';
    const department = candidate?.department || 'General';

    // Every round is an in-office appointment (HR Call is a phone call; IQ Test
    // and the role Assessment are online MCQ sessions taken at the office).
    sendScheduleEmail({
      to: email,
      candidateName: p.candidateName,
      type,
      dateTimeIso: dateTime,
      notes: notes || undefined,
    })
      .then(res => emailToast(res, `Appointment emailed to ${p.candidateName}.`))
      .catch(() => toast.error('Scheduled, but sending the appointment email failed.'));

    // IQ Test: the candidate takes the online MCQ test at the office during the
    // scheduled session (preceded by the in-office appointment email above).
    if (type === 'IQ Test') {
      const invite: TestInvite = {
        id: randomToken('TIV'),
        kind: 'iq',
        candidateId: p.candidateId,
        candidateName: p.candidateName,
        email,
        position,
        department,
        jobId: candidate?.jobId,
        durationMin: IQ_DURATION_MIN,
        scheduledFor: dateTime,
        status: 'Pending',
        createdAt: nowISO(),
      };
      try {
        await repositories.testInvites.create(invite);
      } catch {
        toast.error('Scheduled, but creating the test link failed — try rescheduling.');
        return;
      }
      sendTestEmail({
        to: email,
        candidateName: p.candidateName,
        template: 'iq_invite',
        testUrl: `${window.location.origin}/test/${invite.id}`,
        position,
        durationMin: IQ_DURATION_MIN,
        dateTimeIso: dateTime,
      })
        .then(res => {
          emailToast(res, `Test link emailed to ${p.candidateName}.`);
          if (res.sent) logSentEmail('IQ test invite', 'Your Optiminastic IQ Test — secure test link inside');
        })
        .catch(() => toast.error('Scheduled, but sending the test link failed.'));
    }

    // Assessment round: a role/position-specific online MCQ the candidate takes
    // at the scheduled session — auto-scored, no take-home upload.
    if (type === 'Assessment') {
      const invite: TestInvite = {
        id: randomToken('TIV'),
        kind: 'assessment',
        candidateId: p.candidateId,
        candidateName: p.candidateName,
        email,
        position,
        department,
        jobId: candidate?.jobId,
        durationMin: ASSESSMENT_DURATION_MIN,
        scheduledFor: dateTime,
        status: 'Pending',
        createdAt: nowISO(),
      };
      try {
        await repositories.testInvites.create(invite);
      } catch {
        toast.error('Scheduled, but creating the assessment failed — try again.');
        return;
      }
      sendTestEmail({
        to: email,
        candidateName: p.candidateName,
        template: 'assessment_invite',
        testUrl: `${window.location.origin}/test/${invite.id}`,
        position,
        durationMin: ASSESSMENT_DURATION_MIN,
        dateTimeIso: dateTime,
      })
        .then(res => {
          emailToast(res, `Assessment link emailed to ${p.candidateName}.`);
          if (res.sent)
            logSentEmail('Assessment invite', 'Your Optiminastic assessment — secure test link inside');
        })
        .catch(() => toast.error('Scheduled, but sending the assessment failed.'));
    }
  };

  return (
    <SchedulerContext.Provider value={{ openSchedule }}>
      {children}
      {pending && (
        <ScheduleModal
          candidateName={pending.candidateName}
          defaultType={pending.defaultType}
          busySlots={busySlots}
          onConfirm={confirm}
          onClose={() => setPending(null)}
        />
      )}
    </SchedulerContext.Provider>
  );
}

export function useScheduler(): SchedulerApi {
  const ctx = useContext(SchedulerContext);
  if (!ctx) throw new Error('useScheduler must be used within a ScheduleProvider');
  return ctx;
}
