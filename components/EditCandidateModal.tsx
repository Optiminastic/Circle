'use client';

import React, { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
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
import { Select } from './Select';
import type { Candidate } from '@/types';

interface Props {
  candidate: Candidate;
  roles: string[];
  departments: string[];
  sources: string[];
  saving?: boolean;
  onSave: (updated: Candidate) => void;
  onClose: () => void;
}

/**
 * Edit a manually-added candidate's details. Only offered for candidates HR
 * created via "Add Candidate" (`manuallyAdded`) — public applicants are not
 * editable, so their submitted data stays intact.
 */
export function EditCandidateModal({
  candidate,
  roles,
  departments,
  sources,
  saving,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<Candidate>(candidate);
  const set = <K extends keyof Candidate>(key: K, value: Candidate[K]) =>
    setDraft(d => ({ ...d, [key]: value }));
  const setNum = (key: keyof Candidate, v: string) => set(key, (Number(v) || 0) as never);

  const save = () => {
    if (!draft.fullName.trim() || !draft.email.trim()) return;
    onSave(draft);
  };

  const field = 'mt-1';

  return (
    <Dialog open onOpenChange={o => !o && !saving && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,44rem)] max-w-[44rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[44rem]">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-sm">Edit candidate</DialogTitle>
          <DialogDescription className="text-xs">
            Update {candidate.fullName}’s details. Only candidates added manually can be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ec-name" className="text-sm font-medium">Full name *</Label>
              <Input id="ec-name" className={field} value={draft.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-email" className="text-sm font-medium">Email *</Label>
              <Input id="ec-email" className={field} type="email" value={draft.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-phone" className="text-sm font-medium">Phone</Label>
              <Input id="ec-phone" className={field} value={draft.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-gender" className="text-sm font-medium">Gender</Label>
              <Select
                id="ec-gender"
                value={draft.gender ?? ''}
                onChange={e => set('gender', (e.target.value || undefined) as Candidate['gender'])}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Not set</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ec-location" className="text-sm font-medium">Present location</Label>
              <Input id="ec-location" className={field} value={draft.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-company" className="text-sm font-medium">Current company</Label>
              <Input id="ec-company" className={field} value={draft.currentCompany} onChange={e => set('currentCompany', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-desig" className="text-sm font-medium">Current title</Label>
              <Input id="ec-desig" className={field} value={draft.currentDesignation} onChange={e => set('currentDesignation', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-role" className="text-sm font-medium">Applied role</Label>
              <Select
                id="ec-role"
                value={draft.appliedRole}
                onChange={e => set('appliedRole', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                {!roles.includes(draft.appliedRole) && <option value={draft.appliedRole}>{draft.appliedRole}</option>}
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="ec-dept" className="text-sm font-medium">Department</Label>
              <Select
                id="ec-dept"
                value={draft.department}
                onChange={e => set('department', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                {!departments.includes(draft.department) && <option value={draft.department}>{draft.department}</option>}
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="ec-source" className="text-sm font-medium">Source</Label>
              <Select
                id="ec-source"
                value={draft.sourceOfApplication}
                onChange={e => set('sourceOfApplication', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                {!sources.includes(draft.sourceOfApplication) && (
                  <option value={draft.sourceOfApplication}>{draft.sourceOfApplication}</option>
                )}
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="ec-totexp" className="text-sm font-medium">Total experience (yrs)</Label>
              <Input id="ec-totexp" className={field} type="number" min={0} value={draft.totalExperienceYears || ''} onChange={e => setNum('totalExperienceYears', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-relexp" className="text-sm font-medium">Relevant experience (yrs)</Label>
              <Input id="ec-relexp" className={field} type="number" min={0} value={draft.relevantExperienceYears || ''} onChange={e => setNum('relevantExperienceYears', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-cctc" className="text-sm font-medium">Current CTC</Label>
              <Input id="ec-cctc" className={field} value={draft.currentCtc} onChange={e => set('currentCtc', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-ectc" className="text-sm font-medium">Expected CTC</Label>
              <Input id="ec-ectc" className={field} value={draft.expectedCtc} onChange={e => set('expectedCtc', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ec-notice" className="text-sm font-medium">Notice period (days)</Label>
              <Input id="ec-notice" className={field} type="number" min={0} value={draft.noticePeriodDays || ''} onChange={e => setNum('noticePeriodDays', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ec-remarks" className="text-sm font-medium">HR remarks</Label>
            <textarea
              id="ec-remarks"
              value={draft.hrRemarks ?? ''}
              onChange={e => set('hrRemarks', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || !draft.fullName.trim() || !draft.email.trim()}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditCandidateModal;
