'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate, Interview } from '@/types';
import { repositories } from '@/lib/api/repositories';
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
    }: {
      interviewId: string;
      recommendation: string;
      comments: string;
    }) => {
      const list = qc.getQueryData<Interview[]>(qk.interviews.all) ?? [];
      const target = list.find(i => i.id === interviewId);
      if (!target) return;
      const updated = applyGrading(target, recommendation, comments);
      await repositories.interviews.update(interviewId, updated);
      return updated;
    },
    ...optimisticOptions<{ interviewId: string; recommendation: string; comments: string }, Interview>(
      qc,
      qk.interviews.all,
      ({ interviewId, recommendation, comments }) =>
        prev =>
          prev.map(i => (i.id === interviewId ? applyGrading(i, recommendation, comments) : i)),
    ),
  });

  const schedule = useMutation({
    mutationFn: async ({ candidate, input }: { candidate: Candidate; input: ScheduleInput }) => {
      const interview = buildScheduledInterview(candidate, input);
      await repositories.interviews.create(interview);
      await repositories.sentEmails.create(buildInterviewInviteEmail(candidate, input.round));
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
