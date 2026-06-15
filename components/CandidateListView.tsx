'use client';
import { Select } from './Select';
import { ActionMenu } from './ActionMenu';
import { useToast } from './Toaster';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Candidate, CandidateStatus } from '../types';
import { useUiStore } from '@/store/ui-store';
import { useOrgSettings } from '@/store/org-settings';
import { EditableSelect } from '@/components/ui/editable-select';
import {
  Search,
  Filter,
  Plus,
  FileText,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
  UserSearch,
  X,
  Check,
  User,
  Briefcase,
  Building2,
  Clock4,
  Wallet,
  CalendarClock,
  Flag,
  Gauge,
  Radio,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  THead,
  Th,
  TBody,
  Tr,
  Td,
  TagPill,
  SelectionBar,
  useTableSelection,
  type DotColor,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { FileDropzone, PickedFile } from '@/components/ui/file-dropzone';
import { importDriveDocument, uploadDocument } from '@/lib/api/documents';
import { effectiveFit, fitStyle } from '@/lib/screening';
import { FitRating } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const DEPT_COLOR: Record<string, DotColor> = {
  Engineering: 'blue',
  Product: 'purple',
  Design: 'pink',
  Sales: 'amber',
  'Human Resources': 'green',
  Marketing: 'pink',
};
const deptColor = (d: string): DotColor => DEPT_COLOR[d] ?? 'gray';

const statusColor = (s: CandidateStatus): DotColor => {
  switch (s) {
    case 'Selected':
    case 'Offer Shortlisted':
      return 'green';
    case 'Shortlisted':
      return 'purple';
    case 'Moved to HR Call':
      return 'blue';
    case 'Rejected':
      return 'red';
    case 'On Hold':
      return 'amber';
    default:
      return 'accent';
  }
};

interface CandidateListViewProps {
  candidates: Candidate[];
  onSelectCandidate: (id: string) => void;
  onAddCandidate: (cand: Candidate) => void;
  onDeleteCandidate?: (id: string) => void;
  onShortlistCandidate?: (id: string, name: string) => void;
  onSetFit?: (id: string, rating: FitRating) => void;
  /** Show the "Candidate Evaluation & ATS Panel" header with the Add Candidate button. */
  showHeader?: boolean;
  /** Show the Evaluation Filters bar (search / department / status / source). */
  showFilters?: boolean;
}

export function CandidateListView({
  candidates,
  onSelectCandidate,
  onAddCandidate,
  onDeleteCandidate,
  onSetFit,
  showHeader = true,
  showFilters = true,
}: CandidateListViewProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const { openCandidate } = useUiStore();
  const org = useOrgSettings();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [maxNoticePeriod, setMaxNoticePeriod] = useState<number>(9999);
  const [minExperience, setMinExperience] = useState<number>(0);

  // New Candidate Modal Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [resume, setResume] = useState<PickedFile | null>(null);
  const [newCand, setNewCand] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: 'San Francisco, CA',
    currentCompany: '',
    currentDesignation: '',
    totalExperienceYears: 4,
    relevantExperienceYears: 3,
    currentCtc: '',
    expectedCtc: '',
    noticePeriodDays: 30,
    appliedRole: 'Senior React Engineer',
    department: 'Engineering',
    sourceOfApplication: 'LinkedIn',
    hrRemarks: 'Great dynamic design mindset and solid code patterns.',
  });

  // Dropdown lists — roles/departments/sources come from the customisable
  // org-settings store; statuses are pipeline-driven so they stay fixed.
  const departments = ['All', ...org.departments];
  const statuses = [
    'All',
    'New Application',
    'Under Review',
    'Shortlisted',
    'Moved to HR Call',
    'Rejected',
    'On Hold',
  ];
  const sources = ['All', ...org.sources];

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

  const sel = useTableSelection(filtered.map(c => c.id));

  // Bulk-delete every currently-selected candidate (confirmed once).
  const deleteSelected = () => {
    if (!onDeleteCandidate || sel.count === 0) return;
    const ids = sel.selectedIds;
    toast.confirm({
      title: `Delete ${ids.length} candidate${ids.length === 1 ? '' : 's'}?`,
      description: 'This removes the selected profiles from the ATS database. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        ids.forEach(id => onDeleteCandidate(id));
        sel.clear();
      },
    });
  };

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

    // Attach the resume (if any) to the new candidate — best-effort, so a
    // storage hiccup never blocks adding the candidate to the pipeline.
    if (resume) {
      const upload =
        resume.kind === 'local'
          ? uploadDocument({
              entityType: 'candidate',
              entityId: created.id,
              category: 'resume',
              file: resume.file,
            })
          : importDriveDocument({
              entityType: 'candidate',
              entityId: created.id,
              category: 'resume',
              fileId: resume.ref.id,
              fileName: resume.ref.name,
              mimeType: resume.ref.mimeType,
              accessToken: resume.ref.accessToken,
            });
      upload
        .then(() => {
          toast.success(`Resume attached to ${created.fullName}.`);
          qc.invalidateQueries({ queryKey: ['documents', 'candidate', created.id] });
        })
        .catch(() => toast.error('Candidate added, but the resume failed to upload.'));
    }

    setShowAddForm(false);
    setResume(null);
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
      currentCtc: '',
      expectedCtc: '',
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
      {showHeader && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E4E6EA] bg-[#F7F8FA] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
              Candidate Evaluation & ATS Panel
            </h2>
            <p className="text-gray-500 text-[11px]">
              Secure enterprise dashboard to review profiles, salaries limits, resumes, and actions.
            </p>
          </div>
          <button
            id="btn-add-candidate-directory"
            onClick={() => {
              setResume(null);
              setShowAddForm(true);
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 text-xs font-semibold text-white transition hover:bg-accent-700"
          >
            <Plus size={14} /> Add Candidate
          </button>
        </div>
      )}

      {/* Advanced Filter Bars */}
      {showFilters && (
      <div className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-gray-700 font-semibold mb-1">
          <SlidersHorizontal size={13} className="text-accent-600" />
          <span>Evaluation Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 text-xs">
          {/* Text filters */}
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Candidate search</span>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-gray-500">
                <Search size={12} />
              </span>
              <input
                type="text"
                placeholder="Search name, applied role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-[#EDEEF1] border border-[#E4E6EA] rounded text-xs focus:bg-[#FFFFFF]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Department</span>
            <Select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#EDEEF1] border border-[#E4E6EA] rounded"
            >
              {departments.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Notice period</span>
            <Select
              value={maxNoticePeriod}
              onChange={e => setMaxNoticePeriod(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-[#EDEEF1] border border-[#E4E6EA] rounded font-mono"
            >
              <option value={9999}>Any Notice</option>
              <option value={30}>≤ 30 Days</option>
              <option value={15}>≤ 15 Days</option>
              <option value={0}>Immediate</option>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Hiring status</span>
            <Select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#EDEEF1] border border-[#E4E6EA] rounded"
            >
              {statuses.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">Medium Source</span>
            <Select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#EDEEF1] border border-[#E4E6EA] rounded"
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
      )}

      {/* Main Tabular candidate container */}
      <SelectionBar count={sel.count} onClear={sel.clear}>
        {onDeleteCandidate && (
          <button
            onClick={deleteSelected}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-[#FFFFFF] px-2 py-1 font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
      </SelectionBar>
      <Table minWidth={980}>
        <THead>
          <Th select checked={sel.allSelected} indeterminate={sel.someSelected} onToggle={sel.toggleAll} />
          <Th icon={<User size={11} />}>Candidate name</Th>
          <Th icon={<Briefcase size={11} />}>Applied position</Th>
          <Th icon={<Building2 size={11} />}>Department</Th>
          <Th icon={<Gauge size={11} />} align="center">Experience</Th>
          <Th icon={<Wallet size={11} />} align="center">Current CTC</Th>
          <Th icon={<Wallet size={11} />} align="center">Expected CTC</Th>
          <Th icon={<Clock4 size={11} />} align="center">Notice period</Th>
          <Th icon={<Flag size={11} />}>Stage status</Th>
          <Th icon={<Check size={11} />} align="center">Fit</Th>
          <Th icon={<Radio size={11} />}>Source</Th>
          <Th align="right">Actions</Th>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <tr>
              <Td colSpan={12}>
                <EmptyState
                  icon={UserSearch}
                  title={candidates.length === 0 ? 'No candidates yet' : 'No matches'}
                  description={
                    candidates.length === 0
                      ? 'Candidates will appear here as they apply or are added.'
                      : 'No candidate records match the current filters.'
                  }
                  className="border-0 bg-transparent py-10"
                />
              </Td>
            </tr>
          ) : (
            filtered.map(cand => (
              <Tr
                key={cand.id}
                selected={sel.isSelected(cand.id)}
                onClick={() => onSelectCandidate(cand.id)}
                className="group"
              >
                <Td select checked={sel.isSelected(cand.id)} onToggle={() => sel.toggle(cand.id)} />
                <Td>
                  <span className="font-semibold text-gray-900 group-hover:text-accent-600 group-hover:underline">
                    {cand.fullName}
                  </span>
                </Td>
                <Td className="max-w-[150px] truncate font-medium text-gray-700">{cand.appliedRole}</Td>
                <Td>
                  <TagPill color={deptColor(cand.department)}>{cand.department}</TagPill>
                </Td>
                <Td align="center" className="font-mono text-gray-600">{cand.totalExperienceYears} Yrs</Td>
                <Td align="center" className="font-mono text-gray-500">{cand.currentCtc}</Td>
                <Td align="center" className="font-mono font-semibold text-accent-600">{cand.expectedCtc}</Td>
                <Td align="center" className="font-mono text-gray-700">{cand.noticePeriodDays} Days</Td>
                <Td>
                  <TagPill color={statusColor(cand.status)}>{cand.status}</TagPill>
                </Td>
                <Td align="center">
                  {(() => {
                    const fit = effectiveFit(cand);
                    if (!fit) return <span className="text-[10px] text-gray-400">—</span>;
                    return (
                      <span
                        title={cand.fitRatingOverride ? 'Set by HR' : 'Auto from screening'}
                        className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${fitStyle(fit)}`}
                      >
                        {fit}
                        {cand.fitRatingOverride && <span className="ml-0.5 opacity-60">*</span>}
                      </span>
                    );
                  })()}
                </Td>
                <Td className="font-mono text-[10px] text-gray-500">{cand.sourceOfApplication}</Td>
                <Td align="right" className="whitespace-nowrap" >
                  <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          ...(onSetFit
                            ? ([
                                {
                                  key: 'fit-fit',
                                  label: 'Mark Fit',
                                  icon: <Check size={13} />,
                                  onClick: () => onSetFit(cand.id, 'Fit'),
                                },
                                {
                                  key: 'fit-unfit',
                                  label: 'Mark Unfit',
                                  icon: <X size={13} />,
                                  onClick: () => onSetFit(cand.id, 'Unfit'),
                                },
                              ] as const)
                            : []),
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            danger: true,
                            disabled: !onDeleteCandidate,
                            onClick: () =>
                              toast.confirm({
                                title: `Delete ${cand.fullName}?`,
                                description: 'This removes the profile from the ATS database.',
                                confirmLabel: 'Delete',
                                onConfirm: () => onDeleteCandidate?.(cand.id),
                              }),
                          },
                        ]}
                      />
                    </div>
                  </Td>
                </Tr>
              ))
            )}
        </TBody>
      </Table>

      {/* Slide overlay Adding Form Model */}
      <Dialog
        open={showAddForm}
        onOpenChange={open => {
          setShowAddForm(open);
          if (!open) setResume(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,56rem)] max-w-4xl sm:max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="font-mono text-xs font-bold uppercase tracking-wider text-gray-900">
              Candidate Admission Profile
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
              {/* Candidate */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h2 className="font-semibold text-foreground">Candidate</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Contact details and current location.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="cand-name" className="text-sm font-medium">
                        Full name
                      </Label>
                      <Input
                        id="cand-name"
                        placeholder="Enter name…"
                        value={newCand.fullName}
                        onChange={e => setNewCand({ ...newCand, fullName: e.target.value })}
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cand-email" className="text-sm font-medium">
                        Email address
                      </Label>
                      <Input
                        id="cand-email"
                        type="email"
                        placeholder="name@gmail.com"
                        value={newCand.email}
                        onChange={e => setNewCand({ ...newCand, email: e.target.value })}
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cand-phone" className="text-sm font-medium">
                        Phone
                      </Label>
                      <Input
                        id="cand-phone"
                        placeholder="+1 (555) 234-5678"
                        value={newCand.phone}
                        onChange={e => setNewCand({ ...newCand, phone: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cand-location" className="text-sm font-medium">
                        Present location
                      </Label>
                      <Input
                        id="cand-location"
                        placeholder="San Francisco, CA"
                        value={newCand.location}
                        onChange={e => setNewCand({ ...newCand, location: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Role & pipeline */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h2 className="font-semibold text-foreground">Role &amp; pipeline</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Where they applied and how they reached us.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">Applied role</Label>
                      <EditableSelect
                        value={newCand.appliedRole}
                        onChange={v => setNewCand({ ...newCand, appliedRole: v })}
                        options={org.roles}
                        onAdd={v => org.add('roles', v)}
                        placeholder="Select role"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Department</Label>
                      <EditableSelect
                        value={newCand.department}
                        onChange={v => setNewCand({ ...newCand, department: v })}
                        options={org.departments}
                        onAdd={v => org.add('departments', v)}
                        placeholder="Select department"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Source</Label>
                      <EditableSelect
                        value={newCand.sourceOfApplication}
                        onChange={v => setNewCand({ ...newCand, sourceOfApplication: v })}
                        options={org.sources}
                        onAdd={v => org.add('sources', v)}
                        placeholder="Select source"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cand-exp" className="text-sm font-medium">
                        Total experience
                      </Label>
                      <Input
                        id="cand-exp"
                        type="number"
                        value={newCand.totalExperienceYears}
                        onChange={e =>
                          setNewCand({ ...newCand, totalExperienceYears: Number(e.target.value) })
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cand-notice" className="text-sm font-medium">
                        Notice days
                      </Label>
                      <Input
                        id="cand-notice"
                        type="number"
                        value={newCand.noticePeriodDays}
                        onChange={e =>
                          setNewCand({ ...newCand, noticePeriodDays: Number(e.target.value) })
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cand-ctc" className="text-sm font-medium">
                        Expected CTC (LPA)
                      </Label>
                      <Input
                        id="cand-ctc"
                        placeholder="e.g. 15 LPA"
                        value={newCand.expectedCtc}
                        onChange={e => setNewCand({ ...newCand, expectedCtc: e.target.value })}
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
                  <h2 className="font-semibold text-foreground">Resume</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Drag &amp; drop, browse, or import a copy from Google Drive.
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

              {/* Screening */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h2 className="font-semibold text-foreground">Screening</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Mandatory internal remarks.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="cand-remarks" className="text-sm font-medium">
                    Internal screening remarks
                  </Label>
                  <Textarea
                    id="cand-remarks"
                    placeholder="Candidate background high-level screening summary…"
                    value={newCand.hrRemarks}
                    onChange={e => setNewCand({ ...newCand, hrRemarks: e.target.value })}
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Back
              </Button>
              <Button type="submit">Register Candidate Profile</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default CandidateListView;
