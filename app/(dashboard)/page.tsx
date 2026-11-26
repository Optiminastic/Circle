'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardView } from '@/components/DashboardView';
import { PageLoading } from '@/components/PageLoading';
import { useCandidatesPage } from '@/features/candidates/hooks';
import { useDashboardOverview, useUpcomingInterviews } from '@/features/dashboard/hooks';

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardPageInner />
    </Suspense>
  );
}

const NEW_CANDIDATES_LIMIT = 10;

// Embeds CandidateListView (New Candidates panel), which calls
// `useSearchParams()` internally even with its filter UI hidden — Next.js
// requires a Suspense boundary around any use of it.
//
// Replaces what used to be 7 full-table fetches (candidates, interviews,
// iqTests, assignments, jobs, employees, offboarding — the last two of
// which DashboardView never even read) with 3 small, bounded requests: the
// KPI aggregates, the next few upcoming interviews (already joined with
// their candidates server-side), and the newest 10 candidates (already
// sorted server-side). See docs/PERFORMANCE_AUDIT.md P0-3.
function DashboardPageInner() {
  const router = useRouter();
  const overview = useDashboardOverview();
  const upcoming = useUpcomingInterviews(6);
  const newCandidates = useCandidatesPage({
    page: 1,
    limit: NEW_CANDIDATES_LIMIT,
    sortBy: 'appliedAt',
    sortOrder: 'desc',
  });

  // Only `stats` (the fastest of the three - see
  // docs/PRODUCTION_PERFORMANCE_FIX_REPORT.md) gates the whole page; the
  // other two render their own skeleton via DashboardView/NewCandidatesPanel
  // instead of blocking everything behind one combined flag.
  if (overview.isLoading || !overview.data) return <PageLoading />;

  return (
    <DashboardView
      stats={overview.data}
      upcomingInterviews={upcoming.data ?? []}
      upcomingInterviewsLoading={upcoming.isLoading}
      newCandidates={newCandidates.data?.data ?? []}
      newCandidatesLoading={newCandidates.isLoading}
      onSelectCandidate={id => router.push(`/candidates/${id}`)}
    />
  );
}
