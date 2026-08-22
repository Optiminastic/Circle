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
import { Label } from '@/components/ui/label';
import { Select } from '@/components/Select';
import { DatePicker } from '@/components/ui/date-picker';
import { OffboardingWorkflow } from '@/types';

interface Props {
  open: boolean;
  workflow: OffboardingWorkflow;
  pending?: boolean;
  onClose: () => void;
  onSave: (changes: { triggerReason: OffboardingWorkflow['triggerReason']; lastWorkingDay: string }) => void;
}

const selectCls = 'mt-0 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm';
const labelCls = 'text-[11px] font-medium text-gray-600';

/** Edit the two case-level fields shown on the Exit Cases list — reason and
 *  last working day. Checklist/deliverable progress is managed on the case's
 *  own detail page, not here. */
export function EditExitCaseDialog({ open, workflow, pending, onClose, onSave }: Props) {
  const [reason, setReason] = useState<OffboardingWorkflow['triggerReason']>(workflow.triggerReason);
  const [lastWorkingDay, setLastWorkingDay] = useState(workflow.lastWorkingDay);

  React.useEffect(() => {
    if (open) {
      setReason(workflow.triggerReason);
      setLastWorkingDay(workflow.lastWorkingDay);
    }
  }, [open, workflow]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ triggerReason: reason, lastWorkingDay });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit exit case</DialogTitle>
          <DialogDescription>Update {workflow.employeeName}&apos;s reason or last working day.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5 text-xs">
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
          <div className="space-y-1">
            <Label className={labelCls}>Last working day</Label>
            <DatePicker value={lastWorkingDay} onChange={setLastWorkingDay} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditExitCaseDialog;
