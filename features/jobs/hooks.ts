'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Candidate, Job } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { PageParams } from '@/lib/api/resource-repository';
import { JobSearchParams, searchJobs } from '@/lib/api/jobs-search';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';
import { revalidatePublicJobAction } from '@/lib/actions/jobs';

// Best-effort — a revalidation failure must never block the save itself.
const revalidatePublicJob = (jobId?: string) => revalidatePublicJobAction(jobId).catch(() => {});

/** All job postings (used by the HR dashboard). */
export function useJobs() {
  return useQuery({ queryKey: qk.jobs.all, queryFn: () => repositories.jobs.list() });
}

/** Database-side paginated jobs — see docs/PERFORMANCE_AUDIT.md P0-2 and
 *  useCandidatesPage's doc comment for the full rationale. */
export function useJobsPage(params: PageParams) {
  return useQuery({
    queryKey: qk.jobs.page(params),
    queryFn: ({ signal }) => repositories.jobs.listPaginated(params, signal),
    placeholderData: keepPreviousData,
  });
}

/** Job postings list view (search/sort/pagination), including the two
 *  derived sort keys (applicant count, parsed salary) the generic paginated
 *  route can't express — see circle-be/app/services/job_search.py. */
export function useJobsSearch(params: JobSearchParams) {
  return useQuery({
    queryKey: qk.jobs.search(params),
    queryFn: ({ signal }) => searchJobs(params, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * The posting a candidate applied to, from whatever is already cached.
 *
 * Used when onboarding is created, to decide whether this is an internship.
 * Deliberately cache-only and best-effort: `jobId` is optional on a candidate
 * (direct adds have none), and a candidate whose posting cannot be found is a
 * full-time hire, which is what every record did before intern onboarding
 * existed. Never fetches, so it can be called inside a mutation without
 * putting a network round-trip in front of the write.
 */
export function jobForCandidate(
  qc: ReturnType<typeof useQueryClient>,
  candidate: Pick<Candidate, 'jobId'>,
): Job | undefined {
  if (!candidate.jobId) return undefined;
  const jobs = qc.getQueryData<Job[]>(qk.jobs.all) ?? [];
  return jobs.find(j => j.id === candidate.jobId) ?? qc.getQueryData<Job>(qk.jobs.detail(candidate.jobId));
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
    onSuccess: (_data, job) => revalidatePublicJob(job.id),
  });

  const update = useMutation({
    mutationFn: (job: Job) => repositories.jobs.update(job.id, job),
    ...optimisticOptions<Job, Job>(qc, qk.jobs.all, job =>
      listOps.replaceBy(j => j.id === job.id, job),
    ),
    onSuccess: (_data, job) => revalidatePublicJob(job.id),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Job['status'] }) =>
      repositories.jobs.patch(id, { status }),
    ...optimisticOptions<{ id: string; status: Job['status'] }, Job>(
      qc,
      qk.jobs.all,
      ({ id, status }) => listOps.mergeBy<Job>(j => j.id === id, { status }),
    ),
    onSuccess: (_data, vars) => revalidatePublicJob(vars.id),
  });

  const remove = useMutation({
    mutationFn: (id: string) => repositories.jobs.remove(id),
    ...optimisticOptions<string, Job>(qc, qk.jobs.all, id => listOps.removeBy(j => j.id === id)),
    onSuccess: (_data, id) => revalidatePublicJob(id),
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
