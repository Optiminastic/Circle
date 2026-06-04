'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate, Job } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';

/** All job postings (used by the HR dashboard). */
export function useJobs() {
  return useQuery({ queryKey: qk.jobs.all, queryFn: () => repositories.jobs.list() });
}

/** A single job — backs the public posting page. */
export function useJob(id: string) {
  return useQuery({
    queryKey: qk.jobs.detail(id),
    queryFn: () => repositories.jobs.get(id),
    enabled: Boolean(id),
    retry: false,
  });
}

/** Create / update / delete a job posting (HR-only screens). */
export function useJobMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (job: Job) => repositories.jobs.create(job),
    ...optimisticOptions<Job, Job>(qc, qk.jobs.all, job => listOps.prepend(job)),
  });

  const update = useMutation({
    mutationFn: (job: Job) => repositories.jobs.update(job.id, job),
    ...optimisticOptions<Job, Job>(qc, qk.jobs.all, job =>
      listOps.replaceBy(j => j.id === job.id, job),
    ),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Job['status'] }) =>
      repositories.jobs.patch(id, { status }),
    ...optimisticOptions<{ id: string; status: Job['status'] }, Job>(
      qc,
      qk.jobs.all,
      ({ id, status }) => listOps.mergeBy<Job>(j => j.id === id, { status }),
    ),
  });

  const remove = useMutation({
    mutationFn: (id: string) => repositories.jobs.remove(id),
    ...optimisticOptions<string, Job>(qc, qk.jobs.all, id => listOps.removeBy(j => j.id === id)),
  });

  return { create, update, setStatus, remove };
}

/**
 * Public job application: persists the applicant straight into the candidates
 * table so they surface in the HR Candidates section automatically.
 */
export function useApplyToJob() {
  return useMutation({
    mutationFn: (candidate: Candidate) => repositories.candidates.create(candidate),
  });
}
