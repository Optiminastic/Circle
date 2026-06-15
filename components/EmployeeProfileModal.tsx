'use client';
import { Select } from './Select';
import { DocumentsPanel } from './DocumentsPanel';
import { CtcBreakdownCard } from './CtcBreakdownCard';
import { useToast } from './Toaster';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOnboarding, useToggleOnboardingTask } from '@/features/onboarding/hooks';
import { useAssets, useEmployeeMutations, useUpdateAsset, useHrIdentity } from '@/features/employees/hooks';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Laptop,
  KeyRound,
  ArrowRight,
  Award,
  LogOut,
  ListTodo,
  CheckCircle2,
  Circle,
  Plus,
  Undo2,
} from 'lucide-react';
import { CredentialRecord, Employee } from '../types';

interface EmployeeProfileModalProps {
  employee: Employee;
  onClose: () => void;
  onInitiateOffboarding?: (empId: string, reason: string) => void;
}

export function EmployeeProfileModal({
  employee,
  onClose,
  onInitiateOffboarding,
}: EmployeeProfileModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'info' | 'onboarding' | 'sec' | 'perf'>('info');
  const [offboardReason, setOffboardReason] = useState('Resignation' as any);
  const [showOffboardForm, setShowOffboardForm] = useState(false);

  // The employee file aggregates everything from the Employees section:
  // onboarding checklist, system credentials and hardware assets — all
  // manageable from here (no separate pages needed).
  const { data: onboardingAll = [] } = useOnboarding();
  const toggleTask = useToggleOnboardingTask();
  const { data: allAssets = [] } = useAssets();
  const { update: updateEmployee, updateCredential } = useEmployeeMutations();
  const updateAsset = useUpdateAsset();
  const hr = useHrIdentity();

  const [grantForm, setGrantForm] = useState({ systemName: '', accessLevel: 'Standard' });
  const [assignAssetId, setAssignAssetId] = useState('');

  const onboarding = onboardingAll.find(
    o => o.candidateId === employee.id || o.candidateName === employee.fullName,
  );

  // Hardware from the global inventory assigned to this employee, merged with
  // any records embedded on the employee document (deduped by id).
  const assignedAssets = (() => {
    const merged = allAssets.filter(
      a => a.assignedToEmployeeId === employee.id || a.assignedToEmployeeName === employee.fullName,
    );
    for (const a of employee.assets ?? []) {
      if (!merged.some(m => m.id === a.id)) merged.push(a);
    }
    return merged;
  })();

  const credentials = employee.credentials ?? [];
  const availableAssets = allAssets.filter(a => a.status === 'Available');

  const grantCredential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantForm.systemName.trim()) {
      toast.error('Enter the system name to grant access.');
      return;
    }
    const cred: CredentialRecord = {
      id: `CRD-${Math.floor(1000 + Math.random() * 9000)}`,
      systemName: grantForm.systemName.trim(),
      assignedEmail: employee.email,
      accessLevel: grantForm.accessLevel as CredentialRecord['accessLevel'],
      dateGranted: new Date().toISOString().split('T')[0],
      grantedBy: hr.name,
      status: 'Active',
    };
    updateEmployee.mutate({ ...employee, credentials: [cred, ...credentials] });
    setGrantForm({ systemName: '', accessLevel: 'Standard' });
    toast.success(`${cred.systemName} access granted to ${employee.fullName}.`);
  };

  const assignAsset = () => {
    const asset = availableAssets.find(a => a.id === assignAssetId);
    if (!asset) {
      toast.error('Pick an available asset to assign.');
      return;
    }
    updateAsset.mutate({
      ...asset,
      status: 'Assigned',
      assignedToEmployeeId: employee.id,
      assignedToEmployeeName: employee.fullName,
      assignmentDate: new Date().toISOString().split('T')[0],
      assignedBy: hr.name,
    });
    setAssignAssetId('');
    toast.success(`${asset.assetName} assigned to ${employee.fullName}.`);
  };

  const returnAsset = (assetId: string) => {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return;
    updateAsset.mutate({
      ...asset,
      status: 'Returned',
      returnDate: new Date().toISOString().split('T')[0],
      assignedToEmployeeId: undefined,
      assignedToEmployeeName: undefined,
    });
    toast.success(`${asset.assetName} marked as returned.`);
  };

  const handleOffboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onInitiateOffboarding) {
      onInitiateOffboarding(employee.id, offboardReason);
      setShowOffboardForm(false);
      toast.success(`Exit notice initiated for ${employee.fullName} — clearance checklist created.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex justify-end z-[100] transition-opacity duration-300">
      <div className="bg-[#FFFFFF] w-full max-w-2xl h-full flex flex-col shadow-2xl relative animate-slide-in select-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E6EA] bg-[#F7F8FA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-purple-600 flex items-center justify-center text-white text-md font-bold">
              {employee.fullName
                .split(' ')
                .map(n => n[0])
                .join('')}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">{employee.fullName}</h2>
              <p className="text-xs text-gray-500 font-mono">
                EMP-ID: {employee.id} • {employee.role} • {employee.department}
              </p>
            </div>
          </div>
          <button
            aria-label="Close" onClick={onClose}
            className="p-1.5 hover:bg-[#EDEEF1] rounded-md text-gray-500 hover:text-gray-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as 'info' | 'onboarding' | 'sec' | 'perf')}
          className="shrink-0 gap-0"
        >
          <TabsList className="bg-[#FFFFFF] px-6 text-xs font-medium">
            <TabsTrigger value="info" className="py-3">
              Personal &amp; Job Info
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="py-3">
              Onboarding{' '}
              {onboarding && (
                <span className="ml-1 rounded-full bg-accent-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent-600">
                  {onboarding.progressPercentage}%
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sec" className="py-3">
              Credentials &amp; Assets ({credentials.length + assignedAssets.length})
            </TabsTrigger>
            <TabsTrigger value="perf" className="py-3">
              Performance
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Modal body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F8FA]">
          {activeTab === 'info' && (
            <div className="space-y-5 text-xs">
              <DocumentsPanel
                entityType="employee"
                entityId={employee.id}
                category="document"
                title="Important Documents"
              />
              {/* Job Details Card */}
              <div className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-3.5">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Corporate Assignment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 font-mono text-[9px] uppercase">Department Squad</span>
                    <p className="font-semibold text-gray-800">{employee.department}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-mono text-[9px] uppercase">Reporting manager</span>
                    <p className="font-semibold text-gray-800">{employee.reportingManager}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-mono text-[9px] uppercase">Joining Date</span>
                    <p className="font-semibold text-gray-800 font-mono">{employee.joiningDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-mono text-[9px] uppercase">Work Location</span>
                    <p className="font-semibold text-gray-800">{employee.workLocation}</p>
                  </div>
                </div>
              </div>

              {/* CTC / salary structure */}
              <CtcBreakdownCard
                employee={employee}
                onSave={breakdown => updateEmployee.mutate({ ...employee, ctcBreakdown: breakdown })}
              />

              {/* Secure personal data */}
              <div className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Masked Personal Records
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                    <span className="text-gray-500">Contact Email:</span>
                    <span className="font-semibold text-gray-900 select-all">{employee.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                    <span className="text-gray-500">Phone Code:</span>
                    <span className="font-semibold text-gray-900 select-all">{employee.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                    <span className="text-gray-500">Mailing Address:</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {employee.personalDetails.address}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                    <span className="text-gray-500">Emergency Contacts:</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {employee.personalDetails.emergencyContact}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                    <span className="text-gray-500">Bank Routing Code:</span>
                    <span className="font-mono font-semibold text-gray-500">
                      {employee.personalDetails.bankAccount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exit trigger trigger panel */}
              {employee.status !== 'Offboarded' && onInitiateOffboarding && (
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-red-600 font-bold">
                    <LogOut size={14} />
                    <span>Initiate Exiting Notice period</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Deploy checklists to de-allocate items, secure AWS tokens clearance, and approve notice
                    period.
                  </p>

                  {showOffboardForm ? (
                    <form onSubmit={handleOffboardSubmit} className="space-y-3.5 pt-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-gray-700">Formal Trigger Reason</label>
                        <Select
                          value={offboardReason}
                          onChange={e => setOffboardReason(e.target.value as any)}
                          className="w-full px-2 py-1.5 bg-[#FFFFFF] border border-[#E4E6EA] rounded"
                        >
                          <option value="Resignation">Resignation Clearance</option>
                          <option value="Termination">Termination Dispatch</option>
                          <option value="Contract completion">Contract Closure</option>
                          <option value="Mutual separation">Mutual Retirement</option>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="bg-red-650 hover:bg-red-700 bg-red-600 text-white font-medium px-3.5 py-1 rounded cursor-pointer transition text-[11px]"
                        >
                          Conclude & Trigger notice
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowOffboardForm(false)}
                          className="border border-[#E4E6EA] bg-[#FFFFFF] text-gray-650 font-medium px-3.5 py-1 rounded cursor-pointer transition text-[11px]"
                        >
                          Back
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowOffboardForm(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-[11px] font-semibold cursor-pointer transition"
                    >
                      Dispatch Exit Case
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'onboarding' && (
            <div className="space-y-5 text-xs">
              {onboarding ? (
                <>
                  {/* Progress header */}
                  <div className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold font-mono text-[10px] uppercase tracking-wider text-gray-500">
                        Onboarding Checklist
                      </h3>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-accent-50 text-accent-600">
                        {onboarding.onboardingStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#EDEEF1] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-600 rounded-full transition-all"
                          style={{ width: `${onboarding.progressPercentage}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 tabular-nums">
                        {onboarding.progressPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Tasks grouped by category */}
                  {(
                    [
                      'Documentation',
                      'IT Setup',
                      'Admin & Assets',
                      'HR & Induction',
                      'Manager & Team',
                    ] as const
                  )
                    .map(cat => ({
                      cat,
                      tasks: onboarding.tasks.filter(t => t.category === cat),
                    }))
                    .filter(g => g.tasks.length > 0)
                    .map(g => (
                      <div
                        key={g.cat}
                        className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-2"
                      >
                        <h4 className="font-bold font-mono text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                          <ListTodo size={12} className="text-accent-600" /> {g.cat}
                        </h4>
                        {g.tasks.map(t => (
                          <button
                            key={t.id}
                            onClick={() =>
                              toggleTask.mutate({
                                candidateName: onboarding.candidateName,
                                taskId: t.id,
                              })
                            }
                            className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg hover:bg-[#F7F8FA] transition cursor-pointer"
                          >
                            {t.isChecked ? (
                              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                            ) : (
                              <Circle size={15} className="text-gray-300 shrink-0" />
                            )}
                            <span
                              className={
                                t.isChecked ? 'text-gray-500 line-through' : 'text-gray-700'
                              }
                            >
                              {t.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                </>
              ) : (
                <div className="bg-[#FFFFFF] p-8 border border-[#E4E6EA] rounded-xl text-center text-gray-500">
                  <CheckCircle2 size={22} className="mx-auto text-emerald-400 mb-2" />
                  <p className="font-semibold text-gray-600">No active onboarding checklist.</p>
                  <p className="text-[11px] mt-1">
                    {employee.fullName}&apos;s onboarding is complete (or was never tracked in the
                    system).
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sec' && (
            <div className="space-y-5 text-xs">
              {/* Credentials — view, grant, and control access */}
              <div className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  System Credentials
                </h3>
                <div className="space-y-2">
                  {credentials.length > 0 ? (
                    credentials.map(cr => (
                      <div
                        key={cr.id}
                        className="flex flex-wrap justify-between items-center gap-2 bg-[#F7F8FA] p-2.5 rounded border border-[#ECEDF0]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <KeyRound size={12} className="text-gray-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900">{cr.systemName}</span>
                            <span className="text-[10px] text-gray-500 block font-mono truncate">
                              {cr.accessLevel} · granted {cr.dateGranted}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                              cr.status === 'Active'
                                ? 'bg-green-50 text-green-600'
                                : cr.status === 'Revoked' || cr.status === 'Suspended'
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-yellow-50 text-yellow-600'
                            }`}
                          >
                            {cr.status}
                          </span>
                          <Select
                            value={cr.status}
                            onChange={e => updateCredential.mutate({
                              empId: employee.id,
                              credId: cr.id,
                              status: e.target.value,
                            })}
                            className="px-2 py-1 bg-[#FFFFFF] border border-[#E4E6EA] rounded text-[10px]"
                          >
                            <option value="Active">Active</option>
                            <option value="Restricted">Restricted</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Revoked">Revoked</option>
                          </Select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic">No system access granted yet.</p>
                  )}
                </div>

                {/* Grant new access */}
                <form
                  onSubmit={grantCredential}
                  className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#EDEEF1]"
                >
                  <input
                    type="text"
                    placeholder="System name (Slack, GitHub, AWS…)"
                    value={grantForm.systemName}
                    onChange={e => setGrantForm({ ...grantForm, systemName: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                  <Select
                    value={grantForm.accessLevel}
                    onChange={e => setGrantForm({ ...grantForm, accessLevel: e.target.value })}
                    className="px-2 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] sm:w-32"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Standard">Standard</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Read-Only">Read-Only</option>
                  </Select>
                  <button
                    type="submit"
                    className="bg-accent-600 hover:bg-accent-700 text-white px-3 py-1.5 rounded text-[11px] font-semibold cursor-pointer transition flex items-center justify-center gap-1"
                  >
                    <Plus size={12} /> Grant Access
                  </button>
                </form>
              </div>

              {/* Hardware — assigned inventory + assignment control */}
              <div className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Hardware Assets
                </h3>
                <div className="space-y-2">
                  {assignedAssets.length > 0 ? (
                    assignedAssets.map(as => (
                      <div
                        key={as.id}
                        className="flex flex-wrap justify-between items-center gap-2 bg-[#F7F8FA] p-2.5 rounded border border-[#ECEDF0]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Laptop size={12} className="text-gray-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900">{as.assetName}</span>
                            <span className="text-[10px] text-gray-500 block font-mono truncate">
                              Serial: {as.serialNumber}
                              {as.assignmentDate && ` · since ${as.assignmentDate}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded font-mono">
                            {as.status}
                          </span>
                          <button
                            onClick={() => returnAsset(as.id)}
                            className="text-[10px] bg-[#FFFFFF] border border-[#E4E6EA] text-gray-600 hover:text-red-600 hover:border-red-200 px-2 py-1 rounded-md font-semibold font-mono flex items-center gap-1 cursor-pointer transition"
                            title="Mark this asset as returned"
                          >
                            <Undo2 size={11} /> Return
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      No active assets allocated to employee file.
                    </p>
                  )}
                </div>

                {/* Assign from available pool */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#EDEEF1]">
                  <Select
                    value={assignAssetId}
                    onChange={e => setAssignAssetId(e.target.value)}
                    placeholder={
                      availableAssets.length > 0
                        ? 'Pick available hardware…'
                        : 'No hardware available in inventory'
                    }
                    disabled={availableAssets.length === 0}
                    className="flex-1 px-2 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1]"
                  >
                    <option value="">
                      {availableAssets.length > 0
                        ? 'Pick available hardware…'
                        : 'No hardware available'}
                    </option>
                    {availableAssets.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.assetName} · {a.serialNumber}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={assignAsset}
                    disabled={!assignAssetId}
                    className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-[11px] font-semibold cursor-pointer transition flex items-center justify-center gap-1"
                  >
                    <Plus size={12} /> Assign Hardware
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'perf' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                Scorecard Review History
              </h3>
              {employee.appraisalHistory && employee.appraisalHistory.length > 0 ? (
                employee.appraisalHistory.map(ap => (
                  <div
                    key={ap.id}
                    className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-3 shadow-2xs"
                  >
                    <div className="flex justify-between font-mono text-[9px] border-b border-[#EDEEF1] pb-1 font-bold">
                      <span className="text-accent-600 uppercase">Review: {ap.reviewPeriod}</span>
                      <span className="text-green-600">{ap.status}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 block">Performance Grade Rank:</span>
                      <span className="font-bold text-sm text-gray-900">⭐ {ap.performanceScore} / 5</span>
                    </div>
                    <div className="space-y-1 bg-[#EDEEF1] p-2.5 rounded text-gray-700 leading-normal">
                      <p className="font-bold">Manager Feedback Summary:</p>
                      <p className="italic">"{ap.managerFeedback}"</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#FFFFFF] p-6 border border-[#E4E6EA] rounded-xl text-center text-gray-500">
                  <Award size={20} className="mx-auto text-gray-300 mb-1.5" />
                  No direct performance appraisal forms filed for this cycle.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default EmployeeProfileModal;
