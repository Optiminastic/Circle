'use client';

import { useRouter } from 'next/navigation';
import { EmployeeDirectoryView } from '@/components/SubViews';
import { useEmployees, useEmployeeMutations } from '@/features/employees/hooks';

export default function DirectoryPage() {
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
