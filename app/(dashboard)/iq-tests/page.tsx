'use client';

import { IQTestAssignmentsView } from '@/components/SubViews';
import { useUiStore } from '@/store/ui-store';
import { useScheduler } from '@/store/schedule-store';
import { useAssignments, useIqTests, useIqTestMutations } from '@/features/assessments/hooks';

export default function IqTestsPage() {
  const { setSelectedCandidateId } = useUiStore();
  const { openSchedule } = useScheduler();
  const { data: iqTests = [] } = useIqTests();
  const { data: assignments = [] } = useAssignments();
  const { remove } = useIqTestMutations();

  return (
    <IQTestAssignmentsView
      iqTests={iqTests}
      assignments={assignments}
      onSelectCandidate={setSelectedCandidateId}
      onShortlistCandidate={(id, name) => openSchedule(id, name, 'Assessment')}
      onDeleteTest={id => remove.mutate(id)}
    />
  );
}
