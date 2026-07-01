'use client';

import { useRouter } from 'next/navigation';
import { CandidateListView } from '@/components/CandidateListView';
import { useScheduler } from '@/store/schedule-store';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';

export default function CandidatesPage() {
  const router = useRouter();
  const { openSchedule } = useScheduler();
  const { data: candidates = [] } = useCandidates();
  const { create, remove, setFit } = useCandidateMutations();

  return (
    <CandidateListView
      persistKey="candidates"
      candidates={candidates}
      onSelectCandidate={id => router.push(`/candidates/${id}`)}
      onAddCandidate={candidate => create.mutate(candidate)}
      onDeleteCandidate={id => remove.mutate(id)}
      onShortlistCandidate={(id, name) => openSchedule(id, name, 'HR Call')}
      onSetFit={(id, rating) => setFit.mutate({ id, rating })}
    />
  );
}
