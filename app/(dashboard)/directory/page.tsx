'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeDirectoryView } from '@/components/SubViews';
import { PageLoading } from '@/components/PageLoading';
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
  const { data: employees = [] } = useEmployees();
  const { create, update, remove } = useEmployeeMutations();

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
