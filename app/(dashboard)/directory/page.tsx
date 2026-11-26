'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeDirectoryView } from '@/components/SubViews';
import { PageLoading } from '@/components/PageLoading';
import { useEmployeeMutations } from '@/features/employees/hooks';

export default function DirectoryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DirectoryPageInner />
    </Suspense>
  );
}

// Filters/pagination read the URL via `useUrlState` (useSearchParams), which
// Next.js requires a Suspense boundary around. The employee list itself is
// now fetched by EmployeeDirectoryView (server-side pagination/search/
// filter), not here - see docs/PERFORMANCE_IMPLEMENTATION_LOG.md's
// pagination-migration entry.
function DirectoryPageInner() {
  const router = useRouter();
  const { create, update, remove } = useEmployeeMutations();

  return (
    <EmployeeDirectoryView
      onSelectEmployee={id => router.push(`/employees/${id}`)}
      onUpdateEmployee={updated => update.mutate(updated)}
      onAddEmployee={employee => create.mutate(employee)}
      onDeleteEmployees={ids => ids.forEach(id => remove.mutate(id))}
    />
  );
}
