'use client';

import { IntroductoryCallsView } from '@/components/SubViews';
import { useUiStore } from '@/store/ui-store';
import { useScheduler } from '@/store/schedule-store';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';

export default function HrCallsPage() {
  const { setSelectedCandidateId } = useUiStore();
  const { openSchedule } = useScheduler();
  const { data: candidates = [] } = useCandidates();
  const { update, remove } = useCandidateMutations();

  return (
    <IntroductoryCallsView
      candidates={candidates}
      onSelectCandidate={setSelectedCandidateId}
      onUpdateCandidate={updated => update.mutate(updated)}
      onShortlistCandidate={(id, name) => openSchedule(id, name, 'IQ Test')}
      onDeleteCandidate={id => remove.mutate(id)}
    />
  );
}
