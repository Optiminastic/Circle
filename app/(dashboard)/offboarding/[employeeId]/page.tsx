'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { OffboardingDetail } from '@/components/OffboardingDetail';
import { PageLoading } from '@/components/PageLoading';
import {
  useOffboarding,
  useToggleExitTask,
  useToggleDeliverable,
  useConfirmClearance,
} from '@/features/offboarding/hooks';

export default function OffboardingDetailPage() {
  const params = useParams<{ employeeId: string }>();
  const employeeId = params?.employeeId ?? '';

  const { data: offboarding = [], isLoading } = useOffboarding();
  const toggle = useToggleExitTask();
  const toggleDeliverable = useToggleDeliverable();
  const confirm = useConfirmClearance();

  if (isLoading) return <PageLoading />;

  const workflow = offboarding.find(o => o.employeeId === employeeId);

  if (!workflow) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D7DAE0] bg-[#FFFFFF] px-6 py-16 text-center text-xs">
        <p className="text-sm font-bold text-gray-700">Exit case not found</p>
        <p className="mt-1 text-[11px] text-gray-500">It may have been completed already.</p>
        <Link
          href="/offboarding"
          className="mt-3 inline-block text-xs font-semibold text-accent-600 hover:underline"
        >
          ← Back to exit cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
          {workflow.employeeName}
        </h2>
        <p className="text-[11px] text-gray-500">Exit workflow · {workflow.status}</p>
      </div>
      <OffboardingDetail
        workflow={workflow}
        onToggleExitTask={(empId, taskId) => toggle.mutate({ empId, taskId })}
        onToggleDeliverable={(empId, deliverableId) =>
          toggleDeliverable.mutate({ empId, deliverableId })
        }
        onConfirmClearance={empId => confirm.mutate(empId)}
      />
    </div>
  );
}
