'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { CandidateListView } from '@/components/CandidateListView';
import { PageLoading } from '@/components/PageLoading';
import { QueryError } from '@/components/ui/query-error';
import { useScheduler } from '@/store/schedule-store';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';

export default function CandidatesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CandidatesPageInner />
    </Suspense>
  );
}

// Filters/pagination read the URL via `useUrlState` (useSearchParams), which
// Next.js requires a Suspense boundary around.
function CandidatesPageInner() {
  const router = useRouter();
  const { openSchedule } = useScheduler();
  const { data: candidates = [], isLoading, isError, refetch, isFetching } = useCandidates();
  const { create, update, remove, setFit } = useCandidateMutations();

  // The Suspense boundary above only covers `useSearchParams`, which resolves
  // at once - it never waited for the candidates themselves. Without this the
  // list renders empty first, so every visit opened on "No candidates yet"
  // before the real rows replaced it.
  if (isLoading) return <PageLoading />;
  if (isError)
    return (
      <QueryError
        title="Could not load candidates"
        description="The candidate list could not be fetched. Nothing has been lost - this is a problem reaching the server."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );

  return (
    <CandidateListView
      candidates={candidates}
      onSelectCandidate={id => router.push(`/candidates/${id}`)}
      onAddCandidate={candidate => create.mutate(candidate)}
      onUpdateCandidate={candidate => update.mutate(candidate)}
      onDeleteCandidate={id => remove.mutate(id)}
      onShortlistCandidate={(id, name) => openSchedule(id, name, 'HR Call')}
      onSetFit={(id, rating) => setFit.mutate({ id, rating })}
    />
  );
}
