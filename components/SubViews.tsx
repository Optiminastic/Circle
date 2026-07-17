'use client';
import { Select } from './Select';
import { DocumentsPanel } from './DocumentsPanel';
import { DocRequestPanel } from './DocRequestPanel';
import { OnboardingStepper } from './OnboardingStepper';
import { ActionMenu } from './ActionMenu';
import { useToast } from './Toaster';
import { useUiStore } from '@/store/ui-store';
import { useSchedules } from '@/features/schedule/hooks';
import { useCandidates } from '@/features/candidates/hooks';
import { useScheduler } from '@/store/schedule-store';
import {
  getCalendarStatus,
  getCalendarAuthUrl,
  disconnectCalendar,
  type CalendarStatus,
} from '@/lib/api/calendar';
import { workspace } from '@/lib/config';
import { BRAND } from '@/lib/brand';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DatePicker, DateTimePicker } from '@/components/ui/date-picker';
import { EditableSelect } from '@/components/ui/editable-select';
import { TaxonomyManager } from '@/components/TaxonomyManager';
import { useOrgSettings } from '@/store/org-settings';
import { useRouter } from 'next/navigation';
import { QUESTION_CATEGORIES } from '@/lib/question-library';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Clock,
  CalendarDays,
  BrainCircuit,
  FileCheck2,
  FolderLock,
  Boxes,
  TrendingUp,
  LogOut,
  Mail,
  Settings,
  Plus,
  ChevronRight,
  Search,
  Filter,
  CheckCircle,
  FileText,
  AlertTriangle,
  UserCheck,
  Users,
  Check,
  Briefcase,
  SlidersHorizontal,
  X,
  Eye,
  Trash2,
  ShieldCheck,
  KeyRound,
  Laptop,
  Network,
  Download,
  Terminal,
  Send,
  BookOpen,
  MapPin,
  Video,
  Award,
} from 'lucide-react';
import {
  Candidate,
  Interview,
  IQTest,
  Assignment,
  OnboardingChecklist,
  Employee,
  AssetRecord,
  CredentialRecord,
  AppraisalRecord,
  OffboardingWorkflow,
  EmailTemplate,
  SentEmailLog,
} from '../types';
import {
  Table,
  THead,
  Th,
  TBody,
  Tr,
  Td,
  TagPill,
  StatusPill,
  SelectionBar,
  useTableSelection,
  type DotColor,
} from '@/components/ui/table';

// Shared dot colours for department/status chips across the SubViews tables.
const DEPT_DOT: Record<string, DotColor> = {
  Engineering: 'blue',
  Product: 'purple',
  Design: 'pink',
  Sales: 'amber',
  Marketing: 'pink',
  'Human Resources': 'green',
  Finance: 'green',
  Operations: 'amber',
};
const deptDot = (d?: string): DotColor => (d && DEPT_DOT[d]) || 'gray';

// ==========================================
// 1. INTRODUCTORY CALLS VIEW
// ==========================================
interface HRCallsViewProps {
  candidates: Candidate[];
  onSelectCandidate: (id: string) => void;
  onUpdateCandidate: (updated: Candidate) => void;
  onShortlistCandidate?: (id: string, name: string) => void;
  onDeleteCandidate?: (id: string) => void;
}

