'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeDirectoryView } from '@/components/SubViews';
import { PageLoading } from '@/components/PageLoading';
import { QueryError } from '@/components/ui/query-error';
import { useEmployees, useEmployeeMutations } from '@/features/employees/hooks';

export default function DirectoryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DirectoryPageInner />
    </Suspense>
  );
}

// Filters/pagination read the URL via `useUrlState` (useSearchParams), which
// Next.js requires a Suspense boundary around.
function DirectoryPageInner() {
  const router = useRouter();
  const { data: employees = [], isLoading, isError, refetch, isFetching } = useEmployees();
  const { create, update, remove } = useEmployeeMutations();

  // As on the candidates page: the Suspense fallback is for `useSearchParams`,
  // not for the data, so without this the directory flashes empty on load.
  if (isLoading) return <PageLoading />;
  if (isError)
    return (
      <QueryError
        title="Could not load the directory"
        description="The employee list could not be fetched. Nothing has been lost - this is a problem reaching the server."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );

  return (
    <EmployeeDirectoryView
      employees={employees}
      onSelectEmployee={id => router.push(`/employees/${id}`)}
      onUpdateEmployee={updated => update.mutate(updated)}
      onAddEmployee={employee => create.mutate(employee)}
      onDeleteEmployees={ids => ids.forEach(id => remove.mutate(id))}
    />
  );
}
