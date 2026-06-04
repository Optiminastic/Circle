'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IQTest } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';

export function useIqTests() {
  return useQuery({ queryKey: qk.iqTests.all, queryFn: () => repositories.iqTests.list() });
}

export function useIqTestMutations() {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => repositories.iqTests.remove(id),
    ...optimisticOptions<string, IQTest>(qc, qk.iqTests.all, id => listOps.removeBy(t => t.id === id)),
  });
  return { remove };
}

export function useAssignments() {
  return useQuery({ queryKey: qk.assignments.all, queryFn: () => repositories.assignments.list() });
}
