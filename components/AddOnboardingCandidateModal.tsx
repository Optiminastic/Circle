'use client';

import React, { useState } from 'react';
import { clampCtcInput } from '@/lib/ctc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select } from '@/components/Select';
import { EditableSelect } from '@/components/ui/editable-select';
import { FileDropzone, PickedFile } from '@/components/ui/file-dropzone';
import { useToast } from '@/components/Toaster';
import { Candidate, Job } from '@/types';

interface Props {
  /** Already filtered to Open job postings. */
  jobs: Job[];
  pending?: boolean;
  onSubmit: (candidate: Candidate, resume: PickedFile) => void;
  onClose: () => void;
}

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  age: '',
  gender: '' as '' | 'Male' | 'Female' | 'Other',
  location: '',
  appliedRole: '',
  currentCompany: '',
  currentDesignation: '',
  currentCtc: '',
  expectedCtc: '',
  totalExperienceYears: '',
  noticePeriodDays: '',
  linkedInUrl: '',
  coverNote: '',
};

/**
 * Adds a candidate straight into Onboarding — same profile fields a real
 * application collects, but skips the hiring pipeline entirely (no
 * screening/interview/IQ test stages). The caller (OnboardingChecklistView)
 * owns creating the Candidate + spinning up their onboarding checklist;
 * this modal only collects the fields and hands them back.
 */
export function AddOnboardingCandidateModal({ jobs, pending, onSubmit, onClose }: Props) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [resume, setResume] = useState<PickedFile | null>(null);
  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!form.fullName.trim()) missing.push('Full name');
    if (!form.email.trim()) missing.push('Email');
    if (!form.phone.trim()) missing.push('Phone');
    if (!form.age.trim()) missing.push('Age');
    if (!form.gender) missing.push('Gender');
    if (!form.location.trim()) missing.push('Location');
    if (!resume) missing.push('Resume');
    if (missing.length > 0) {
      toast.error(`Please fill all fields before saving: ${missing.join(', ')}.`);
      return;
    }

    const job = jobs.find(j => j.title === form.appliedRole);
    const candidate: Candidate = {
      id: `CAN-${Math.floor(100 + Math.random() * 900)}`,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      age: Number(form.age),
      gender: form.gender || undefined,
      location: form.location.trim(),
      currentCompany: form.currentCompany.trim(),
      currentDesignation: form.currentDesignation.trim(),
      totalExperienceYears: Number(form.totalExperienceYears),
      relevantExperienceYears: Number(form.totalExperienceYears),
      currentCtc: form.currentCtc.trim(),
      expectedCtc: form.expectedCtc.trim(),
      noticePeriodDays: Number(form.noticePeriodDays),
      linkedInUrl: form.linkedInUrl.trim(),
      coverNote: form.coverNote.trim() || undefined,
      appliedRole: form.appliedRole.trim(),
      department: job?.department ?? '',
      jobId: job?.id,
      sourceOfApplication: 'Direct add (Onboarding)',
      status: 'Selected',
      appliedDate: new Date().toISOString().split('T')[0],
      appliedAt: new Date().toISOString(),
      manuallyAdded: true,
    };
    onSubmit(candidate, resume!);
  };

  const labelCls = 'text-sm font-medium';

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,56rem)] max-w-4xl sm:max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="font-mono text-xs font-bold uppercase tracking-wider text-gray-900">
            Add candidate directly to onboarding
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {/* Candidate */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <h2 className="font-semibold text-foreground">Candidate</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Skips screening/interview/IQ test — goes straight into onboarding.
                </p>
              </div>
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className={labelCls}>Full name *</Label>
                    <Input
                      value={form.fullName}
                      onChange={e => set('fullName', e.target.value)}
                      placeholder="Enter name…"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Email *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="name@gmail.com"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Phone *</Label>
                    <Input
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Age *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.age}
                      onChange={e => set('age', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Gender *</Label>
                    <Select
                      value={form.gender}
                      onChange={e => set('gender', e.target.value as typeof form.gender)}
                      placeholder="Select gender"
                      className="mt-2 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="" disabled>
                        Select gender
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label className={labelCls}>Location *</Label>
                    <Input
                      value={form.location}
                      onChange={e => set('location', e.target.value)}
                      placeholder="Mumbai, India"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Role & compensation */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <h2 className="font-semibold text-foreground">Role &amp; compensation</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Which open role they're joining for, and their comp details.
                </p>
              </div>
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className={labelCls}>Role</Label>
                    <EditableSelect
                      value={form.appliedRole}
                      onChange={v => set('appliedRole', v)}
                      options={jobs.map(j => j.title)}
                      onAdd={() => {}}
                      placeholder={jobs.length ? 'Select or add a role' : 'Add a role'}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Current company</Label>
                    <Input
                      value={form.currentCompany}
                      onChange={e => set('currentCompany', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Current title</Label>
                    <Input
                      value={form.currentDesignation}
                      onChange={e => set('currentDesignation', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Experience (years)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.totalExperienceYears}
                      onChange={e => set('totalExperienceYears', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Current / Previous CTC</Label>
                    <Input
                      placeholder="e.g. 8 LPA"
                      value={form.currentCtc}
                      onChange={e => set('currentCtc', clampCtcInput(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Expected CTC</Label>
                    <Input
                      placeholder="e.g. 15 LPA"
                      value={form.expectedCtc}
                      onChange={e => set('expectedCtc', clampCtcInput(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>Notice period (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.noticePeriodDays}
                      onChange={e => set('noticePeriodDays', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className={labelCls}>LinkedIn URL</Label>
                    <Input
                      value={form.linkedInUrl}
                      onChange={e => set('linkedInUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/…"
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Resume */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <h2 className="font-semibold text-foreground">
                  Resume <span className="text-red-500">*</span>
                </h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Required. Drag &amp; drop, browse, or import a copy from Google Drive.
                </p>
              </div>
              <div className="md:col-span-2">
                <FileDropzone
                  value={resume}
                  onChange={setResume}
                  accept=".pdf,.doc,.docx"
                  hint="PDF, DOC or DOCX up to 15 MB"
                />
              </div>
            </div>

            <Separator />

            {/* Cover note */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <h2 className="font-semibold text-foreground">Cover note</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">Optional.</p>
              </div>
              <div className="md:col-span-2">
                <Textarea
                  placeholder="Anything the candidate would have said in their application…"
                  value={form.coverNote}
                  onChange={e => set('coverNote', e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Adding…' : 'Add to onboarding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddOnboardingCandidateModal;
