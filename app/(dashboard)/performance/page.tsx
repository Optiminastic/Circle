'use client';

import { Suspense } from 'react';
import { PerformanceTrackerView } from '@/components/PerformanceTrackerView';
import { PageLoading } from '@/components/PageLoading';
import { useEmployees } from '@/features/employees/hooks';

export default function PerformancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PerformancePageInner />
    </Suspense>
  );
}

// The period filter + pagination read the URL via `useUrlState`
// (useSearchParams), which Next.js requires a Suspense boundary around.
function PerformancePageInner() {
  const { data: employees = [] } = useEmployees();
  return <PerformanceTrackerView employees={employees} />;
}
