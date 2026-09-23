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
    // The 16-step exit process, in the order HR runs it. Ids are stable slugs
    // (not randomId) so a step keeps its identity across records and can be
    // referenced from reports -- randomId draws without a uniqueness check and
    // would risk collisions within a single 16-item list.
    checklist: [
      {
        id: 'EX-resignation-received',
        title: 'Resignation received',
        detail: "Employee submits resignation through Avora and email.",
        isChecked: true,
        category: 'Notice Period',
      },
      {
        id: 'EX-resignation-acknowledgement',
        title: 'Resignation acknowledgement mail',
        detail: "HR acknowledges receipt of the resignation and initiates the exit process.",
        isChecked: false,
        category: 'Notice Period',
      },
      {
        id: 'EX-exit-discussion',
        title: 'Schedule employee connect / exit discussion',
        detail: "Schedule a meeting with the employee and HR to discuss the resignation and reason for leaving.",
        isChecked: false,
        category: 'Notice Period',
      },
      {
        id: 'EX-acceptance-manager',
        title: 'Resignation acceptance - Reporting Manager',
        detail: "Reporting Manager confirms acceptance of the resignation to HR.",
        isChecked: false,
        category: 'Notice Period',
      },
      {
        id: 'EX-acceptance-hr',
        title: 'Resignation acceptance - HR',
        detail: "HR formally accepts the resignation and confirms the last working day by email.",
        isChecked: false,
        category: 'Notice Period',
      },
      {
        id: 'EX-handover-transition',
        title: 'Handover & transition',
        detail: "Employee completes handover of responsibilities, documents, files, passwords/access information and ongoing tasks.",
        isChecked: false,
        category: 'Knowledge Transfer',
      },
      {
        id: 'EX-exit-feedback-form',
        title: 'Exit feedback form',
        detail: "The exit feedback form is shared with the employee.",
        isChecked: false,
        category: 'Knowledge Transfer',
      },
      {
        id: 'EX-exit-interview',
        title: 'Exit feedback / interview',
        detail: "HR conducts the exit interview before the last working day to understand their experience and discuss the feedback form.",
        isChecked: false,
        category: 'Knowledge Transfer',
      },
      {
        id: 'EX-exit-declaration',
        title: 'Employee exit declaration and clearance form',
        detail: "Exit declaration and clearance form shared with the employee for signature.",
        isChecked: false,
        category: 'Finance Clearance',
      },
      {
        id: 'EX-asset-return',
        title: 'Asset return',
        detail: "Ensure all company assets are returned - laptop, charger, access credentials or any other company property.",
        isChecked: false,
        category: 'Asset Return',
      },
      {
        id: 'EX-asset-verification',
        title: 'Asset verification',
        detail: "HR/Admin verifies the condition and completeness of all returned assets and records any pending items.",
        isChecked: false,
        category: 'Asset Return',
      },
      {
        id: 'EX-access-deactivation',
        title: 'Access deactivation',
        detail: "The employee's official email ID and other company system/access credentials are deactivated or transferred.",
        isChecked: false,
        category: 'Access Revocation',
      },
      {
        id: 'EX-platform-removal',
        title: 'Removal from internal platforms',
        detail: "Employee is removed from Circle and Avora, along with other internal communication/work platforms.",
        isChecked: false,
        category: 'Access Revocation',
      },
      {
        id: 'EX-full-and-final',
        title: 'Full & final settlement',
        detail: "Coordinate with Accounts to complete the employee's full & final settlement per company policy.",
        isChecked: false,
        category: 'Settlement',
      },
      {
        id: 'EX-relieving-letter',
        title: 'Relieving / experience letter',
        detail: "Draft the relieving/experience letter and send it to the employee's personal email ID.",
        isChecked: false,
        category: 'Settlement',
      },
      {
        id: 'EX-exit-closure',
        title: 'Exit closure',
        detail: "HR confirms all exit activities are complete and marks the exit process closed in the tracker.",
        isChecked: false,
        category: 'Settlement',
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
