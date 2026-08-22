'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/Select';
import { DatePicker } from '@/components/ui/date-picker';
import { Employee, OffboardingWorkflow } from '@/types';

interface Props {
  /** Already filtered to employees eligible for a new exit case (Active, no live case). */
  employees: Employee[];
  pending?: boolean;
  onSubmit: (vars: {
    empId: string;
    reason: OffboardingWorkflow['triggerReason'];
    initiatedDate: string;
    noticeDays: number;
  }) => void;
  onClose: () => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const selectCls = 'mt-0 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm';
const labelCls = 'text-[11px] font-medium text-gray-600';

/** Open a new exit case — pick the employee, reason, and notice period. Mirrors
 *  the "Start notice period" flow on the employee detail page, plus an employee
 *  picker since this is reachable straight from the Exit Cases list. */
export function AddExitCaseModal({ employees, pending, onSubmit, onClose }: Props) {
  const [empId, setEmpId] = useState('');
  const [reason, setReason] = useState<OffboardingWorkflow['triggerReason']>('Resignation');
  const [date, setDate] = useState(todayStr());
  const [noticeDays, setNoticeDays] = useState(30);

  const lastWorkingDay = (() => {
    const d = new Date(date || todayStr());
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (Number(noticeDays) || 0));
    return d.toISOString().split('T')[0];
  })();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId) return;
    onSubmit({ empId, reason, initiatedDate: date || todayStr(), noticeDays: Number(noticeDays) || 0 });
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open an exit case</DialogTitle>
          <DialogDescription>Start a notice period and clearance checklist for an employee.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <Label className={labelCls}>Employee *</Label>
            <Select value={empId} onChange={e => setEmpId(e.target.value)} className={selectCls}>
              <option value="">Select an employee…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.fullName} — {e.role}
                </option>
              ))}
            </Select>
            {employees.length === 0 && (
              <p className="text-[11px] text-gray-400">No active employees without a live exit case.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className={labelCls}>Reason</Label>
            <Select
              value={reason}
              onChange={e => setReason(e.target.value as OffboardingWorkflow['triggerReason'])}
              className={selectCls}
            >
              <option value="Resignation">Resignation</option>
              <option value="Termination">Termination</option>
              <option value="Contract completion">Contract completion</option>
              <option value="Mutual separation">Mutual separation</option>
              <option value="Role redundancy">Role redundancy</option>
              <option value="Absconding">Absconding</option>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className={labelCls}>Resignation date</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Notice (days)</Label>
              <Input
                type="number"
                min={0}
                value={noticeDays}
                onChange={e => setNoticeDays(Number(e.target.value))}
                className="font-mono"
              />
            </div>
          </div>
          <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Last working day
            </p>
            <p className="text-[13px] font-bold text-foreground">{lastWorkingDay || '—'}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !empId}>
              {pending ? 'Opening…' : 'Open exit case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddExitCaseModal;
