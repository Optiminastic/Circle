'use client';
import { Select } from './Select';
import { ActionMenu } from './ActionMenu';
import { useToast } from './Toaster';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Candidate, CandidateStatus } from '../types';
import {
  Search,
  Filter,
  Plus,
  FileText,
  ChevronRight,
  SlidersHorizontal,
  Eye,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';

interface CandidateListViewProps {
  candidates: Candidate[];
  onSelectCandidate: (id: string) => void;
  onAddCandidate: (cand: Candidate) => void;
  onDeleteCandidate?: (id: string) => void;
  onShortlistCandidate?: (id: string, name: string) => void;
}

export function CandidateListView({
  candidates,
  onSelectCandidate,
  onAddCandidate,
  onDeleteCandidate,
  onShortlistCandidate,
}: CandidateListViewProps) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [maxNoticePeriod, setMaxNoticePeriod] = useState<number>(90);
  const [minExperience, setMinExperience] = useState<number>(0);

  // New Candidate Modal Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCand, setNewCand] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: 'San Francisco, CA',
    currentCompany: '',
    currentDesignation: '',
    totalExperienceYears: 4,
    relevantExperienceYears: 3,
    currentCtc: '$120,000',
    expectedCtc: '$140,000',
    noticePeriodDays: 30,
    appliedRole: 'Senior React Engineer',
    department: 'Engineering',
    sourceOfApplication: 'LinkedIn',
    hrRemarks: 'Great dynamic design mindset and solid code patterns.',
  });

  // Unique lists for dropdowns
  const departments = ['All', 'Engineering', 'Product', 'Design', 'Sales', 'Human Resources'];
  const statuses = [
    'All',
    'New Application',
    'Under Review',
    'Shortlisted',
    'Moved to HR Call',
    'Rejected',
    'On Hold',
  ];
  const sources = ['All', 'LinkedIn', 'Referral', 'Direct Application', 'Headhunted'];

  // Apply sequential pipeline filters
  const filtered = candidates.filter(cand => {
    const matchesSearch =
      cand.fullName.toLowerCase().includes(search.toLowerCase()) ||
      cand.appliedRole.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'All' || cand.department === selectedDept;
    const matchesStatus = selectedStatus === 'All' || cand.status === selectedStatus;
    const matchesSource = selectedSource === 'All' || cand.sourceOfApplication === selectedSource;
    const matchesNotice = cand.noticePeriodDays <= maxNoticePeriod;
    const matchesExp = cand.totalExperienceYears >= minExperience;
    return matchesSearch && matchesDept && matchesStatus && matchesSource && matchesNotice && matchesExp;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCand.fullName || !newCand.email) {
      toast.error('Full name and contact email are required.');
      return;
    }

    const created: Candidate = {
      id: `CAN-${Math.floor(100 + Math.random() * 900)}`,
      fullName: newCand.fullName,
      email: newCand.email,
      phone: newCand.phone,
      location: newCand.location,
      currentCompany: newCand.currentCompany,
      currentDesignation: newCand.currentDesignation,
      totalExperienceYears: Number(newCand.totalExperienceYears),
      relevantExperienceYears: Number(newCand.relevantExperienceYears),
      currentCtc: newCand.currentCtc,
      expectedCtc: newCand.expectedCtc,
      noticePeriodDays: Number(newCand.noticePeriodDays),
      appliedRole: newCand.appliedRole,
      department: newCand.department,
      sourceOfApplication: newCand.sourceOfApplication,
      hrRemarks: newCand.hrRemarks,
      status: 'New Application',
      appliedDate: new Date().toISOString().split('T')[0],
    };

    onAddCandidate(created);
    setShowAddForm(false);
    // Reset
    setNewCand({
      fullName: '',
      email: '',
      phone: '',
      location: 'San Francisco, CA',
      currentCompany: '',
      currentDesignation: '',
      totalExperienceYears: 4,
      relevantExperienceYears: 3,
      currentCtc: '$120,000',
      expectedCtc: '$140,000',
      noticePeriodDays: 30,
      appliedRole: 'Senior React Engineer',
      department: 'Engineering',
      sourceOfApplication: 'LinkedIn',
      hrRemarks: '',
    });
    toast.success(`${created.fullName} added to the candidate pipeline.`);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* View Header with CTA triggers */}
      <div className="flex justify-between items-center bg-[#F7F1E4] border-b border-[#E1D6BC] pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Candidate Evaluation & ATS Panel
          </h2>
          <p className="text-gray-400 text-[11px]">
            Secure enterprise dashboard to review profiles, salaries limits, resumes, and actions.
          </p>
        </div>
        <button
          id="btn-add-candidate-directory"
          onClick={() => setShowAddForm(true)}
          className="bg-accent-600 hover:bg-accent-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition font-medium"
        >
          <Plus size={14} /> Add Candidate
        </button>
      </div>

      {/* Advanced Filter Bars */}
      <div className="bg-[#FFFFFF] border border-[#E1D6BC] p-4 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-gray-700 font-semibold mb-1">
          <SlidersHorizontal size={13} className="text-accent-600" />
          <span>Evaluation Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 text-xs">
          {/* Text filters */}
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Candidate search</span>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-gray-400">
                <Search size={12} />
              </span>
              <input
                type="text"
                placeholder="Search name, applied role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-[#EAE1CC] border border-[#E1D6BC] rounded text-xs focus:bg-[#FFFFFF]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Department</span>
            <Select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#EAE1CC] border border-[#E1D6BC] rounded"
            >
              {departments.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Notice period</span>
            <Select
              value={maxNoticePeriod}
              onChange={e => setMaxNoticePeriod(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-[#EAE1CC] border border-[#E1D6BC] rounded font-mono"
            >
              <option value={90}>Any Notice</option>
              <option value={30}>≤ 30 Days</option>
              <option value={15}>≤ 15 Days</option>
              <option value={0}>Immediate</option>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Hiring status</span>
            <Select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#EAE1CC] border border-[#E1D6BC] rounded"
            >
              {statuses.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Medium Source</span>
            <Select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#EAE1CC] border border-[#E1D6BC] rounded"
            >
              {sources.map(sc => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Main Tabular candidate container */}
      <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F1E4] border-b border-[#E1D6BC] text-gray-400 font-mono text-[9px] uppercase font-bold">
              <th className="p-3">Candidate name</th>
              <th className="p-3">Applied position</th>
              <th className="p-3">Department</th>
              <th className="p-3 text-center">Experience</th>
              <th className="p-3 text-center">Current CTC</th>
              <th className="p-3 text-center">Expected CTC</th>
              <th className="p-3 text-center">Notice period</th>
              <th className="p-3">Stage status</th>
              <th className="p-3">Source</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1D6BC]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-400 bg-[#FFFFFF]">
                  No candidate records matching the specified filters. Try adjusting your parameters.
                </td>
              </tr>
            ) : (
              filtered.map(cand => (
                <tr key={cand.id} className="hover:bg-[#F7F1E4] group transition duration-150">
                  <td className="p-3 font-semibold text-gray-900">{cand.fullName}</td>
                  <td className="p-3 font-medium text-gray-855 truncate max-w-[150px]">{cand.appliedRole}</td>
                  <td className="p-3 text-gray-600">{cand.department}</td>
                  <td className="p-3 text-center font-mono text-gray-750">{cand.totalExperienceYears} Yrs</td>
                  <td className="p-3 text-center font-mono text-gray-500">{cand.currentCtc}</td>
                  <td className="p-3 text-center font-mono text-accent-600 font-semibold">
                    {cand.expectedCtc}
                  </td>
                  <td className="p-3 text-center font-mono text-gray-700">{cand.noticePeriodDays} Days</td>
                  <td className="p-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold select-none ${
                        cand.status === 'Shortlisted'
                          ? 'bg-purple-50 text-purple-600'
                          : cand.status === 'Moved to HR Call'
                            ? 'bg-teal-50 text-teal-600'
                            : cand.status === 'Rejected'
                              ? 'bg-red-50 text-red-600'
                              : cand.status === 'On Hold'
                                ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-accent-50 text-accent-600'
                      }`}
                    >
                      {cand.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 font-mono text-[10px]">{cand.sourceOfApplication}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end">
                      <ActionMenu
                        items={[
                          {
                            key: 'file',
                            label: 'View File',
                            icon: <Eye size={13} />,
                            onClick: () => onSelectCandidate(cand.id),
                          },
                          {
                            key: 'shortlist',
                            label:
                              cand.status === 'Shortlisted' ? 'Shortlisted' : 'Shortlist & Schedule',
                            icon: <UserCheck size={13} />,
                            disabled: cand.status === 'Shortlisted' || !onShortlistCandidate,
                            onClick: () => onShortlistCandidate?.(cand.id, cand.fullName),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            danger: true,
                            disabled: !onDeleteCandidate,
                            onClick: () => {
                              if (confirm('Delete candidate profile safely from secure ATS database?')) {
                                onDeleteCandidate?.(cand.id);
                              }
                            },
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide overlay Adding Form Model */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/45 backdrop-blur-xs flex items-center justify-center z-[110] transition-opacity duration-300">
          <form
            onSubmit={handleCreate}
            className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E1D6BC] shadow-2xl w-full max-w-lg space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-900 text-xs font-mono uppercase tracking-wider">
                Aesthetic Candidate Admission Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={newCand.fullName}
                  onChange={e => setNewCand({ ...newCand, fullName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Email Address</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={newCand.email}
                  onChange={e => setNewCand({ ...newCand, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Phone Code</label>
                <input
                  type="text"
                  placeholder="+1 (555) 234-5678"
                  value={newCand.phone}
                  onChange={e => setNewCand({ ...newCand, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Present Location</label>
                <input
                  type="text"
                  value={newCand.location}
                  onChange={e => setNewCand({ ...newCand, location: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Applied Role</label>
                <Select
                  value={newCand.appliedRole}
                  onChange={e => setNewCand({ ...newCand, appliedRole: e.target.value })}
                  className="w-full px-2 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] font-semibold"
                >
                  <option value="Senior React Engineer">Senior React Engineer</option>
                  <option value="Senior Product Manager">Senior Product Manager</option>
                  <option value="Principal UX Architect">Principal UX Architect</option>
                  <option value="VP of Platform Engineering">VP of Platform Engineering</option>
                  <option value="HR Director">HR Director</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Dept</label>
                <Select
                  value={newCand.department}
                  onChange={e => setNewCand({ ...newCand, department: e.target.value })}
                  className="w-full px-2 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Human Resources">HR</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Source</label>
                <Select
                  value={newCand.sourceOfApplication}
                  onChange={e => setNewCand({ ...newCand, sourceOfApplication: e.target.value })}
                  className="w-full px-2 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Referral">Referral</option>
                  <option value="Direct Application">Direct App</option>
                  <option value="Headhunted">Headhunted</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Total Experience</label>
                <input
                  type="number"
                  value={newCand.totalExperienceYears}
                  onChange={e => setNewCand({ ...newCand, totalExperienceYears: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Notice Days</label>
                <input
                  type="number"
                  value={newCand.noticePeriodDays}
                  onChange={e => setNewCand({ ...newCand, noticePeriodDays: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Expected CTC</label>
                <input
                  type="text"
                  value={newCand.expectedCtc}
                  onChange={e => setNewCand({ ...newCand, expectedCtc: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Internal Screening remarks (Mandatory)</label>
              <textarea
                placeholder="Candidate background high-level screening summary..."
                value={newCand.hrRemarks}
                onChange={e => setNewCand({ ...newCand, hrRemarks: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-1.5 border border-[#E1D6BC] hover:bg-gray-100 rounded text-gray-650 cursor-pointer font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded cursor-pointer font-semibold"
              >
                Register Candidate Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
export default CandidateListView;
