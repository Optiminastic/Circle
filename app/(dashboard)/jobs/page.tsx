'use client';

import { Suspense } from 'react';
import { JobListView } from '@/components/JobListView';
import { PageLoading } from '@/components/PageLoading';
import { QueryError } from '@/components/ui/query-error';
import { useJobs, useJobMutations } from '@/features/jobs/hooks';
import { useCandidates } from '@/features/candidates/hooks';

export default function JobsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <JobsPageInner />
    </Suspense>
  );
}

// Filters/pagination read the URL via `useUrlState` (useSearchParams), which
// Next.js requires a Suspense boundary around.
function JobsPageInner() {
  const { data: jobs = [], isLoading, isError, refetch, isFetching } = useJobs();
  const { data: candidates = [] } = useCandidates();
  const { create, update, setStatus, remove } = useJobMutations();

  if (isLoading) return <PageLoading />;
  // Without this a failed fetch fell through to JobListView's "No job postings
  // yet", which says the opposite of what happened and invites someone to
  // re-create postings that already exist.
  if (isError)
    return (
      <QueryError
        title="Could not load job postings"
        description="The job list could not be fetched. Your postings are safe - this is a problem reaching the server."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );

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
