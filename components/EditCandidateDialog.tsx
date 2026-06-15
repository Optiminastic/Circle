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
import { EditableSelect } from '@/components/ui/editable-select';
import { useOrgSettings } from '@/store/org-settings';
import { Candidate } from '@/types';

interface EditCandidateDialogProps {
  open: boolean;
  candidate: Candidate;
  onClose: () => void;
  onSave: (updated: Candidate) => void;
}

/** Edit a candidate's core profile fields. */
export function EditCandidateDialog({ open, candidate, onClose, onSave }: EditCandidateDialogProps) {
  const org = useOrgSettings();
  const [form, setForm] = useState<Candidate>(candidate);

  // Re-seed when a different candidate is opened.
  React.useEffect(() => {
    if (open) setForm(candidate);
  }, [open, candidate]);

  const set = <K extends keyof Candidate>(key: K, value: Candidate[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit candidate</DialogTitle>
          <DialogDescription>Update {candidate.fullName}&apos;s details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Full name *</Label>
              <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Applied role</Label>
              <EditableSelect
                value={form.appliedRole}
                onChange={v => set('appliedRole', v)}
                options={org.roles}
                onAdd={v => org.add('roles', v)}
                placeholder="Select role"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Department</Label>
              <EditableSelect
                value={form.department}
                onChange={v => set('department', v)}
                options={org.departments}
                onAdd={v => org.add('departments', v)}
                placeholder="Select department"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Source</Label>
              <EditableSelect
                value={form.sourceOfApplication}
                onChange={v => set('sourceOfApplication', v)}
                options={org.sources}
                onAdd={v => org.add('sources', v)}
                placeholder="Select source"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Notice period (days)</Label>
              <Input
                type="number"
                min={0}
                value={form.noticePeriodDays}
                onChange={e => set('noticePeriodDays', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Current company</Label>
              <Input value={form.currentCompany} onChange={e => set('currentCompany', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Current designation</Label>
              <Input
                value={form.currentDesignation}
                onChange={e => set('currentDesignation', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Total experience (yrs)</Label>
              <Input
                type="number"
                min={0}
                value={form.totalExperienceYears}
                onChange={e => set('totalExperienceYears', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Relevant experience (yrs)</Label>
              <Input
                type="number"
                min={0}
                value={form.relevantExperienceYears}
                onChange={e => set('relevantExperienceYears', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Current CTC</Label>
              <Input value={form.currentCtc} onChange={e => set('currentCtc', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-600">Expected CTC</Label>
              <Input value={form.expectedCtc} onChange={e => set('expectedCtc', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditCandidateDialog;
