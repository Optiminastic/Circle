'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate, Interview } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { pushCalendarEvent } from '@/lib/api/calendar';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';
import {
  applyGrading,
  buildInterviewInviteEmail,
  buildScheduledInterview,
  ScheduleInput,
} from '@/services/interview.service';

export function useInterviews() {
  return useQuery({ queryKey: qk.interviews.all, queryFn: () => repositories.interviews.list() });
}

export function useInterviewMutations() {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: (interview: Interview) => repositories.interviews.create(interview),
    ...optimisticOptions<Interview, Interview>(qc, qk.interviews.all, i => listOps.prepend(i)),
  });

  const grade = useMutation({
    mutationFn: async ({
      interviewId,
      recommendation,
      comments,
      summary,
    }: {
      interviewId: string;
      recommendation: string;
      comments: string;
      summary?: string;
    }) => {
      const list = qc.getQueryData<Interview[]>(qk.interviews.all) ?? [];
      const target = list.find(i => i.id === interviewId);
      if (!target) return;
      const updated = applyGrading(target, recommendation, comments, summary);
      await repositories.interviews.update(interviewId, updated);
      return updated;
    },
    ...optimisticOptions<
      { interviewId: string; recommendation: string; comments: string; summary?: string },
      Interview
    >(
      qc,
      qk.interviews.all,
      ({ interviewId, recommendation, comments, summary }) =>
        prev =>
          prev.map(i =>
            i.id === interviewId ? applyGrading(i, recommendation, comments, summary) : i,
          ),
    ),
  });

  const schedule = useMutation({
    mutationFn: async ({ candidate, input }: { candidate: Candidate; input: ScheduleInput }) => {
      const interview = buildScheduledInterview(candidate, input);
      await repositories.interviews.create(interview);
      await repositories.sentEmails.create(buildInterviewInviteEmail(candidate, input.round));

      // Best-effort push to the shared Google Calendar — non-critical.
      pushCalendarEvent({
        appEventId: interview.id,
        type: 'Interview',
        title: `${interview.interviewRound} · ${interview.candidateName}`,
        dateTimeIso: interview.dateTime,
        durationMin: interview.durationMinutes,
        notes: interview.interviewerName ? `Interviewer: ${interview.interviewerName}` : undefined,
        attendeeEmail: candidate.email || undefined,
      }).catch(() => {
        /* calendar sync is non-critical */
      });

      return interview;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.interviews.all });
      qc.invalidateQueries({ queryKey: qk.sentEmails.all });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => repositories.interviews.remove(id),
    ...optimisticOptions<string, Interview>(qc, qk.interviews.all, id =>
      listOps.removeBy(i => i.id === id),
    ),
  });

  return { add, grade, schedule, remove };
}
