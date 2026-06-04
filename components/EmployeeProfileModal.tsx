'use client';
import { Select } from './Select';
import { DocumentsPanel } from './DocumentsPanel';
import { useToast } from './Toaster';
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
} from 'lucide-react';
import { Employee } from '../types';

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
  const [activeTab, setActiveTab] = useState<'info' | 'sec' | 'perf'>('info');
  const [offboardReason, setOffboardReason] = useState('Resignation' as any);
  const [showOffboardForm, setShowOffboardForm] = useState(false);

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
        <div className="px-6 py-4 border-b border-[#E1D6BC] bg-[#F7F1E4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-purple-600 flex items-center justify-center text-white text-md font-bold">
              {employee.fullName
                .split(' ')
                .map(n => n[0])
                .join('')}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">{employee.fullName}</h2>
              <p className="text-xs text-gray-400 font-mono">
                EMP-ID: {employee.id} • {employee.role} • {employee.department}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-[#E1D6BC] px-6 bg-[#FFFFFF] shrink-0 flex gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 border-b-2 font-semibold ${activeTab === 'info' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Personal & Job Info
          </button>
          <button
            onClick={() => setActiveTab('sec')}
            className={`py-3 border-b-2 font-semibold ${activeTab === 'sec' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            IT Assets & Credentials ({employee.assets?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('perf')}
            className={`py-3 border-b-2 font-semibold ${activeTab === 'perf' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Performance scorecards
          </button>
        </div>

        {/* Modal body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F1E4]">
          {activeTab === 'info' && (
            <div className="space-y-5 text-xs">
              <DocumentsPanel
                entityType="employee"
                entityId={employee.id}
                category="document"
                title="Important Documents"
              />
              {/* Job Details Card */}
              <div className="bg-[#FFFFFF] border border-[#E1D6BC] p-4 rounded-xl space-y-3.5">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                  Corporate Assignment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 font-mono text-[9px] uppercase">Department Squad</span>
                    <p className="font-semibold text-gray-800">{employee.department}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono text-[9px] uppercase">Reporting manager</span>
                    <p className="font-semibold text-gray-800">{employee.reportingManager}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono text-[9px] uppercase">Joining Date</span>
                    <p className="font-semibold text-gray-800 font-mono">{employee.joiningDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono text-[9px] uppercase">Work Location</span>
                    <p className="font-semibold text-gray-800">{employee.workLocation}</p>
                  </div>
                </div>
              </div>

              {/* Secure personal data */}
              <div className="bg-[#FFFFFF] border border-[#E1D6BC] p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                  Masked Personal Records
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between py-1 border-b border-[#EAE1CC]">
                    <span className="text-gray-500">Contact Email:</span>
                    <span className="font-semibold text-gray-900 select-all">{employee.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EAE1CC]">
                    <span className="text-gray-500">Phone Code:</span>
                    <span className="font-semibold text-gray-900 select-all">{employee.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EAE1CC]">
                    <span className="text-gray-500">Mailing Address:</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {employee.personalDetails.address}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EAE1CC]">
                    <span className="text-gray-500">Emergency Contacts:</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {employee.personalDetails.emergencyContact}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#EAE1CC]">
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
                          className="w-full px-2 py-1.5 bg-[#FFFFFF] border border-[#E1D6BC] rounded"
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
                          className="border border-[#E1D6BC] bg-[#FFFFFF] text-gray-650 font-medium px-3.5 py-1 rounded cursor-pointer transition text-[11px]"
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

          {activeTab === 'sec' && (
            <div className="space-y-5 text-xs">
              {/* Credentials listed */}
              <div className="bg-[#FFFFFF] border border-[#E1D6BC] p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                  Active System Logins
                </h3>
                <div className="space-y-2">
                  {employee.credentials && employee.credentials.length > 0 ? (
                    employee.credentials.map(cr => (
                      <div
                        key={cr.id}
                        className="flex justify-between items-center bg-[#F7F1E4] p-2.5 rounded border border-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <KeyRound size={12} className="text-gray-400" />
                          <div>
                            <span className="font-bold text-gray-900">{cr.systemName}</span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              Level: {cr.accessLevel}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-mono">
                          {cr.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">No access tokens generated historically.</p>
                  )}
                </div>
              </div>

              {/* Assets allocated list */}
              <div className="bg-[#FFFFFF] border border-[#E1D6BC] p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                  IT hardware Inventory records
                </h3>
                <div className="space-y-2">
                  {employee.assets && employee.assets.length > 0 ? (
                    employee.assets.map(as => (
                      <div
                        key={as.id}
                        className="flex justify-between items-center bg-[#F7F1E4] p-2.5 rounded border border-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <Laptop size={12} className="text-gray-400" />
                          <div>
                            <span className="font-bold text-gray-900">{as.assetName}</span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              Serial: {as.serialNumber}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded font-mono">
                          {as.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No active assets allocated to employee file.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'perf' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-gray-900 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                Scorecard Review History
              </h3>
              {employee.appraisalHistory && employee.appraisalHistory.length > 0 ? (
                employee.appraisalHistory.map(ap => (
                  <div
                    key={ap.id}
                    className="bg-[#FFFFFF] border border-[#E1D6BC] p-4 rounded-xl space-y-3 shadow-2xs"
                  >
                    <div className="flex justify-between font-mono text-[9px] border-b border-[#EAE1CC] pb-1 font-bold">
                      <span className="text-accent-600 uppercase">Review: {ap.reviewPeriod}</span>
                      <span className="text-green-600">{ap.status}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 block">Performance Grade Rank:</span>
                      <span className="font-bold text-sm text-gray-900">⭐ {ap.performanceScore} / 5</span>
                    </div>
                    <div className="space-y-1 bg-[#EAE1CC] p-2.5 rounded text-gray-700 leading-normal">
                      <p className="font-bold">Manager Feedback Summary:</p>
                      <p className="italic">"{ap.managerFeedback}"</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#FFFFFF] p-6 border border-[#E1D6BC] rounded-xl text-center text-gray-400">
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
