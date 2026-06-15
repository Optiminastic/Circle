'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppraisalRecord, AssetRecord, Employee } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';
import { setCredentialStatus } from '@/services/employee.service';
import { resolveHr, type HrIdentity } from '@/lib/hr-identity';

export function useEmployees() {
  return useQuery({ queryKey: qk.employees.all, queryFn: () => repositories.employees.list() });
}

/**
 * The acting-HR identity resolved from the Employee Directory (the active
 * HR-department employee). Used wherever the system speaks/acts as HR — the
 * recruitment pipeline avatar and the candidate-facing email sign-offs.
 */
export function useHrIdentity(): HrIdentity {
  const { data: employees = [] } = useEmployees();
  return useMemo(() => resolveHr(employees), [employees]);
}

export function useAssets() {
  return useQuery({ queryKey: qk.assets.all, queryFn: () => repositories.assets.list() });
}

export function useEmployeeMutations() {
  const qc = useQueryClient();

  // Directly register an existing employee (e.g. staff hired before onboarding).
  const create = useMutation({
    mutationFn: (employee: Employee) => repositories.employees.create(employee),
    ...optimisticOptions<Employee, Employee>(qc, qk.employees.all, e => listOps.prepend(e)),
  });

  const update = useMutation({
    mutationFn: (employee: Employee) => repositories.employees.update(employee.id, employee),
    ...optimisticOptions<Employee, Employee>(qc, qk.employees.all, e =>
      listOps.replaceBy(x => x.id === e.id, e),
    ),
  });

  // Permanently remove an employee record from the directory.
  const remove = useMutation({
    mutationFn: (id: string) => repositories.employees.remove(id),
    ...optimisticOptions<string, Employee>(qc, qk.employees.all, id =>
      listOps.removeBy(x => x.id === id),
    ),
  });

  const updateCredential = useMutation({
    mutationFn: async ({ empId, credId, status }: { empId: string; credId: string; status: string }) => {
      const list = qc.getQueryData<Employee[]>(qk.employees.all) ?? [];
      const emp = list.find(e => e.id === empId);
      if (!emp) return;
      await repositories.employees.update(empId, setCredentialStatus(emp, credId, status));
    },
    ...optimisticOptions<{ empId: string; credId: string; status: string }, Employee>(
      qc,
      qk.employees.all,
      ({ empId, credId, status }) =>
        prev =>
          prev.map(e => (e.id === empId ? setCredentialStatus(e, credId, status) : e)),
    ),
  });

  const saveAppraisal = useMutation({
    mutationFn: async (review: AppraisalRecord) => {
      const list = qc.getQueryData<Employee[]>(qk.employees.all) ?? [];
      const emp = list.find(e => e.id === review.employeeId);
      if (!emp) return;
      await repositories.employees.update(emp.id, {
        ...emp,
        appraisalHistory: [review, ...(emp.appraisalHistory || [])],
      });
    },
    ...optimisticOptions<AppraisalRecord, Employee>(
      qc,
      qk.employees.all,
      review => prev =>
        prev.map(e =>
          e.id === review.employeeId
            ? { ...e, appraisalHistory: [review, ...(e.appraisalHistory || [])] }
            : e,
        ),
    ),
  });

  return { create, update, remove, updateCredential, saveAppraisal };
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (asset: AssetRecord) => repositories.assets.update(asset.id, asset),
    ...optimisticOptions<AssetRecord, AssetRecord>(
      qc,
      qk.assets.all,
      a => listOps.replaceBy(x => x.id === a.id, a),
      [qk.assets.all, qk.employees.all],
    ),
  });
}
