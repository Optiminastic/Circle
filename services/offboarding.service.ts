import { Employee, OffboardingWorkflow } from '@/types';
import { randomId, todayISO } from '@/lib/utils';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Default handover artifacts the exiting employee must submit. */
export function buildExitDeliverables(): NonNullable<OffboardingWorkflow['deliverables']> {
  return [
    { id: randomId('DLV', 10000, 0), title: 'Project handover document submitted', isSubmitted: false, owner: 'Reporting Manager' },
    { id: randomId('DLV', 10000, 0), title: 'Source code & repository ownership transferred', isSubmitted: false, owner: 'Engineering Lead' },
    { id: randomId('DLV', 10000, 0), title: 'Client & stakeholder contact list shared', isSubmitted: false, owner: 'Account Manager' },
    { id: randomId('DLV', 10000, 0), title: 'Pending tasks & status summary documented', isSubmitted: false, owner: 'Reporting Manager' },
    { id: randomId('DLV', 10000, 0), title: 'Knowledge-transfer session recording uploaded', isSubmitted: false, owner: 'HR Specialist' },
  ];
}

export function buildOffboardingWorkflow(
  employee: Employee,
  reason: string,
  opts?: { initiatedDate?: string; noticeDays?: number },
): OffboardingWorkflow {
  const initiatedDate = opts?.initiatedDate || todayISO();
  const start = new Date(initiatedDate);
  const lastWorkingDay = (
    Number.isNaN(start.getTime())
      ? new Date(Date.now() + THIRTY_DAYS_MS)
      : new Date(start.getTime() + (opts?.noticeDays ?? 30) * 24 * 60 * 60 * 1000)
  )
    .toISOString()
    .split('T')[0];

  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    triggerReason: reason as OffboardingWorkflow['triggerReason'],
    status: 'Notice Period Active',
    initiatedDate,
    lastWorkingDay,
    deliverables: buildExitDeliverables(),
    checklist: [
      {
        id: randomId('EX', 10000, 0),
        title: 'Collect physical resignation signed approvals',
        isChecked: true,
        category: 'Notice Period',
      },
      {
        id: randomId('EX', 10000, 0),
        title: 'Establish transition timelines and secure handovers',
        isChecked: false,
        category: 'Notice Period',
      },
      {
        id: randomId('EX', 10000, 0),
        title: 'Return company workstation access cards & desk assets',
        isChecked: false,
        category: 'Asset Return',
      },
      {
        id: randomId('EX', 10000, 0),
        title: 'Deactivate cloud logins and suspend AWS enterprise memberships',
        isChecked: false,
        category: 'Access Revocation',
      },
      {
        id: randomId('EX', 10000, 0),
        title: 'Finance final settlement calculation and tax releases',
        isChecked: false,
        category: 'Finance Clearance',
      },
    ],
  };
}

export function toggleExitTask(workflow: OffboardingWorkflow, taskId: string): OffboardingWorkflow {
  return {
    ...workflow,
    checklist: workflow.checklist.map(t => (t.id === taskId ? { ...t, isChecked: !t.isChecked } : t)),
  };
}

export function toggleDeliverable(workflow: OffboardingWorkflow, deliverableId: string): OffboardingWorkflow {
  return {
    ...workflow,
    deliverables: (workflow.deliverables || []).map(d =>
      d.id === deliverableId ? { ...d, isSubmitted: !d.isSubmitted } : d,
    ),
  };
}