export function IntroductoryCallsView({
  candidates,
  onSelectCandidate,
  onUpdateCandidate,
  onShortlistCandidate,
  onDeleteCandidate,
}: HRCallsViewProps) {
  const toast = useToast();
  const { openCandidate } = useUiStore();
  const { data: schedules = [] } = useSchedules();

  // Candidates with a live HR-call booking surface here even if their status
  // hasn't advanced yet, so a freshly-scheduled call never goes missing.
  const scheduledForHrCall = new Set(
    schedules.filter(s => s.type === 'HR Call' && s.status !== 'Cancelled').map(s => s.candidateId),
  );
  const hrCallCandidates = candidates.filter(
    c => c.status === 'Moved to HR Call' || c.hrCall?.completed || scheduledForHrCall.has(c.id),
  );
  const sel = useTableSelection(hrCallCandidates.map(c => c.id));

  return (
    <div className="space-y-4 text-xs select-none">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          HR Introductory Calls Manager
        </h2>
        <p className="text-gray-500 text-[11px]">
          Standardized assessment of interest level, joining notice period, communication, and expectation
          fit.
        </p>
      </div>

      <SelectionBar count={sel.count} onClear={sel.clear} />
      <Table minWidth={760}>
        <THead>
          <Th select checked={sel.allSelected} indeterminate={sel.someSelected} onToggle={sel.toggleAll} />
          <Th icon={<UserCheck size={11} />}>Candidate</Th>
          <Th icon={<Briefcase size={11} />}>Applied Position</Th>
          <Th icon={<Award size={11} />} align="center">Comm Rating</Th>
          <Th icon={<Clock size={11} />}>Expected CTC</Th>
          <Th icon={<CheckCircle size={11} />}>Status</Th>
          <Th align="right">Operational Action</Th>
        </THead>
        <TBody>
          {hrCallCandidates.length === 0 ? (
            <tr>
              <Td colSpan={7} className="py-8 text-center text-gray-500">
                No candidates are currently scheduled or completed for introductory HR calls.
              </Td>
            </tr>
          ) : (
            hrCallCandidates.map(c => (
              <Tr key={c.id} selected={sel.isSelected(c.id)} onClick={() => onSelectCandidate(c.id)}>
                <Td select checked={sel.isSelected(c.id)} onToggle={() => sel.toggle(c.id)} />
                <Td className="font-semibold text-gray-900">{c.fullName}</Td>
                <Td>
                  {c.appliedRole} ({c.department})
                </Td>
                <Td align="center" className="font-bold">
                  {c.hrCall?.completed ? `⭐ ${c.hrCall.communicationRating}/5` : 'Pending Call'}
                </Td>
                <Td className="font-mono">{c.hrCall?.completed ? c.hrCall.expectedCtc : c.expectedCtc}</Td>
                <Td>
                  <StatusPill
                    tone={c.hrCall?.completed ? 'green' : 'amber'}
                    label={c.hrCall?.completed ? 'Summary Filed' : 'Action Required'}
                  />
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          {
                            key: 'shortlist',
                            label: c.status === 'Shortlisted' ? 'Shortlisted' : 'Shortlist & Schedule',
                            icon: <UserCheck size={13} />,
                            disabled: c.status === 'Shortlisted' || !onShortlistCandidate,
                            onClick: () => onShortlistCandidate?.(c.id, c.fullName),
                          },
                          {
                            key: 'bgv',
                            label: 'BGV Verification',
                            icon: <ShieldCheck size={13} />,
                            onClick: () => openCandidate(c.id, 'bgv'),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            danger: true,
                            disabled: !onDeleteCandidate,
                            onClick: () =>
                              toast.confirm({
                                title: `Remove ${c.fullName}?`,
                                description: 'They will be taken off the pipeline.',
                                confirmLabel: 'Remove',
                                onConfirm: () => onDeleteCandidate?.(c.id),
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
    </div>
  );
}

// ==========================================
// 2. INTERVIEWS VIEW
// ==========================================
interface InterviewsViewProps {
  interviews: Interview[];
  candidates: Candidate[];
  onAddNewInterview: (newInt: Interview) => void;
  onSelectCandidate?: (id: string) => void;
  onShortlistCandidate?: (id: string, name: string) => void;
  onDeleteInterview?: (id: string) => void;
  onSelectForRole?: (candidateId: string, candidateName: string) => void;
}

export function InterviewsView({
  interviews,
  candidates,
  onAddNewInterview,
  onSelectCandidate,
  onShortlistCandidate,
  onDeleteInterview,
  onSelectForRole,
}: InterviewsViewProps) {
  const toast = useToast();
  const { openCandidate } = useUiStore();
  const { data: schedules = [] } = useSchedules();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    candidateId: candidates[0]?.id || '',
    round: 'Technical Live Code (React)',
    interviewer: 'Donald Knuth',
    dateTime: '2026-06-12T10:00',
    mode: 'Google Meet' as 'Google Meet' | 'Zoom' | 'In-Person',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = candidates.find(c => c.id === form.candidateId);
    if (!candidate) return;

    const newInt: Interview = {
      id: `INT-${Math.floor(100 + Math.random() * 900)}`,
      candidateId: form.candidateId,
      candidateName: candidate.fullName,
      appliedRole: candidate.appliedRole,
      department: candidate.department,
      interviewRound: form.round,
      interviewerName: form.interviewer,
      dateTime: form.dateTime,
      meetingMode: form.mode,
      meetingLink:
        form.mode === 'In-Person' ? 'HQ Main conference Room' : 'https://meet.google.com/qwe-rty-uiop',
      durationMinutes: 45,
      status: 'Scheduled',
    };
    onAddNewInterview(newInt);
    setShowAddModal(false);
    toast.success(`Interview scheduled for ${candidate.fullName}.`);
  };

  // Interviews booked through the scheduler live in the schedules store (not the
  // interviews resource), so surface those here too — otherwise a scheduled
  // interview would be invisible on this page.
  const scheduledInterviews: Interview[] = schedules
    .filter(s => s.type === 'Interview' && s.status !== 'Cancelled')
    .filter(s => !interviews.some(iv => iv.candidateId === s.candidateId && iv.dateTime === s.dateTime))
    .map(s => {
      const c = candidates.find(x => x.id === s.candidateId);
      return {
        id: s.id,
        candidateId: s.candidateId,
        candidateName: s.candidateName,
        appliedRole: c?.appliedRole ?? '',
        department: c?.department ?? '',
        interviewRound: 'Interview',
        interviewerName: 'To be assigned',
        dateTime: s.dateTime,
        meetingMode: 'In-Person',
        meetingLink: 'Office',
        durationMinutes: 45,
        status: s.status === 'Completed' ? 'Completed' : 'Scheduled',
      } satisfies Interview;
    });
  const allInterviews = [...interviews, ...scheduledInterviews];
  const sel = useTableSelection(allInterviews.map(i => i.id));

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Interview Panel & Scheduling
          </h2>
          <p className="text-gray-500 text-[11px]">
            Coordinate panel feedback, calendar alignments, and digital meet bridges.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-accent-600 hover:bg-accent-700 text-white px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1 cursor-pointer transition shrink-0 self-start sm:self-auto"
        >
          <Plus size={14} /> Schedule Interview
        </button>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule candidate panel</DialogTitle>
            <DialogDescription>Set up an interview slot for a candidate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Select Available Candidate</label>
              <Select
                value={form.candidateId}
                onChange={e => setForm({ ...form, candidateId: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.appliedRole})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Interview Session Round</label>
              <input
                type="text"
                value={form.round}
                onChange={e => setForm({ ...form, round: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Assigned Interviewer</label>
              <input
                type="text"
                value={form.interviewer}
                onChange={e => setForm({ ...form, interviewer: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Date & Slot Time</label>
              <DateTimePicker
                value={form.dateTime}
                onChange={v => setForm({ ...form, dateTime: v })}
                step={15}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Platform Link Mode</label>
              <Select
                value={form.mode}
                onChange={e => setForm({ ...form, mode: e.target.value as any })}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              >
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom Video</option>
                <option value="In-Person">In-Person (Office)</option>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Confirm Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scheduled interviews table */}
      <SelectionBar count={sel.count} onClear={sel.clear} />
      <Table minWidth={900}>
        <THead>
          <Th select checked={sel.allSelected} indeterminate={sel.someSelected} onToggle={sel.toggleAll} />
          <Th icon={<UserCheck size={11} />}>Candidate</Th>
          <Th icon={<Briefcase size={11} />}>Role</Th>
          <Th icon={<Award size={11} />}>Round</Th>
          <Th icon={<Users size={11} />}>Panel evaluator</Th>
          <Th icon={<Clock size={11} />}>Slot time</Th>
          <Th icon={<Video size={11} />}>Access mode</Th>
          <Th icon={<CheckCircle size={11} />}>Status</Th>
          <Th align="right">Actions</Th>
        </THead>
        <TBody>
          {allInterviews.length === 0 ? (
            <tr>
              <Td colSpan={9}>
                <EmptyState
                  icon={UserCheck}
                  title="No interviews scheduled"
                  description="Scheduled interviews appear here. Use “Schedule Interview”, or schedule one from a candidate / assignment grade."
                  className="border-0 bg-transparent py-10"
                />
              </Td>
            </tr>
          ) : (
            allInterviews.map(i => (
              <Tr
                key={i.id}
                selected={sel.isSelected(i.id)}
                onClick={onSelectCandidate ? () => onSelectCandidate(i.candidateId) : undefined}
              >
                <Td select checked={sel.isSelected(i.id)} onToggle={() => sel.toggle(i.id)} />
                <Td className="font-semibold text-gray-900">{i.candidateName}</Td>
                <Td className="text-gray-600">
                  {i.appliedRole} <span className="text-gray-400">• {i.department}</span>
                </Td>
                <Td>
                  <span className="rounded bg-accent-50 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-600">
                    {i.interviewRound}
                  </span>
                </Td>
                <Td className="text-gray-700">{i.interviewerName}</Td>
                <Td className="font-mono text-[11px] text-gray-700">
                  {new Date(i.dateTime).toLocaleDateString()}{' '}
                  {new Date(i.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Td>
                <Td>
                  <span className="flex items-center gap-1 text-accent-600">
                    {i.meetingMode === 'In-Person' ? <MapPin size={12} /> : <Video size={12} />}
                    {i.meetingMode}
                  </span>
                </Td>
                <Td>
                  <StatusPill tone={i.status === 'Completed' ? 'green' : 'amber'} label={i.status} />
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          {
                            key: 'select',
                            label: 'Select for role',
                            icon: <Award size={13} />,
                            disabled: !onSelectForRole,
                            onClick: () =>
                              toast.confirm({
                                title: `Select ${i.candidateName} for the role?`,
                                description:
                                  'Marks them selected and emails them to confirm their availability to join.',
                                confirmLabel: 'Select & email',
                                onConfirm: () => onSelectForRole?.(i.candidateId, i.candidateName),
                              }),
                          },
                          {
                            key: 'shortlist',
                            label: 'Schedule another round',
                            icon: <UserCheck size={13} />,
                            disabled: !onShortlistCandidate,
                            onClick: () => onShortlistCandidate?.(i.candidateId, i.candidateName),
                          },
                          {
                            key: 'bgv',
                            label: 'BGV Verification',
                            icon: <ShieldCheck size={13} />,
                            onClick: () => openCandidate(i.candidateId, 'bgv'),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            danger: true,
                            disabled: !onDeleteInterview,
                            onClick: () =>
                              toast.confirm({
                                title: `Delete the ${i.interviewRound} interview?`,
                                description: `For ${i.candidateName}.`,
                                confirmLabel: 'Delete',
                                onConfirm: () => onDeleteInterview?.(i.id),
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
    </div>
  );
}

// ==========================================
// 3. IQ & ASSIGNMENTS VIEW
// ==========================================
interface IQViewProps {
  iqTests: IQTest[];
  assignments: Assignment[];
  onSelectCandidate?: (id: string) => void;
  onShortlistCandidate?: (id: string, name: string) => void;
  onDeleteTest?: (id: string) => void;
}

export function IQTestAssignmentsView({
  iqTests,
  assignments,
  onSelectCandidate,
  onShortlistCandidate,
  onDeleteTest,
}: IQViewProps) {
  const toast = useToast();
  const { openCandidate } = useUiStore();
  const { openSchedule } = useScheduler();
  const { data: candidates = [] } = useCandidates();
  const { data: schedules = [] } = useSchedules();
  const [activeTab, setActiveTab] = useState<'iq' | 'assignments'>('iq');

  // Candidates ready for / sitting in the IQ round but without a result yet:
  // anyone shortlisted (e.g. just cleared the HR call) or with a live IQ-test
  // booking, minus those who already have a completed IQ record.
  const completedIqIds = new Set(iqTests.map(t => t.candidateId));
  const scheduledIq = new Map(
    schedules
      .filter(s => s.type === 'IQ Test' && s.status !== 'Cancelled')
      .map(s => [s.candidateId, s] as const),
  );
  const awaitingIq = candidates.filter(
    c => !completedIqIds.has(c.id) && (scheduledIq.has(c.id) || c.status === 'Shortlisted'),
  );
  const selAwait = useTableSelection(awaitingIq.map(c => c.id));
  const selIq = useTableSelection(iqTests.map(t => t.id));

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Assessments & Assignments Library
          </h2>
          <p className="text-gray-500 text-[11px]">
            Role-based question building, IQ metrics automatic scoring, and trial repo reviews.
          </p>
        </div>
        <div className="border border-[#E4E6EA] rounded-lg bg-[#FFFFFF] overflow-hidden flex font-semibold text-xs shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('iq')}
            className={`px-3 py-1.5 transition ${activeTab === 'iq' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EDEEF1]'}`}
          >
            IQ Test Logs
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-1.5 transition ${activeTab === 'assignments' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EDEEF1]'}`}
          >
            Submissions Queue
          </button>
        </div>
      </div>

      {activeTab === 'iq' ? (
        <div className="space-y-4">
          {/* Shortlisted candidates flow into the IQ round here, even before a
              result exists, so the next step is always visible to HR. */}
          {awaitingIq.length > 0 && (
            <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl overflow-hidden">
              <div className="flex items-center gap-1.5 bg-[#F7F8FA] border-b border-[#E4E6EA] px-3 py-2 text-gray-700 font-semibold">
                <UserCheck size={13} className="text-accent-600" />
                <span>Awaiting IQ Test</span>
                <span className="text-[10px] font-mono text-gray-500">({awaitingIq.length})</span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <THead>
                  <Th select checked={selAwait.allSelected} indeterminate={selAwait.someSelected} onToggle={selAwait.toggleAll} />
                  <Th icon={<UserCheck size={11} />}>Candidate</Th>
                  <Th icon={<Briefcase size={11} />}>Applied position</Th>
                  <Th icon={<Clock size={11} />}>Stage</Th>
                  <Th align="right">Actions</Th>
                </THead>
                <TBody>
                  {awaitingIq.map(c => {
                    const sched = scheduledIq.get(c.id);
                    return (
                      <Tr
                        key={c.id}
                        selected={selAwait.isSelected(c.id)}
                        onClick={onSelectCandidate ? () => onSelectCandidate(c.id) : undefined}
                      >
                        <Td select checked={selAwait.isSelected(c.id)} onToggle={() => selAwait.toggle(c.id)} />
                        <Td className="font-semibold text-gray-900">{c.fullName}</Td>
                        <Td>
                          {c.appliedRole} ({c.department})
                        </Td>
                        <Td>
                          <StatusPill
                            tone={sched ? 'amber' : 'blue'}
                            label={sched ? `Scheduled · ${new Date(sched.dateTime).toLocaleDateString()}` : 'Ready to schedule'}
                          />
                        </Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => openSchedule(c.id, c.fullName, 'IQ Test')}
                              className="text-[10px] bg-accent-600 hover:bg-accent-700 text-white px-3 py-1 rounded-md font-semibold cursor-pointer transition"
                            >
                              {sched ? 'Reschedule' : 'Schedule IQ Test'}
                            </button>
                            <ActionMenu
                              items={[
                                {
                                  key: 'bgv',
                                  label: 'BGV Verification',
                                  icon: <ShieldCheck size={13} />,
                                  onClick: () => openCandidate(c.id, 'bgv'),
                                },
                              ]}
                            />
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </table>
              </div>
            </div>
          )}

          <SelectionBar count={selIq.count} onClear={selIq.clear} />
          <Table minWidth={820}>
            <THead>
              <Th select checked={selIq.allSelected} indeterminate={selIq.someSelected} onToggle={selIq.toggleAll} />
              <Th icon={<UserCheck size={11} />}>Candidate</Th>
              <Th icon={<CalendarDays size={11} />}>Test Date</Th>
              <Th icon={<BrainCircuit size={11} />}>Attempted questions</Th>
              <Th icon={<TrendingUp size={11} />}>Succeeded percentage</Th>
              <Th icon={<CheckCircle size={11} />}>Qualification</Th>
              <Th icon={<FileText size={11} />}>Remarks</Th>
              <Th align="right">Actions</Th>
            </THead>
            <TBody>
              {iqTests.map(idx => (
                <Tr
                  key={idx.id}
                  selected={selIq.isSelected(idx.id)}
                  onClick={onSelectCandidate ? () => onSelectCandidate(idx.candidateId) : undefined}
                >
                  <Td select checked={selIq.isSelected(idx.id)} onToggle={() => selIq.toggle(idx.id)} />
                  <Td className="font-semibold text-gray-900">{idx.candidateName}</Td>
                  <Td className="font-mono">{idx.testDate}</Td>
                  <Td className="font-mono">
                    {idx.questionsAttempted} / {idx.totalQuestions}
                  </Td>
                  <Td className="font-bold text-accent-600">{idx.scorePercentage}%</Td>
                  <Td>
                    <StatusPill
                      active={idx.qualificationStatus === 'Passed'}
                      activeLabel={idx.qualificationStatus}
                      inactiveLabel={idx.qualificationStatus}
                    />
                  </Td>
                  <Td className="text-gray-500">{idx.remarks}</Td>
                  <Td align="right">
                    <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          {
                            key: 'shortlist',
                            label: 'Shortlist & Schedule',
                            icon: <UserCheck size={13} />,
                            disabled: !onShortlistCandidate,
                            onClick: () => onShortlistCandidate?.(idx.candidateId, idx.candidateName),
                          },
                          {
                            key: 'bgv',
                            label: 'BGV Verification',
                            icon: <ShieldCheck size={13} />,
                            onClick: () => openCandidate(idx.candidateId, 'bgv'),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            danger: true,
                            disabled: !onDeleteTest,
                            onClick: () =>
                              toast.confirm({
                                title: 'Delete this IQ test record?',
                                description: `For ${idx.candidateName}.`,
                                confirmLabel: 'Delete',
                                onConfirm: () => onDeleteTest?.(idx.id),
                              }),
                          },
                        ]}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(asm => (
            <div key={asm.id} className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start border-b border-[#EDEEF1] pb-2">
                <div>
                  <h4 className="font-bold text-gray-900">{asm.assignmentTitle}</h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    Role: {asm.role} • Max Score: {asm.maximumMarks} • Pass: {asm.passingMarks}
                  </p>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600`}
                >
                  {asm.difficultyLevel} Difficulty
                </span>
              </div>

              <p className="text-gray-600 bg-[#EDEEF1] p-3 rounded-lg">{asm.instructions}</p>

              <div>
                <h5 className="font-bold text-[10px] uppercase font-mono text-gray-500 mb-2">
                  Candidate submissions ({asm.submissions.length})
                </h5>
                <div className="space-y-2">
                  {asm.submissions.map(sub => (
                    <div
                      key={sub.id}
                      className="border border-[#ECEDF0] rounded-lg p-3 flex justify-between items-center text-xs bg-[#F7F8FA]"
                    >
                      <div>
                        <span className="font-semibold text-gray-900">{sub.candidateName}</span>
                        <p className="text-[10px] text-gray-500 font-mono">
                          Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {sub.grading ? (
                        <div className="text-right">
                          <span className="font-bold text-emerald-600">
                            {sub.grading.overallScore} / {asm.maximumMarks}
                          </span>
                          <span className="text-[10px] text-gray-500 block italic mt-0.5">
                            "{sub.grading.evaluatorComments}"
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded">
                          Pending Evaluation
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. ONBOARDING VIEW (Linear-style checklist)
// ==========================================
interface OnboardingViewProps {
  onboarding: OnboardingChecklist[];
}

export function OnboardingChecklistView({ onboarding }: OnboardingViewProps) {
  const router = useRouter();

  return (
    <div className="space-y-4 text-xs select-none">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          Onboarding Progress Tracker
        </h2>
        <p className="text-gray-500 text-[11px]">
          Checklist-driven joiner actions. Open a joiner to manage their checklist and journey.
        </p>
      </div>

      {/* Joiners table — click a row to open their full onboarding page */}
      {onboarding.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-6 text-center text-gray-500">
          No candidates in the onboarding pipeline presently.
        </div>
      ) : (
        <Table minWidth={560}>
          <THead>
            <Th icon={<UserCheck size={11} />}>Candidate</Th>
            <Th icon={<Boxes size={11} />}>Status</Th>
            <Th icon={<CheckCircle size={11} />}>Progress</Th>
            <Th align="right">Open</Th>
          </THead>
          <TBody>
            {onboarding.map(o => (
              <Tr key={o.candidateId} onClick={() => router.push(`/onboarding/${o.candidateId}`)}>
                <Td className="font-semibold text-gray-900">{o.candidateName}</Td>
                <Td>
                  <TagPill color={o.progressPercentage === 100 ? 'green' : 'blue'}>
                    {o.onboardingStatus}
                  </TagPill>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EDEEF1]">
                      <div
                        className="h-full rounded-full bg-accent-600"
                        style={{ width: `${o.progressPercentage}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-gray-600">{o.progressPercentage}%</span>
                  </div>
                </Td>
                <Td align="right">
                  <ChevronRight size={14} className="inline text-gray-400" />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

// ==========================================
// 5. EMPLOYEE DIRECTORY VIEW
// ==========================================
interface DirectoryViewProps {
  employees: Employee[];
  onSelectEmployee: (id: string) => void;
  onUpdateEmployee: (updated: Employee) => void;
  onAddEmployee?: (employee: Employee) => void;
  /** Permanently delete the given employees (by id) from the directory. */
  onDeleteEmployees?: (ids: string[]) => void;
}

const EMPTY_EMPLOYEE_FORM = {
  fullName: '',
  email: '',
  phone: '',
  department: 'Engineering',
  role: '',
  employmentType: 'Full-time' as NonNullable<Employee['employmentType']>,
  reportingManager: '',
  joiningDate: new Date().toISOString().split('T')[0],
  workLocation: 'Mumbai, India',
  status: 'Active' as Employee['status'],
  annualCtc: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  emergencyContact: '',
  panNumber: '',
  aadhaarNumber: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
};

export function EmployeeDirectoryView({
  employees,
  onSelectEmployee,
  onUpdateEmployee,
  onAddEmployee,
  onDeleteEmployees,
}: DirectoryViewProps) {
  const toast = useToast();
  const org = useOrgSettings();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [empForm, setEmpForm] = useState(EMPTY_EMPLOYEE_FORM);

  const departments = ['All', ...org.departments];

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.fullName.trim() || !empForm.role.trim()) {
      toast.error('Full name and role are required.');
      return;
    }
    const acct = empForm.accountNumber.trim();
    const ifsc = empForm.ifsc.trim();
    const created: Employee = {
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: empForm.fullName.trim(),
      email: empForm.email.trim(),
      phone: empForm.phone.trim(),
      department: empForm.department,
      role: empForm.role.trim(),
      employmentType: empForm.employmentType,
      reportingManager: empForm.reportingManager.trim() || '—',
      joiningDate: empForm.joiningDate,
      workLocation: empForm.workLocation.trim(),
      status: empForm.status,
      annualCtc: empForm.annualCtc.trim() || undefined,
      personalDetails: {
        address: empForm.address.trim(),
        emergencyContact: empForm.emergencyContact.trim(),
        // Keep the combined field populated for older views that read it.
        bankAccount: [acct, ifsc].filter(Boolean).join(' · '),
        dateOfBirth: empForm.dateOfBirth || undefined,
        gender: empForm.gender.trim() || undefined,
        panNumber: empForm.panNumber.trim().toUpperCase() || undefined,
        aadhaarNumber: empForm.aadhaarNumber.trim() || undefined,
        bankName: empForm.bankName.trim() || undefined,
        accountNumber: acct || undefined,
        ifsc: ifsc.toUpperCase() || undefined,
      },
      credentials: [],
      assets: [],
      appraisalHistory: [],
    };
    onAddEmployee?.(created);
    setShowAddForm(false);
    setEmpForm(EMPTY_EMPLOYEE_FORM);
    toast.success(`${created.fullName} added to the directory (${created.id}).`);
  };

  const filtered = employees.filter(e => {
    const matchesSearch =
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'All' || e.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const sel = useTableSelection(filtered.map(e => e.id));
  const empStatusTone = (s: Employee['status']): 'green' | 'amber' | 'gray' | 'red' =>
    s === 'Active' ? 'green' : s === 'On Leave' ? 'amber' : s === 'Offboarded' ? 'gray' : 'red';

  const deleteSelected = () => {
    const ids = sel.selectedIds;
    if (ids.length === 0) return;
    const names = employees
      .filter(e => ids.includes(e.id))
      .map(e => e.fullName);
    const label =
      names.length === 1 ? names[0] : `${names.length} employees`;
    toast.confirm({
      title: `Delete ${label}?`,
      description: 'This permanently removes the employee record from the directory. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        onDeleteEmployees?.(ids);
        sel.clear();
        toast.success(
          names.length === 1
            ? `${names[0]} removed from the directory.`
            : `${names.length} employees removed from the directory.`,
        );
      },
    });
  };

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            {BRAND.name} Active Employee Directory
          </h2>
          <p className="text-gray-500 text-[11px]">
            Browse employee records, issued system logins, assigned hardware, and historic review scorecards.
          </p>
        </div>

        {/* Directory filter bars */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">
              <Search size={13} />
            </span>
            <input
              type="text"
              placeholder="Filter names..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full sm:w-52 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] pl-8 pr-3 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </div>

          <Select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="h-9 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-3 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>

          {onAddEmployee && (
            <button
              id="btn-add-employee"
              onClick={() => setShowAddForm(true)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 text-xs font-semibold text-white transition hover:bg-accent-700"
            >
              <Plus size={14} /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Employee table */}
      <SelectionBar count={sel.count} onClear={sel.clear}>
        {onDeleteEmployees && (
          <button
            onClick={deleteSelected}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-[#FFFFFF] px-2 py-1 font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
      </SelectionBar>
      <Table minWidth={860}>
        <THead>
          <Th select checked={sel.allSelected} indeterminate={sel.someSelected} onToggle={sel.toggleAll} />
          <Th icon={<Users size={11} />}>Employee</Th>
          <Th icon={<KeyRound size={11} />}>ID</Th>
          <Th icon={<Briefcase size={11} />}>Role</Th>
          <Th icon={<Boxes size={11} />}>Department</Th>
          <Th icon={<MapPin size={11} />}>Location</Th>
          <Th icon={<CalendarDays size={11} />}>Joined</Th>
          <Th icon={<CheckCircle size={11} />}>Status</Th>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <tr>
              <Td colSpan={8}>
                <EmptyState
                  icon={Users}
                  title={employees.length === 0 ? 'No employees yet' : 'No matches'}
                  description={
                    employees.length === 0
                      ? 'Active employees will appear here once added.'
                      : 'No employees match the current filters.'
                  }
                  className="border-0 bg-transparent py-10"
                />
              </Td>
            </tr>
          ) : (
            filtered.map(emp => (
              <Tr key={emp.id} selected={sel.isSelected(emp.id)} onClick={() => onSelectEmployee(emp.id)}>
                <Td select checked={sel.isSelected(emp.id)} onToggle={() => sel.toggle(emp.id)} />
                <Td>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {emp.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={emp.avatarUrl}
                        alt=""
                        className="size-7 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-[10px] font-bold text-purple-600">
                        {emp.fullName
                          .split(' ')
                          .map(n => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-gray-900">{emp.fullName}</p>
                      {emp.email && <p className="truncate font-mono text-[10px] text-gray-500">{emp.email}</p>}
                    </div>
                  </div>
                </Td>
                <Td className="font-mono text-[11px] text-gray-500">{emp.id}</Td>
                <Td className="font-semibold text-gray-700">{emp.role}</Td>
                <Td>
                  <TagPill color={deptDot(emp.department)}>{emp.department}</TagPill>
                </Td>
                <Td className="text-gray-500">{emp.workLocation}</Td>
                <Td className="font-mono text-[11px] text-gray-500">{emp.joiningDate}</Td>
                <Td>
                  <StatusPill tone={empStatusTone(emp.status)} label={emp.status} />
                </Td>
              </Tr>
            ))
          )}
        </TBody>
      </Table>

      {/* Add Employee modal — register existing staff with full details */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add employee to directory</DialogTitle>
            <DialogDescription>Register existing staff with their full details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={empForm.fullName}
                  onChange={e => setEmpForm({ ...empForm, fullName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Role / Designation *</label>
                <EditableSelect
                  value={empForm.role}
                  onChange={v => setEmpForm({ ...empForm, role: v })}
                  options={org.roles}
                  onAdd={v => org.add('roles', v)}
                  placeholder="Select role"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Work Email</label>
                <input
                  type="email"
                  placeholder="name@optiminastic.com"
                  value={empForm.email}
                  onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Phone</label>
                <input
                  type="text"
                  placeholder="+91 ..."
                  value={empForm.phone}
                  onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Department</label>
                <EditableSelect
                  value={empForm.department}
                  onChange={v => setEmpForm({ ...empForm, department: v })}
                  options={org.departments}
                  onAdd={v => org.add('departments', v)}
                  placeholder="Select department"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Status</label>
                <Select
                  value={empForm.status}
                  onChange={e =>
                    setEmpForm({ ...empForm, status: e.target.value as Employee['status'] })
                  }
                  className="w-full px-2 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1]"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Suspended">Suspended</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Joining Date</label>
                <DatePicker
                  value={empForm.joiningDate}
                  onChange={v => setEmpForm({ ...empForm, joiningDate: v })}
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Work Location</label>
                <input
                  type="text"
                  placeholder="Mumbai, India"
                  value={empForm.workLocation}
                  onChange={e => setEmpForm({ ...empForm, workLocation: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Employment Type</label>
                <Select
                  value={empForm.employmentType}
                  onChange={e =>
                    setEmpForm({
                      ...empForm,
                      employmentType: e.target.value as NonNullable<Employee['employmentType']>,
                    })
                  }
                  className="w-full px-2 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1]"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Intern">Intern</option>
                  <option value="Contract">Contract</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Annual CTC</label>
                <input
                  type="text"
                  placeholder="e.g. 12 LPA"
                  value={empForm.annualCtc}
                  onChange={e => setEmpForm({ ...empForm, annualCtc: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Reporting Manager</label>
              <input
                type="text"
                placeholder="e.g. Akshae (Director)"
                value={empForm.reportingManager}
                onChange={e => setEmpForm({ ...empForm, reportingManager: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              />
            </div>

            <div className="pt-1 border-t border-[#ECEDF0]">
              <p className="font-bold text-gray-500 font-mono text-[9px] uppercase tracking-wider mb-2">
                Personal records (optional)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Date of Birth</label>
                  <DatePicker
                    value={empForm.dateOfBirth}
                    onChange={v => setEmpForm({ ...empForm, dateOfBirth: v })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Gender</label>
                  <Select
                    value={empForm.gender}
                    onChange={e => setEmpForm({ ...empForm, gender: e.target.value })}
                    className="w-full px-2 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1]"
                  >
                    <option value="">—</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-semibold text-gray-700">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="Name · +91 ..."
                    value={empForm.emergencyContact}
                    onChange={e => setEmpForm({ ...empForm, emergencyContact: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
              </div>

              <div className="space-y-1 mt-3.5">
                <label className="font-semibold text-gray-700">Address</label>
                <input
                  type="text"
                  placeholder="Mailing address"
                  value={empForm.address}
                  onChange={e => setEmpForm({ ...empForm, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              </div>

              <p className="font-bold text-gray-500 font-mono text-[9px] uppercase tracking-wider mb-2 mt-4">
                Statutory &amp; bank (optional)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">PAN</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={empForm.panNumber}
                    onChange={e => setEmpForm({ ...empForm, panNumber: e.target.value.toUpperCase() })}
                    maxLength={10}
                    className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] font-mono uppercase focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Aadhaar</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012"
                    value={empForm.aadhaarNumber}
                    onChange={e => setEmpForm({ ...empForm, aadhaarNumber: e.target.value.replace(/[^0-9 ]/g, '').slice(0, 14) })}
                    className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] font-mono focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={empForm.bankName}
                    onChange={e => setEmpForm({ ...empForm, bankName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-semibold text-gray-700">Account Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Bank account number"
                    value={empForm.accountNumber}
                    onChange={e => setEmpForm({ ...empForm, accountNumber: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] font-mono focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">IFSC</label>
                  <input
                    type="text"
                    placeholder="HDFC0001234"
                    value={empForm.ifsc}
                    onChange={e => setEmpForm({ ...empForm, ifsc: e.target.value.toUpperCase() })}
                    maxLength={11}
                    className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1] font-mono uppercase focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Add to Directory</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// 6. CREDENTIALS & ASSETS VIEW
// ==========================================
interface CredentialsAssetsViewProps {
  employees: Employee[];
  assets: AssetRecord[];
  onUpdateAsset: (updated: AssetRecord) => void;
  onUpdateCredential: (empId: string, credId: string, targetStatus: string) => void;
}

export function CredentialsAssetsView({
  employees,
  assets,
  onUpdateAsset,
  onUpdateCredential,
}: CredentialsAssetsViewProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'creds' | 'assets'>('creds');

  // Local asset edit form
  const [editingAssetId, setEditingAssetId] = useState('');
  const [assetStatus, setAssetStatus] = useState('Available');

  const handleAssetStatusChange = (astId: string, value: string) => {
    const target = assets.find(a => a.id === astId);
    if (!target) return;
    const updated: AssetRecord = {
      ...target,
      status: value as any,
    };
    onUpdateAsset(updated);
    toast.success(`Asset status updated to "${value}".`);
  };

  const selCreds = useTableSelection(employees.flatMap(emp => (emp.credentials || []).map(c => c.id)));
  const selAssets = useTableSelection(assets.map(a => a.id));
  const credTone = (s: string): 'green' | 'red' | 'gray' =>
    s === 'Active' ? 'green' : s === 'Suspended' ? 'red' : 'gray';
  const assetTone = (s: string): 'green' | 'blue' | 'red' =>
    s === 'Available' ? 'green' : s === 'Assigned' ? 'blue' : 'red';

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Credentials & IT Hardware Assets
          </h2>
          <p className="text-gray-500 text-[11px]">
            Security access controls list and physical company inventory logs.
          </p>
        </div>

        <div className="border border-[#E4E6EA] rounded-lg bg-[#FFFFFF] overflow-hidden flex font-semibold text-xs shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('creds')}
            className={`px-3 py-1.5 transition ${activeTab === 'creds' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EDEEF1]'}`}
          >
            System Credentials
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1.5 transition ${activeTab === 'assets' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EDEEF1]'}`}
          >
            Hardware Inventory
          </button>
        </div>
      </div>

      {activeTab === 'creds' ? (
        <>
          <SelectionBar count={selCreds.count} onClear={selCreds.clear} />
          <Table minWidth={860}>
            <THead>
              <Th select checked={selCreds.allSelected} indeterminate={selCreds.someSelected} onToggle={selCreds.toggleAll} />
              <Th icon={<Users size={11} />}>Employee</Th>
              <Th icon={<Terminal size={11} />}>Target System</Th>
              <Th icon={<Mail size={11} />}>Assigned Identity</Th>
              <Th icon={<ShieldCheck size={11} />} align="center">Perm Match</Th>
              <Th icon={<KeyRound size={11} />} align="center">Security PIN</Th>
              <Th icon={<CheckCircle size={11} />}>State</Th>
              <Th align="right">Moderator Control</Th>
            </THead>
            <TBody>
              {employees.flatMap(emp =>
                (emp.credentials || []).map(cred => (
                  <Tr key={cred.id} selected={selCreds.isSelected(cred.id)}>
                    <Td select checked={selCreds.isSelected(cred.id)} onToggle={() => selCreds.toggle(cred.id)} />
                    <Td className="font-semibold text-gray-900">{emp.fullName}</Td>
                    <Td className="font-medium text-gray-800">{cred.systemName}</Td>
                    <Td className="font-mono">{cred.assignedEmail}</Td>
                    <Td align="center" className="font-semibold">{cred.accessLevel}</Td>
                    <Td align="center" className="select-all font-mono text-gray-500">••••••••••</Td>
                    <Td>
                      <StatusPill tone={credTone(cred.status)} label={cred.status} />
                    </Td>
                    <Td align="right">
                      <Select
                        value={cred.status}
                        onChange={e => onUpdateCredential(emp.id, cred.id, e.target.value)}
                        className="text-[10px] bg-[#FFFFFF] border border-[#E4E6EA] px-1.5 py-1 rounded cursor-pointer text-gray-600 focus:ring-1 focus:ring-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                      >
                        <option value="Active">Grant Active</option>
                        <option value="Suspended">Suspend Access</option>
                        <option value="Revoked">Revoke Key</option>
                      </Select>
                    </Td>
                  </Tr>
                )),
              )}
            </TBody>
          </Table>
        </>
      ) : (
        <>
          <SelectionBar count={selAssets.count} onClear={selAssets.clear} />
          <Table minWidth={820}>
            <THead>
              <Th select checked={selAssets.allSelected} indeterminate={selAssets.someSelected} onToggle={selAssets.toggleAll} />
              <Th icon={<KeyRound size={11} />}>Asset ID</Th>
              <Th icon={<Laptop size={11} />}>Specification</Th>
              <Th icon={<Boxes size={11} />}>Item Category</Th>
              <Th icon={<Users size={11} />}>Assigned To</Th>
              <Th icon={<CheckCircle size={11} />}>Status</Th>
              <Th align="right">Condition / Modification</Th>
            </THead>
            <TBody>
              {assets.map(ast => (
                <Tr key={ast.id} selected={selAssets.isSelected(ast.id)}>
                  <Td select checked={selAssets.isSelected(ast.id)} onToggle={() => selAssets.toggle(ast.id)} />
                  <Td className="font-mono font-bold text-gray-700">{ast.id}</Td>
                  <Td className="font-semibold text-gray-900">{ast.assetName}</Td>
                  <Td>{ast.assetType}</Td>
                  <Td>
                    {ast.assignedToEmployeeName ? (
                      <span className="font-medium text-gray-800">{ast.assignedToEmployeeName}</span>
                    ) : (
                      <span className="italic text-gray-500">Available in IT Depot</span>
                    )}
                  </Td>
                  <Td>
                    <StatusPill tone={assetTone(ast.status)} label={ast.status} />
                  </Td>
                  <Td align="right">
                    <Select
                      value={ast.status}
                      onChange={e => handleAssetStatusChange(ast.id, e.target.value)}
                      className="text-[10px] bg-[#FFFFFF] border border-[#E4E6EA] px-1.5 py-1 rounded cursor-pointer text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    >
                      <option value="Available">Available</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Under Repair">Under Repair</option>
                      <option value="Lost">Lost</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Retired">Retired</option>
                    </Select>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </div>
  );
}

// ==========================================
// 7. APPRAISALS VIEW
// ==========================================
interface AppraisalsViewProps {
  employees: Employee[];
  onSaveReview: (review: AppraisalRecord) => void;
}

export function AppraisalsView({ employees, onSaveReview }: AppraisalsViewProps) {
  const toast = useToast();
  const [selectedEmp, setSelectedEmp] = useState('');
  const [reviewForm, setReviewForm] = useState({
    reviewPeriod: 'Annual 2026',
    performanceScore: 5,
    targetAchievement: 'Met all database migration requirements ahead of time.',
    managerFeedback: 'Exceptional visual polish and systematic thinking.',
    hrFeedback: 'Highly collaborative team mate.',
    strengths: 'Peerless technical architecture.',
    improvementAreas: 'Document custom legacy configurations more frequently.',
    recommendedSalaryRevision: '',
    recommendedPromotion: 'Lead Full-stack Architect',
  });

  const targetEmp = employees.find(e => e.fullName === selectedEmp) ?? employees[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmp) return;

    const newReview: AppraisalRecord = {
      id: `APP-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      department: targetEmp.department,
      currentRole: targetEmp.role,
      currentSalary: '',
      reviewPeriod: reviewForm.reviewPeriod,
      reportingManager: targetEmp.reportingManager,
      performanceScore: Number(reviewForm.performanceScore),
      targetAchievement: reviewForm.targetAchievement,
      attendanceSummary: '98.5% compliance matched',
      productivitySummary: 'Completed tickets queue cleanly',
      managerFeedback: reviewForm.managerFeedback,
      hrFeedback: reviewForm.hrFeedback,
      strengths: reviewForm.strengths,
      improvementAreas: reviewForm.improvementAreas,
      recommendedSalaryRevision: reviewForm.recommendedSalaryRevision,
      recommendedPromotion: reviewForm.recommendedPromotion,
      finalDecision: 'Pending HR Board sign-off.',
      effectiveDate: '2026-07-01',
      status: 'HR Review Pending',
    };
    onSaveReview(newReview);
    toast.success(`Appraisal review saved for ${targetEmp.fullName}.`);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-[#F7F8FA] border-b border-[#E4E6EA] pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Appraisals & Growth Scorecards
          </h2>
          <p className="text-gray-500 text-[11px]">
            Systematic salary reviews, manager feedback recording, and promotion workflows.
          </p>
        </div>

        <Select
          value={selectedEmp}
          onChange={e => setSelectedEmp(e.target.value)}
          className="w-full sm:w-auto shrink-0 px-2.5 py-1 text-xs border border-[#E4E6EA] bg-[#FFFFFF] rounded font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {employees.map(e => (
            <option key={e.id} value={e.fullName}>
              {e.fullName}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <form
          onSubmit={handleSubmit}
          className="md:col-span-2 bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-4"
        >
          <h3 className="font-bold text-gray-900">Conduct Annual Appraisal Cycle Review</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Review Cycle Period</label>
              <input
                type="text"
                value={reviewForm.reviewPeriod}
                onChange={e => setReviewForm({ ...reviewForm, reviewPeriod: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Performance Score (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={reviewForm.performanceScore}
                onChange={e => setReviewForm({ ...reviewForm, performanceScore: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Annual Target Achievement & Deliverables</label>
            <textarea
              value={reviewForm.targetAchievement}
              onChange={e => setReviewForm({ ...reviewForm, targetAchievement: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Manager Qualitative Feedback</label>
            <textarea
              value={reviewForm.managerFeedback}
              onChange={e => setReviewForm({ ...reviewForm, managerFeedback: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recommended Promotion Target</label>
              <input
                type="text"
                value={reviewForm.recommendedPromotion}
                onChange={e => setReviewForm({ ...reviewForm, recommendedPromotion: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Proposed New CTC (LPA)</label>
              <input
                type="text"
                value={reviewForm.recommendedSalaryRevision}
                onChange={e => setReviewForm({ ...reviewForm, recommendedSalaryRevision: e.target.value })}
                placeholder="e.g. 22 LPA"
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="bg-accent-600 hover:bg-accent-700 text-white font-medium px-4 py-1.5 rounded-md cursor-pointer transition"
            >
              Document Scorecard
            </button>
          </div>
        </form>

        {/* Existing Appraisal track lists */}
        <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900 uppercase font-mono text-[10px] text-gray-500">
            Historic Logs
          </h3>

          {targetEmp?.appraisalHistory && targetEmp.appraisalHistory.length > 0 ? (
            targetEmp.appraisalHistory.map(hist => (
              <div key={hist.id} className="p-3 border border-[#ECEDF0] rounded-lg space-y-2 bg-[#F7F8FA]">
                <div className="flex justify-between items-center font-mono text-[9px]">
                  <span className="font-semibold text-accent-600">{hist.reviewPeriod}</span>
                  <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
                    {hist.status}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-800">Scorecard: ⭐ {hist.performanceScore} / 5</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    Promotion recommendation: {hist.recommendedPromotion}
                  </p>
                </div>
                <p className="text-gray-500 italic">"{hist.managerFeedback}"</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-xs">
              No annual review logs historically saved for this employee.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. OFFBOARDING & KT VIEW
// ==========================================
interface OffboardingViewProps {
  offboarding: OffboardingWorkflow[];
}

export function OffboardingChecklistView({ offboarding }: OffboardingViewProps) {
  const router = useRouter();

  return (
    <div className="space-y-4 text-xs select-none">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          Offboarding & exit Workflows
        </h2>
        <p className="text-gray-500 text-[11px]">
          Open an exit case to manage notice clearances, deliverables, and handover documents.
        </p>
      </div>

      {/* Exit cases table — click a row to open the full workflow page */}
      {offboarding.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-6 text-center text-gray-500">
          No live employee offboarding case in notice cycle currently.
        </div>
      ) : (
        <Table minWidth={640}>
          <THead>
            <Th icon={<Users size={11} />}>Employee</Th>
            <Th icon={<LogOut size={11} />}>Reason</Th>
            <Th icon={<CalendarDays size={11} />}>Last working day</Th>
            <Th icon={<ShieldCheck size={11} />}>Status</Th>
            <Th align="right">Open</Th>
          </THead>
          <TBody>
            {offboarding.map(o => (
              <Tr key={o.employeeId} onClick={() => router.push(`/offboarding/${o.employeeId}`)}>
                <Td className="font-semibold text-gray-900">{o.employeeName}</Td>
                <Td>
                  <TagPill color="amber">{o.triggerReason}</TagPill>
                </Td>
                <Td className="font-mono text-[11px] text-gray-600">{o.lastWorkingDay}</Td>
                <Td>
                  <StatusPill tone={o.status === 'Completed' ? 'green' : 'red'} label={o.status} />
                </Td>
                <Td align="right">
                  <ChevronRight size={14} className="inline text-gray-400" />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

// ==========================================
// 8. EMAIL CENTER (Triggers & templates)
// ==========================================
interface EmailCenterProps {
  emailTemplates: EmailTemplate[];
  sentMails: SentEmailLog[];
  onTriggerEmail: (templateId: string, recipientName: string, recipientEmail: string, fields: any) => void;
}

export function EmailCenterView({ emailTemplates, sentMails, onTriggerEmail }: EmailCenterProps) {
  const toast = useToast();
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [roleField, setRoleField] = useState('');

  const selectedTemplate = emailTemplates.find(t => t.id === activeTemplateId) ?? emailTemplates[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerEmail(selectedTemplate?.id || activeTemplateId, recipientName, recipientEmail, {
      '{{CANDIDATE_NAME}}': recipientName,
      '{{ROLE}}': roleField,
      '{{COMPANY_NAME}}': BRAND.company,
      '{{DATE_TIME}}': 'June 15, 2026, 14:30 PM EST',
      '{{MEETING_LINK}}': 'https://meet.google.com/xyz',
      '{{EXPIRE_DATE}}': 'June 18, 2026',
      '{{IQ_TEST_URL}}': 'https://opti-circle.io/tests/iq-sop',
    });
    toast.success(`Email sent to ${recipientName} (${recipientEmail}).`);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          Candidate Automations & Email Center
        </h2>
        <p className="text-gray-500 text-[11px]">
          System communication template builder, tracking mail delivery and candidate response times.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Template selector & trigger */}
        <form onSubmit={handleSend} className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Email Draft Trigger Creator</h3>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Choose Template Class</label>
            <Select
              value={activeTemplateId}
              onChange={e => setActiveTemplateId(e.target.value)}
              className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
            >
              {emailTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#EDEEF1]">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Role Dynamic Variable</label>
              <input
                type="text"
                value={roleField}
                onChange={e => setRoleField(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#E4E6EA] bg-[#EDEEF1] rounded"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-accent-600 hover:bg-accent-700 text-white font-medium py-2 rounded-md transition font-semibold"
          >
            Trigger Automated Dispatch
          </button>
        </form>

        {/* Live WYSIWYG Parser Preview */}
        {selectedTemplate && (
          <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-semibold">
                Live Variable Compilation Parser
              </span>
              <div className="border border-[#E4E6EA] p-3 rounded-lg bg-[#F7F8FA] font-mono text-[11px] text-gray-700 space-y-2 max-h-[300px] overflow-y-auto">
                <p className="font-bold text-gray-900 border-b border-gray-150 pb-1">
                  Subject: {selectedTemplate.subject.replace('{{ROLE}}', roleField)}
                </p>
                <p className="whitespace-pre-line leading-relaxed text-gray-600 pt-1">
                  {selectedTemplate.bodyTemplate
                    .replace('{{CANDIDATE_NAME}}', recipientName)
                    .replace('{{ROLE}}', roleField)
                    .replace('{{COMPANY_NAME}}', BRAND.company)
                    .replace('{{DATE_TIME}}', 'June 15, 2026, 14:30 PM')
                    .replace('{{MEETING_LINK}}', 'https://meet.google.com/xyz')
                    .replace('{{EXPIRE_DATE}}', 'June 18, 2026')
                    .replace('{{IQ_TEST_URL}}', 'https://opti-circle.io/tests/iq-sop')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sent Mails Ledger */}
        <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-3 overflow-y-auto max-h-[380px]">
          <h3 className="font-bold text-gray-900 uppercase font-mono text-[10px] text-gray-500">
            Sent Triggers Log
          </h3>
          <div className="space-y-2">
            {sentMails.map(m => (
              <div key={m.id} className="p-2.5 border border-[#ECEDF0] bg-[#F7F8FA] rounded-lg">
                <div className="flex justify-between text-[10px]">
                  <span className="font-semibold text-gray-800">{m.recipientName}</span>
                  <span className="text-green-600 font-bold">{m.status}</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 font-mono">{m.subject}</p>
                <p className="text-[9px] text-gray-500 font-mono mt-1.5">
                  {new Date(m.dateSent).toLocaleDateString()}{' '}
                  {new Date(m.dateSent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. SETTINGS VIEW
// ==========================================
function GoogleCalendarCard() {
  const toast = useToast();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = React.useCallback(() => {
    getCalendarStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  React.useEffect(() => {
    refresh();
    // Surface the result of the OAuth redirect (?calendar=connected|error).
    const params = new URLSearchParams(window.location.search);
    const r = params.get('calendar');
    if (r === 'connected') toast.success('Google Calendar connected.');
    else if (r === 'error') toast.error('Could not connect Google Calendar — try again.');
    if (r) window.history.replaceState({}, '', window.location.pathname);
  }, [refresh, toast]);

  const connect = async () => {
    setLoading(true);
    try {
      const { url, reason } = await getCalendarAuthUrl();
      if (!url) {
        toast.error(
          reason === 'not_configured'
            ? 'Google is not configured — set GOOGLE_CLIENT_ID/SECRET in the backend .env.'
            : 'Could not start Google sign-in.',
        );
        setLoading(false);
        return;
      }
      window.location.href = url; // hand off to Google's consent screen
    } catch {
      toast.error('Could not start Google sign-in.');
      setLoading(false);
    }
  };

  // Forget the stored account. Scheduling keeps working; events/Meet links just
  // stop being pushed until someone connects again (reconnecting as HR switches
  // the account, since the token is one shared row and the latest wins).
  const disconnect = () => {
    toast.confirm({
      title: 'Disconnect Google Calendar?',
      description: `${
        status?.connectedEmail ? `${status.connectedEmail} will be forgotten. ` : ''
      }Interviews will still be scheduled, but no calendar events or Google Meet links will be created until you connect again.`,
      confirmLabel: 'Disconnect',
      onConfirm: async () => {
        setLoading(true);
        try {
          await disconnectCalendar();
          toast.success('Google Calendar disconnected.');
          refresh();
        } catch {
          toast.error('Could not disconnect — try again.');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const connected = !!status?.connected;
  const configured = !!status?.configured;

  return (
    <div className="border border-[#E4E6EA] rounded-lg p-4 bg-[#F7F8FA] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
            <CalendarDays size={16} />
          </span>
          <div>
            <p className="font-semibold text-gray-900">Google Calendar Sync</p>
            <p className="text-[11px] text-gray-500 max-w-md">
              Push scheduled interviews, HR calls and tests to the shared HR Google Calendar
              (one-way). Connect the team Google account once.
            </p>
          </div>
        </div>
        <span
          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
            connected
              ? 'bg-emerald-50 text-emerald-600'
              : configured
                ? 'bg-yellow-50 text-yellow-600'
                : 'bg-[#EDEEF1] text-gray-500'
          }`}
        >
          {connected ? 'Connected' : configured ? 'Not connected' : 'Not configured'}
        </span>
      </div>

      {connected && status?.connectedEmail && (
        <p className="text-[11px] text-gray-600 font-mono pl-11">
          {status.connectedEmail} · calendar “{status.calendarId}”
        </p>
      )}

      <div className="pl-11">
        {!configured ? (
          <p className="text-[11px] text-gray-500">
            Add <span className="font-mono">GOOGLE_CLIENT_ID</span> and{' '}
            <span className="font-mono">GOOGLE_CLIENT_SECRET</span> to the backend{' '}
            <span className="font-mono">.env</span>, then reload to connect.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={connect}
              disabled={loading}
              className="bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer transition flex items-center gap-1.5"
            >
              <CalendarDays size={13} />
              {connected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
            </button>
            {connected && (
              <button
                onClick={disconnect}
                disabled={loading}
                className="border border-[#E4E6EA] bg-white text-red-600 hover:bg-red-50 disabled:opacity-60 px-3 py-1.5 rounded-lg font-medium cursor-pointer transition"
              >
                Disconnect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'general' | 'lists' | 'questions' | 'roles' | 'rules'
  >('general');

  return (
    <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4 md:p-6 text-xs select-none space-y-5">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          {BRAND.name} Workspace Settings
        </h2>
        <p className="text-gray-500 text-[11px]">
          Manage security guidelines, background validation rules, and template variables.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={v =>
          setActiveTab(v as 'general' | 'lists' | 'questions' | 'roles' | 'rules')
        }
      >
        <TabsList>
          <TabsTrigger value="general">General Workspace</TabsTrigger>
          <TabsTrigger value="lists">Custom Lists</TabsTrigger>
          <TabsTrigger value="questions">Question Bank</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; Cryptography</TabsTrigger>
          <TabsTrigger value="rules">Automated Rules Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Workspace Tenant Name</p>
              <input
                type="text"
                value={workspace.name}
                readOnly
                placeholder="Set NEXT_PUBLIC_WORKSPACE_NAME"
                className="w-full bg-[#EDEEF1] px-2.5 py-1.5 rounded border border-[#E4E6EA]"
              />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Primary Domain Link</p>
              <input
                type="text"
                value={workspace.domain}
                readOnly
                placeholder="Set NEXT_PUBLIC_WORKSPACE_DOMAIN"
                className="w-full bg-[#EDEEF1] px-2.5 py-1.5 rounded border border-[#E4E6EA]"
              />
            </div>
          </div>
          <div className="p-3 bg-accent-50/50 rounded-lg text-accent-600 border border-accent-100 flex items-center gap-2">
            <Eye size={14} className="shrink-0" />
            <span className="text-[11px] leading-relaxed">
              Passwords are always masked securely using industry-standard cryptography. Standard SSL
              transport tunnels are active on port 3000.
            </span>
          </div>

          <GoogleCalendarCard />
        </div>
        </TabsContent>

        <TabsContent value="lists">
          <TaxonomyManager />
        </TabsContent>

        <TabsContent value="questions">
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-gray-850">Question bank</h4>
              <p className="text-[11px] text-gray-500">
                Manage the screening, IQ, assessment, and interview question banks used across hiring.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {QUESTION_CATEGORIES.map(cat => {
                const Icon = cat.Icon;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => router.push(`/question-library/${cat.slug}`)}
                    className="group flex items-start gap-3 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 text-left transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold text-gray-900 group-hover:text-accent-700">
                          {cat.title}
                        </p>
                        <ChevronRight
                          size={15}
                          className="shrink-0 text-gray-400 group-hover:text-accent-600"
                        />
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                        {cat.subtitle}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                        {cat.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roles">
        <div className="space-y-3">
          <h4 className="font-bold text-gray-850">Regulatory Role permissions matrix</h4>
          <div className="border border-[#E4E6EA] rounded bg-[#EDEEF1] p-3 space-y-2 font-mono text-[11px]">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3">
              <span className="font-semibold">HR Specialist Role:</span>
              <span>Reads CRM, Uploads CVs, Schedules slots, triggers email templates drafts.</span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3">
              <span className="font-semibold">Admin / Leadership Role:</span>
              <span>
                Approves salary revision levels, signs employment agreements, triggers global settings.
              </span>
            </div>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="rules">
        <div className="space-y-3">
          <h4 className="font-bold text-gray-850">Corporate BGV Dependency Checklist Rules</h4>
          <div className="space-y-2 bg-[#F7F8FA] p-3 rounded-lg border border-[#ECEDF0]">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-accent-600 rounded flex items-center justify-center text-white">
                <Check size={8} />
              </div>
              <span>Require completed ID proof verification before initiating offer dispatch.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-accent-600 rounded flex items-center justify-center text-white">
                <Check size={8} />
              </div>
              <span>
                Enforce asset retrieval compliance during notice period countdown prior to final finance
                clearance.
              </span>
            </div>
          </div>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
