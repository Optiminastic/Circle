'use client';

import { JobListView } from '@/components/JobListView';
import { PageLoading } from '@/components/PageLoading';
import { useJobs, useJobMutations } from '@/features/jobs/hooks';
import { useCandidates } from '@/features/candidates/hooks';

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useJobs();
  const { data: candidates = [] } = useCandidates();
  const { create, update, setStatus, remove } = useJobMutations();

  if (isLoading) return <PageLoading />;

  // Applicants are candidates created via a public posting link (tagged with jobId).
  const applicantCounts = candidates.reduce<Record<string, number>>((acc, cand) => {
    if (cand.jobId) acc[cand.jobId] = (acc[cand.jobId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <JobListView
      jobs={jobs}
      applicantCounts={applicantCounts}
      onCreateJob={job => create.mutate(job)}
      onUpdateJob={job => update.mutate(job)}
      onSetStatus={(id, status) => setStatus.mutate({ id, status })}
      onDeleteJob={id => remove.mutate(id)}
    />
  );
}
