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
import { EditableSelect } from '@/components/ui/editable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { useOrgSettings } from '@/store/org-settings';
import { Employee } from '@/types';

interface EditEmployeeDialogProps {
  open: boolean;
  employee: Employee;
  onClose: () => void;
  onSave: (updated: Employee) => void;
}

/** Edit an employee's core profile + personal details. */
export function EditEmployeeDialog({ open, employee, onClose, onSave }: EditEmployeeDialogProps) {
  const org = useOrgSettings();
  const [form, setForm] = useState<Employee>(employee);

  React.useEffect(() => {
    if (open) setForm(employee);
  }, [open, employee]);

  const set = <K extends keyof Employee>(key: K, value: Employee[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setPd = <K extends keyof Employee['personalDetails']>(
    key: K,
    value: Employee['personalDetails'][K],
  ) => setForm(prev => ({ ...prev, personalDetails: { ...prev.personalDetails, [key]: value } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const labelCls = 'text-[11px] font-medium text-gray-600';
  const selectCls = 'mt-0 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm';

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>Update {employee.fullName}&apos;s details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5 text-xs">
          {/* Core */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className={labelCls}>Full name *</Label>
              <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Role / designation *</Label>
              <EditableSelect
                value={form.role}
                onChange={v => set('role', v)}
                options={org.roles}
                onAdd={v => org.add('roles', v)}
                placeholder="Select role"
              />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Department</Label>
              <EditableSelect
                value={form.department}
                onChange={v => set('department', v)}
                options={org.departments}
                onAdd={v => org.add('departments', v)}
                placeholder="Select department"
              />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Reporting manager</Label>
              <Input
                value={form.reportingManager}
                onChange={e => set('reportingManager', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Joining date</Label>
              <DatePicker value={form.joiningDate} onChange={v => set('joiningDate', v)} />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Work location</Label>
              <Input value={form.workLocation} onChange={e => set('workLocation', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Status</Label>
              <Select
                value={form.status}
                onChange={e => set('status', e.target.value as Employee['status'])}
                className={selectCls}
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
                <option value="Offboarded">Offboarded</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Employment type</Label>
              <Select
                value={form.employmentType ?? 'Full-time'}
                onChange={e =>
                  set('employmentType', e.target.value as NonNullable<Employee['employmentType']>)
                }
                className={selectCls}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Intern">Intern</option>
                <option value="Contract">Contract</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className={labelCls}>Annual CTC</Label>
              <Input value={form.annualCtc ?? ''} onChange={e => set('annualCtc', e.target.value)} />
            </div>
          </div>

          {/* Personal details */}
          <div className="border-t border-[#ECEDF0] pt-3">
            <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-gray-500">
              Personal records
            </p>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className={labelCls}>Date of birth</Label>
                <DatePicker
                  value={form.personalDetails.dateOfBirth ?? ''}
                  onChange={v => setPd('dateOfBirth', v)}
                />
              </div>
              <div className="space-y-1">
                <Label className={labelCls}>Gender</Label>
                <Select
                  value={form.personalDetails.gender ?? ''}
                  onChange={e => setPd('gender', e.target.value)}
                  className={selectCls}
                >
                  <option value="">—</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className={labelCls}>Address</Label>
                <Input
                  value={form.personalDetails.address ?? ''}
                  onChange={e => setPd('address', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className={labelCls}>Emergency contact</Label>
                <Input
                  value={form.personalDetails.emergencyContact ?? ''}
                  onChange={e => setPd('emergencyContact', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className={labelCls}>PAN</Label>
                <Input
                  value={form.personalDetails.panNumber ?? ''}
                  onChange={e => setPd('panNumber', e.target.value.toUpperCase())}
                  maxLength={10}
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className={labelCls}>Bank name</Label>
                <Input
                  value={form.personalDetails.bankName ?? ''}
                  onChange={e => setPd('bankName', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className={labelCls}>Account number</Label>
                <Input
                  value={form.personalDetails.accountNumber ?? ''}
                  onChange={e => setPd('accountNumber', e.target.value.replace(/[^0-9]/g, ''))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className={labelCls}>IFSC</Label>
                <Input
                  value={form.personalDetails.ifsc ?? ''}
                  onChange={e => setPd('ifsc', e.target.value.toUpperCase())}
                  maxLength={11}
                  className="font-mono uppercase"
                />
              </div>
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

export default EditEmployeeDialog;
