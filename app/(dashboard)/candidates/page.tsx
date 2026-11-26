'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { CandidateListView } from '@/components/CandidateListView';
import { PageLoading } from '@/components/PageLoading';
import { useScheduler } from '@/store/schedule-store';
import { useCandidateMutations } from '@/features/candidates/hooks';

export default function CandidatesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CandidatesPageInner />
    </Suspense>
  );
}

// Filters/pagination read the URL via `useUrlState` (useSearchParams), which
// Next.js requires a Suspense boundary around. The candidate list itself
// (search/filter/sort/pagination, all computed server-side) is now fetched
// by CandidateListView - see docs/PERFORMANCE_IMPLEMENTATION_LOG.md's
// pagination-migration entry.
function CandidatesPageInner() {
  const router = useRouter();
  const { openSchedule } = useScheduler();
  const { create, update, remove, setFit } = useCandidateMutations();

  return (
    <CandidateListView
      onSelectCandidate={id => router.push(`/candidates/${id}`)}
      onAddCandidate={candidate => create.mutate(candidate)}
      onUpdateCandidate={candidate => update.mutate(candidate)}
      onDeleteCandidate={id => remove.mutate(id)}
      onShortlistCandidate={(id, name) => openSchedule(id, name, 'HR Call')}
      onSetFit={(id, rating) => setFit.mutate({ id, rating })}
    />
  );
}
