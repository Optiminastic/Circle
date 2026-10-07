'use client';

import React, { useMemo } from 'react';
import { Select } from '@/components/Select';
import { useEmployees } from '@/features/employees/hooks';

interface ManagerSelectProps {
  /** The employee being edited - never offered as their own manager. */
  employeeId?: string;
  managerId?: string;
  /** The stored manager name; shown for older records that only have text. */
  managerName: string;
  onChange: (manager: { id: string | undefined; name: string }) => void;
  className?: string;
}

/**
 * Reporting-manager picker. Stores the manager's employee code alongside their
 * name, so the reporting line can reach other systems (Avora uses it for
 * approvals) - a typed name could never be matched reliably.
 */
export function ManagerSelect({
  employeeId,
  managerId,
  managerName,
  onChange,
  className,
}: ManagerSelectProps) {
  const { data: employees = [] } = useEmployees();
  const options = useMemo(
    () =>
      employees
        .filter(e => e.id !== employeeId && e.status !== 'Offboarded')
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [employees, employeeId],
  );
  // An older record holds only a typed name: show it until a real person is picked.
  const legacyName = !managerId && managerName && managerName !== '—' ? managerName : '';

  return (
    <Select
      className={className}
      value={managerId ?? ''}
      onChange={e => {
        const picked = options.find(o => o.id === e.target.value);
        onChange({ id: picked?.id, name: picked?.fullName ?? '' });
      }}
    >
      <option value="">{legacyName ? `${legacyName} (pick to link)` : 'No manager'}</option>
      {options.map(e => (
        <option key={e.id} value={e.id}>
          {e.fullName} · {e.role}
        </option>
      ))}
    </Select>
  );
}
