'use client';

import { Suspense } from 'react';
import { JobListView } from '@/components/JobListView';
import { PageLoading } from '@/components/PageLoading';
import { useJobMutations } from '@/features/jobs/hooks';

export default function JobsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <JobsPageInner />
    </Suspense>
  );
}

// Filters/pagination read the URL via `useUrlState` (useSearchParams), which
// Next.js requires a Suspense boundary around. The job list itself (and its
// applicant counts, server-computed from a COUNT query rather than the full
// candidates table) is now fetched by JobListView - see
// docs/PERFORMANCE_IMPLEMENTATION_LOG.md's pagination-migration entry.
function JobsPageInner() {
  const { create, update, setStatus, remove } = useJobMutations();

  return (
    <JobListView
      onCreateJob={job => create.mutate(job)}
      onUpdateJob={job => update.mutate(job)}
      onSetStatus={(id, status) => setStatus.mutate({ id, status })}
      onDeleteJob={id => remove.mutate(id)}
    />
  );
}
