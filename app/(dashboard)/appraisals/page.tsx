'use client';

import { Suspense } from 'react';
import { AppraisalsView } from '@/components/SubViews';
import { PageLoading } from '@/components/PageLoading';
import { useEmployees, useEmployeeMutations } from '@/features/employees/hooks';

export default function AppraisalsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AppraisalsPageInner />
    </Suspense>
  );
}

// The selected-employee filter reads the URL via `useUrlState`
// (useSearchParams), which Next.js requires a Suspense boundary around.
function AppraisalsPageInner() {
  const { data: employees = [] } = useEmployees();
  const { saveAppraisal } = useEmployeeMutations();
  return <AppraisalsView employees={employees} onSaveReview={review => saveAppraisal.mutate(review)} />;
}
