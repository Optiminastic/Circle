'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScheduleEvent } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';

export function useSchedules() {
  return useQuery({ queryKey: qk.schedules.all, queryFn: () => repositories.schedules.list() });
}

export function useScheduleMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (event: ScheduleEvent) => repositories.schedules.create(event),
    ...optimisticOptions<ScheduleEvent, ScheduleEvent>(qc, qk.schedules.all, e =>
      listOps.prepend(e),
    ),
  });

  const remove = useMutation({
    mutationFn: (id: string) => repositories.schedules.remove(id),
    ...optimisticOptions<string, ScheduleEvent>(qc, qk.schedules.all, id =>
      listOps.removeBy(e => e.id === id),
    ),
  });

  return { create, remove };
}
