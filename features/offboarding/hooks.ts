'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetRecord, Employee, OffboardingWorkflow } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { optimisticOptions } from '@/lib/query/mutations';
import { buildOffboardingWorkflow, toggleDeliverable, toggleExitTask } from '@/services/offboarding.service';
import { suspendAllCredentials } from '@/services/employee.service';

export function useOffboarding() {
  return useQuery({ queryKey: qk.offboarding.all, queryFn: () => repositories.offboarding.list() });
}

export function useToggleExitTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ empId, taskId }: { empId: string; taskId: string }) => {
      const list = qc.getQueryData<OffboardingWorkflow[]>(qk.offboarding.all) ?? [];
      const target = list.find(o => o.employeeId === empId);
      if (!target) return;
      await repositories.offboarding.update(empId, toggleExitTask(target, taskId));
    },
    ...optimisticOptions<{ empId: string; taskId: string }, OffboardingWorkflow>(
      qc,
      qk.offboarding.all,
      ({ empId, taskId }) =>
        prev =>
          prev.map(o => (o.employeeId === empId ? toggleExitTask(o, taskId) : o)),
    ),
  });
}

export function useToggleDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ empId, deliverableId }: { empId: string; deliverableId: string }) => {
      const list = qc.getQueryData<OffboardingWorkflow[]>(qk.offboarding.all) ?? [];
      const target = list.find(o => o.employeeId === empId);
      if (!target) return;
      await repositories.offboarding.update(empId, toggleDeliverable(target, deliverableId));
    },
    ...optimisticOptions<{ empId: string; deliverableId: string }, OffboardingWorkflow>(
      qc,
      qk.offboarding.all,
      ({ empId, deliverableId }) =>
        prev => prev.map(o => (o.employeeId === empId ? toggleDeliverable(o, deliverableId) : o)),
    ),
  });
}

export function useInitiateOffboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      empId,
      reason,
      initiatedDate,
      noticeDays,
    }: {
      empId: string;
      reason: string;
      initiatedDate?: string;
      noticeDays?: number;
    }) => {
      const employees = qc.getQueryData<Employee[]>(qk.employees.all) ?? [];
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;
      await repositories.offboarding.create(
        buildOffboardingWorkflow(emp, reason, { initiatedDate, noticeDays }),
      );
      await repositories.employees.patch(empId, { status: 'On Leave' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.offboarding.all });
      qc.invalidateQueries({ queryKey: qk.employees.all });
    },
  });
}

export function useConfirmClearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (empId: string) => {
      await repositories.offboarding.patch(empId, { status: 'Completed' });

      const employees = qc.getQueryData<Employee[]>(qk.employees.all) ?? [];
      const emp = employees.find(e => e.id === empId);
      if (emp) await repositories.employees.update(empId, suspendAllCredentials(emp));

      const assets = qc.getQueryData<AssetRecord[]>(qk.assets.all) ?? [];
      const affected = assets.filter(a => a.assignedToEmployeeId === empId);
      await Promise.all(
        affected.map(a =>
          repositories.assets.update(a.id, {
            ...a,
            status: 'Available',
            assignedToEmployeeId: undefined,
            assignedToEmployeeName: undefined,
          } as AssetRecord),
        ),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.offboarding.all });
      qc.invalidateQueries({ queryKey: qk.employees.all });
      qc.invalidateQueries({ queryKey: qk.assets.all });
    },
  });
}
