'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { ScheduleEvent, ScheduleType } from '@/types';
import { useSchedules, useScheduleMutations } from '@/features/schedule/hooks';
import { useInterviews } from '@/features/interviews/hooks';
import { useCandidateMutations } from '@/features/candidates/hooks';
import { ScheduleModal, BusySlot } from '@/components/ScheduleModal';
import { randomId, nowISO } from '@/lib/utils';

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
  const [pending, setPending] = useState<Pending | null>(null);
  const { data: schedules = [] } = useSchedules();
  const { data: interviews = [] } = useInterviews();
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

  const confirm = ({
    type,
    dateTime,
    notes,
  }: {
    type: ScheduleType;
    dateTime: string;
    durationMin: number;
    notes: string;
  }) => {
    if (!pending) return;
    const event: ScheduleEvent = {
      id: randomId('SCH'),
      candidateId: pending.candidateId,
      candidateName: pending.candidateName,
      type,
      title: `${type} · ${pending.candidateName}`,
      dateTime,
      notes,
      status: 'Scheduled',
      createdAt: nowISO(),
    };
    create.mutate(event);
    move.mutate({ id: pending.candidateId, status: 'Shortlisted' });
    setPending(null);
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
