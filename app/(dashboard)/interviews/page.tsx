'use client';

import { InterviewsView } from '@/components/SubViews';
import { useUiStore } from '@/store/ui-store';
import { useScheduler } from '@/store/schedule-store';
import { useCandidates } from '@/features/candidates/hooks';
import { useInterviews, useInterviewMutations } from '@/features/interviews/hooks';

export default function InterviewsPage() {
  const { setSelectedCandidateId } = useUiStore();
  const { openSchedule } = useScheduler();
  const { data: interviews = [] } = useInterviews();
  const { data: candidates = [] } = useCandidates();
  const { add, remove } = useInterviewMutations();

  return (
    <InterviewsView
      interviews={interviews}
      candidates={candidates}
      onAddNewInterview={interview => add.mutate(interview)}
      onSelectCandidate={setSelectedCandidateId}
      onShortlistCandidate={(id, name) => openSchedule(id, name, 'Interview')}
      onDeleteInterview={id => remove.mutate(id)}
    />
  );
}
