'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardView } from '@/components/DashboardView';
import { PageLoading } from '@/components/PageLoading';
import { useCandidates } from '@/features/candidates/hooks';
import { useInterviews } from '@/features/interviews/hooks';
import { useAssignments, useIqTests } from '@/features/assessments/hooks';
import { useJobs } from '@/features/jobs/hooks';
import { useEmployees } from '@/features/employees/hooks';
import { useOffboarding } from '@/features/offboarding/hooks';

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardPageInner />
    </Suspense>
  );
}

// Embeds CandidateListView (New Candidates panel), which calls
// `useSearchParams()` internally even with its filter UI hidden — Next.js
// requires a Suspense boundary around any use of it.
function DashboardPageInner() {
  const router = useRouter();
  const { data: candidates = [] } = useCandidates();
  const { data: interviews = [], isLoading: l1 } = useInterviews();
  const { data: iqTests = [], isLoading: l2 } = useIqTests();
  const { data: assignments = [], isLoading: l3 } = useAssignments();
  const { data: jobs = [] } = useJobs();
  const { data: employees = [] } = useEmployees();
  const { data: offboarding = [] } = useOffboarding();

  if (l1 || l2 || l3) return <PageLoading />;

  return (
    <DashboardView
      candidates={candidates}
      interviews={interviews}
      iqTests={iqTests}
      assignments={assignments}
      jobs={jobs}
      employees={employees}
      offboarding={offboarding}
      onSelectCandidate={id => router.push(`/candidates/${id}`)}
    />
  );
}
