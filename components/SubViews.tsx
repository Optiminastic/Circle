'use client';
import { Select } from './Select';
import { DocumentsPanel } from './DocumentsPanel';
import { ActionMenu } from './ActionMenu';
import { useToast } from './Toaster';
import { useUiStore } from '@/store/ui-store';
import { useSchedules } from '@/features/schedule/hooks';
import { useCandidates } from '@/features/candidates/hooks';
import { useScheduler } from '@/store/schedule-store';
import {
  getCalendarStatus,
  getCalendarAuthUrl,
  type CalendarStatus,
} from '@/lib/api/calendar';
import { workspace } from '@/lib/config';
import { BRAND } from '@/lib/brand';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
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

      <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F2EEE7] border-b border-[#DAD4C8] text-gray-500 font-mono text-[9px] uppercase font-bold">
              <th className="p-3">Candidate</th>
              <th className="p-3">Applied Position</th>
              <th className="p-3 text-center font-semibold">Comm Rating</th>
              <th className="p-3">Expected CTC</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Operational Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DAD4C8]">
            {hrCallCandidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No candidates are currently scheduled or completed for introductory HR calls.
                </td>
              </tr>
            ) : (
              hrCallCandidates.map(c => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCandidate(c.id)}
                  className="hover:bg-[#F2EEE7] transition cursor-pointer"
                >
                  <td className="p-3 font-semibold text-gray-900">{c.fullName}</td>
                  <td className="p-3">
                    {c.appliedRole} ({c.department})
                  </td>
                  <td className="p-3 text-center font-bold">
                    {c.hrCall?.completed ? `⭐ ${c.hrCall.communicationRating}/5` : 'Pending Call'}
                  </td>
                  <td className="p-3 font-mono">
                    {c.hrCall?.completed ? c.hrCall.expectedCtc : c.expectedCtc}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        c.hrCall?.completed ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {c.hrCall?.completed ? 'Summary Filed' : 'Action Required'}
                    </span>
                  </td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex justify-between items-center">
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
          className="bg-accent-600 hover:bg-accent-700 text-white px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1 cursor-pointer transition"
        >
          <Plus size={14} /> Schedule Interview
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-[#F7F4EE] p-5 rounded-xl border border-[#DAD4C8] shadow-lg w-96 space-y-3.5"
          >
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider font-mono">
              Schedule Candidate Panel
            </h3>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Select Available Candidate</label>
              <Select
                value={form.candidateId}
                onChange={e => setForm({ ...form, candidateId: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
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
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Assigned Interviewer</label>
              <input
                type="text"
                value={form.interviewer}
                onChange={e => setForm({ ...form, interviewer: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Date & Slot Time</label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={e => setForm({ ...form, dateTime: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Platform Link Mode</label>
              <Select
                value={form.mode}
                onChange={e => setForm({ ...form, mode: e.target.value as any })}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
              >
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom Video</option>
                <option value="In-Person">In-Person (Office)</option>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 border border-[#DAD4C8] hover:bg-[#E6E1D8] rounded text-gray-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded font-semibold cursor-pointer"
              >
                Confirm Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scheduled interviews table */}
      <div className="overflow-hidden rounded-xl border border-[#DAD4C8] bg-[#F7F4EE] shadow-2xs">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#DAD4C8] bg-[#F2EEE7] font-mono text-[9px] font-bold uppercase text-gray-500">
              <th className="p-3">Candidate</th>
              <th className="p-3">Role</th>
              <th className="p-3">Round</th>
              <th className="p-3">Panel evaluator</th>
              <th className="p-3">Slot time</th>
              <th className="p-3">Access mode</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DAD4C8]">
            {allInterviews.length === 0 ? (
              <tr>
                <td colSpan={8} className="bg-[#F7F4EE] p-3">
                  <EmptyState
                    icon={UserCheck}
                    title="No interviews scheduled"
                    description="Scheduled interviews appear here. Use “Schedule Interview”, or schedule one from a candidate / assignment grade."
                    className="border-0 bg-transparent py-10"
                  />
                </td>
              </tr>
            ) : (
              allInterviews.map(i => (
                <tr
                  key={i.id}
                  onClick={onSelectCandidate ? () => onSelectCandidate(i.candidateId) : undefined}
                  className={`transition hover:bg-[#F2EEE7] ${onSelectCandidate ? 'cursor-pointer' : ''}`}
                >
                  <td className="p-3 font-semibold text-gray-900">{i.candidateName}</td>
                  <td className="p-3 text-gray-600">
                    {i.appliedRole} <span className="text-gray-400">• {i.department}</span>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-accent-50 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-600">
                      {i.interviewRound}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700">{i.interviewerName}</td>
                  <td className="p-3 font-mono text-[11px] text-gray-700">
                    {new Date(i.dateTime).toLocaleDateString()}{' '}
                    {new Date(i.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-accent-600">
                      {i.meetingMode === 'In-Person' ? <MapPin size={12} /> : <Video size={12} />}
                      {i.meetingMode}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${
                        i.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Assessments & Assignments Library
          </h2>
          <p className="text-gray-500 text-[11px]">
            Role-based question building, IQ metrics automatic scoring, and trial repo reviews.
          </p>
        </div>
        <div className="border border-[#DAD4C8] rounded-lg bg-[#F7F4EE] overflow-hidden flex font-semibold text-xs">
          <button
            onClick={() => setActiveTab('iq')}
            className={`px-3 py-1.5 transition ${activeTab === 'iq' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#E6E1D8]'}`}
          >
            IQ Test Logs
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-1.5 transition ${activeTab === 'assignments' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#E6E1D8]'}`}
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
            <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl overflow-hidden">
              <div className="flex items-center gap-1.5 bg-[#F2EEE7] border-b border-[#DAD4C8] px-3 py-2 text-gray-700 font-semibold">
                <UserCheck size={13} className="text-accent-600" />
                <span>Awaiting IQ Test</span>
                <span className="text-[10px] font-mono text-gray-500">({awaitingIq.length})</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2EEE7] border-b border-[#DAD4C8] text-gray-500 font-mono text-[9px] uppercase font-bold">
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Applied position</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DAD4C8]">
                  {awaitingIq.map(c => {
                    const sched = scheduledIq.get(c.id);
                    return (
                      <tr
                        key={c.id}
                        onClick={onSelectCandidate ? () => onSelectCandidate(c.id) : undefined}
                        className={`hover:bg-[#F2EEE7] transition ${onSelectCandidate ? 'cursor-pointer' : ''}`}
                      >
                        <td className="p-3 font-semibold text-gray-900">{c.fullName}</td>
                        <td className="p-3">
                          {c.appliedRole} ({c.department})
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              sched ? 'bg-amber-50 text-amber-600' : 'bg-accent-50 text-accent-600'
                            }`}
                          >
                            {sched
                              ? `Scheduled · ${new Date(sched.dateTime).toLocaleDateString()}`
                              : 'Ready to schedule'}
                          </span>
                        </td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F2EEE7] border-b border-[#DAD4C8] text-gray-500 font-mono text-[9px] uppercase font-bold">
                <th className="p-3">Candidate</th>
                <th className="p-3">Test Date</th>
                <th className="p-3">Attempted questions</th>
                <th className="p-3">Succeeded percentage</th>
                <th className="p-3">Qualification</th>
                <th className="p-3">Remarks</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DAD4C8]">
              {iqTests.map(idx => (
                <tr
                  key={idx.id}
                  onClick={onSelectCandidate ? () => onSelectCandidate(idx.candidateId) : undefined}
                  className={`hover:bg-[#F2EEE7] transition ${onSelectCandidate ? 'cursor-pointer' : ''}`}
                >
                  <td className="p-3 font-semibold text-gray-900">{idx.candidateName}</td>
                  <td className="p-3 font-mono">{idx.testDate}</td>
                  <td className="p-3 font-mono">
                    {idx.questionsAttempted} / {idx.totalQuestions}
                  </td>
                  <td className="p-3 font-bold text-accent-600">{idx.scorePercentage}%</td>
                  <td className="p-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        idx.qualificationStatus === 'Passed'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {idx.qualificationStatus}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{idx.remarks}</td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(asm => (
            <div key={asm.id} className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start border-b border-[#E6E1D8] pb-2">
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

              <p className="text-gray-600 bg-[#E6E1D8] p-3 rounded-lg">{asm.instructions}</p>

              <div>
                <h5 className="font-bold text-[10px] uppercase font-mono text-gray-500 mb-2">
                  Candidate submissions ({asm.submissions.length})
                </h5>
                <div className="space-y-2">
                  {asm.submissions.map(sub => (
                    <div
                      key={sub.id}
                      className="border border-[#E2DDD2] rounded-lg p-3 flex justify-between items-center text-xs bg-[#F2EEE7]"
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
  onToggleTask: (candidateName: string, taskId: string) => void;
  onAddEmployeeTrigger: (checklist: OnboardingChecklist) => void;
}

export function OnboardingChecklistView({
  onboarding,
  onToggleTask,
  onAddEmployeeTrigger,
}: OnboardingViewProps) {
  const toast = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState('');

  const activeChecklist = onboarding.find(o => o.candidateName === selectedCandidate) ?? onboarding[0];

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex justify-between items-baseline">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Onboarding Progress Tracker
          </h2>
          <p className="text-gray-500 text-[11px]">
            Checklist-driven joiner actions. Completing criteria enables corporate asset/login allocations.
          </p>
        </div>

        {/* Selected Joiners Selector */}
        <Select
          value={selectedCandidate}
          onChange={e => setSelectedCandidate(e.target.value)}
          className="px-2.5 py-1 text-xs border border-[#DAD4C8] bg-[#F7F4EE] rounded font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {onboarding.map(o => (
            <option key={o.candidateId} value={o.candidateName}>
              {o.candidateName}
            </option>
          ))}
        </Select>
      </div>

      {activeChecklist ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Progress Circular indicators */}
          <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-500 font-mono font-semibold uppercase tracking-wider">
                Candidate Progress
              </span>
              <h3 className="font-bold text-gray-900 font-display text-base truncate">
                {activeChecklist.candidateName}
              </h3>
              <p className="text-[11px] text-accent-600 font-semibold font-mono">
                {activeChecklist.onboardingStatus}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-4 bg-[#E6E1D8]/50 rounded-lg">
              <div className="text-3xl font-extrabold text-accent-600 font-display">
                {activeChecklist.progressPercentage}%
              </div>
              <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block mt-1">
                Actions Complete
              </span>
            </div>

            {/* Check off fully triggers On Board option if 100% */}
            {activeChecklist.progressPercentage === 100 ? (
              <button
                onClick={() => {
                  onAddEmployeeTrigger(activeChecklist);
                  toast.success(
                    `${activeChecklist.candidateName} onboarded into the employee directory.`,
                  );
                }}
                className="w-full bg-accent-600 hover:bg-accent-700 text-white font-medium rounded py-2 transition cursor-pointer text-center font-semibold"
              >
                Conclude Onboarding (EMP-ID)
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-[#E6E1D8] text-gray-500 font-medium rounded py-2 text-center text-[10px] font-mono cursor-not-allowed"
              >
                Clear all tasks to active EMP conversion
              </button>
            )}
          </div>

          {/* Checklist Tasks List (Linear style) (Col-span-2) */}
          <div className="md:col-span-2 bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 space-y-4">
            <div className="border-b border-[#E6E1D8] pb-2">
              <h4 className="font-bold text-gray-900">Pre-joining & Induction Checklist Items</h4>
              <p className="text-[10px] text-gray-500">Click checkboxes to log finalized state:</p>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {activeChecklist.tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onToggleTask(activeChecklist.candidateName, t.id)}
                  className="flex items-center gap-3 p-2.5 border border-[#DAD4C8] hover:bg-[#E6E1D8] rounded-lg cursor-pointer transition"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                      t.isChecked
                        ? 'bg-accent-600 border-accent-600 text-white'
                        : 'border-gray-300 bg-[#F7F4EE]'
                    }`}
                  >
                    {t.isChecked && <Check size={10} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${t.isChecked ? 'line-through text-gray-500' : 'text-gray-800'}`}
                    >
                      {t.title}
                    </p>
                    <span className="text-[9px] text-gray-500 font-mono italic block mt-0.5">
                      Category: {t.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-6 text-center text-gray-500">
          No candidates in the onboarding pipeline presently.
        </div>
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
}

const EMPTY_EMPLOYEE_FORM = {
  fullName: '',
  email: '',
  phone: '',
  department: 'Engineering',
  role: '',
  reportingManager: '',
  joiningDate: new Date().toISOString().split('T')[0],
  workLocation: 'Mumbai, India',
  status: 'Active' as Employee['status'],
  address: '',
  emergencyContact: '',
  bankAccount: '',
};

export function EmployeeDirectoryView({
  employees,
  onSelectEmployee,
  onUpdateEmployee,
  onAddEmployee,
}: DirectoryViewProps) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [empForm, setEmpForm] = useState(EMPTY_EMPLOYEE_FORM);

  const departments = ['All', 'Engineering', 'Product', 'Design', 'Sales', 'Human Resources'];

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.fullName.trim() || !empForm.role.trim()) {
      toast.error('Full name and role are required.');
      return;
    }
    const created: Employee = {
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: empForm.fullName.trim(),
      email: empForm.email.trim(),
      phone: empForm.phone.trim(),
      department: empForm.department,
      role: empForm.role.trim(),
      reportingManager: empForm.reportingManager.trim() || '—',
      joiningDate: empForm.joiningDate,
      workLocation: empForm.workLocation.trim(),
      status: empForm.status,
      personalDetails: {
        address: empForm.address.trim(),
        emergencyContact: empForm.emergencyContact.trim(),
        bankAccount: empForm.bankAccount.trim(),
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-2 text-gray-500">
              <Search size={12} />
            </span>
            <input
              type="text"
              placeholder="Filter names..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1 bg-[#F7F4EE] border border-[#DAD4C8] rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </div>

          <Select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-2 py-1 bg-[#F7F4EE] border border-[#DAD4C8] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 font-medium"
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
              className="bg-accent-600 hover:bg-accent-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition font-semibold shrink-0 shadow-2xs"
            >
              <Plus size={13} /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Employee table */}
      <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-2xl shadow-2xs overflow-x-auto">
        <table id="employees-table" className="w-full text-left min-w-[820px]">
          <thead>
            <tr className="border-b border-[#E6E1D8] text-[10px] font-mono uppercase tracking-wider text-gray-500">
              <th className="p-3">Employee</th>
              <th className="p-3">ID</th>
              <th className="p-3">Role</th>
              <th className="p-3">Department</th>
              <th className="p-3">Location</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-3">
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
                </td>
              </tr>
            ) : (
              filtered.map(emp => (
                <tr
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp.id)}
                  className="border-b border-[#E6E1D8] last:border-0 hover:bg-[#F2EEE7] cursor-pointer transition"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {emp.fullName
                          .split(' ')
                          .map(n => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-[12px] truncate">{emp.fullName}</p>
                        {emp.email && (
                          <p className="text-[10px] text-gray-500 font-mono truncate">{emp.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-gray-500">{emp.id}</td>
                  <td className="p-3 font-semibold text-gray-700">{emp.role}</td>
                  <td className="p-3 text-gray-600">{emp.department}</td>
                  <td className="p-3 text-gray-500">{emp.workLocation}</td>
                  <td className="p-3 font-mono text-[11px] text-gray-500">{emp.joiningDate}</td>
                  <td className="p-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        emp.status === 'Active'
                          ? 'bg-green-50 text-green-600'
                          : emp.status === 'On Leave'
                            ? 'bg-yellow-50 text-yellow-600'
                            : emp.status === 'Offboarded'
                              ? 'bg-[#E6E1D8] text-gray-500'
                              : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Employee modal — register existing staff with full details */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/45 backdrop-blur-xs flex items-center justify-center z-[110] p-4">
          <form
            onSubmit={handleAddEmployee}
            className="bg-[#F7F4EE] p-5 rounded-xl border border-[#DAD4C8] shadow-2xl w-full max-w-2xl space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-[#E2DDD2] pb-2">
              <h3 className="font-bold text-gray-900 text-xs font-mono uppercase tracking-wider">
                Add Employee to Directory
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-600 cursor-pointer p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={empForm.fullName}
                  onChange={e => setEmpForm({ ...empForm, fullName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Role / Designation *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior React Engineer"
                  value={empForm.role}
                  onChange={e => setEmpForm({ ...empForm, role: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  required
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
                  className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Phone</label>
                <input
                  type="text"
                  placeholder="+91 ..."
                  value={empForm.phone}
                  onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Department</label>
                <Select
                  value={empForm.department}
                  onChange={e => setEmpForm({ ...empForm, department: e.target.value })}
                  className="w-full px-2 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8]"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Sales">Sales</option>
                  <option value="Human Resources">Human Resources</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Status</label>
                <Select
                  value={empForm.status}
                  onChange={e =>
                    setEmpForm({ ...empForm, status: e.target.value as Employee['status'] })
                  }
                  className="w-full px-2 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8]"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Suspended">Suspended</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Joining Date</label>
                <input
                  type="date"
                  value={empForm.joiningDate}
                  onChange={e => setEmpForm({ ...empForm, joiningDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Work Location</label>
                <input
                  type="text"
                  placeholder="Mumbai, India"
                  value={empForm.workLocation}
                  onChange={e => setEmpForm({ ...empForm, workLocation: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
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
                className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              />
            </div>

            <div className="pt-1 border-t border-[#E2DDD2]">
              <p className="font-bold text-gray-500 font-mono text-[9px] uppercase tracking-wider mb-2">
                Personal records (optional)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Address</label>
                  <input
                    type="text"
                    placeholder="Mailing address"
                    value={empForm.address}
                    onChange={e => setEmpForm({ ...empForm, address: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Emergency Contact</label>
                  <input
                    type="text"
                    placeholder="Name · +91 ..."
                    value={empForm.emergencyContact}
                    onChange={e => setEmpForm({ ...empForm, emergencyContact: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Bank Account</label>
                  <input
                    type="text"
                    placeholder="Account / IFSC"
                    value={empForm.bankAccount}
                    onChange={e => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#DAD4C8] rounded text-xs bg-[#E6E1D8] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-1.5 border border-[#DAD4C8] hover:bg-[#E6E1D8] rounded text-gray-650 cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded cursor-pointer font-semibold"
              >
                Add to Directory
              </button>
            </div>
          </form>
        </div>
      )}
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

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Credentials & IT Hardware Assets
          </h2>
          <p className="text-gray-500 text-[11px]">
            Security access controls list and physical company inventory logs.
          </p>
        </div>

        <div className="border border-[#DAD4C8] rounded-lg bg-[#F7F4EE] overflow-hidden flex font-semibold text-xs shrink-0">
          <button
            onClick={() => setActiveTab('creds')}
            className={`px-3 py-1.5 transition ${activeTab === 'creds' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#E6E1D8]'}`}
          >
            System Credentials
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1.5 transition ${activeTab === 'assets' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#E6E1D8]'}`}
          >
            Hardware Inventory
          </button>
        </div>
      </div>

      {activeTab === 'creds' ? (
        <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F2EEE7] border-b border-[#DAD4C8] text-gray-500 font-mono text-[9px] uppercase font-bold">
                <th className="p-3">Employee</th>
                <th className="p-3">Target System</th>
                <th className="p-3">Assigned Identity</th>
                <th className="p-3 text-center">Perm Match</th>
                <th className="p-3 text-center">Security PIN</th>
                <th className="p-3">State</th>
                <th className="p-3 text-right">Moderator Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DAD4C8]">
              {employees.flatMap(emp =>
                (emp.credentials || []).map(cred => (
                  <tr key={cred.id} className="hover:bg-[#F2EEE7] transition">
                    <td className="p-3 font-semibold text-gray-900">{emp.fullName}</td>
                    <td className="p-3 font-medium text-gray-800">{cred.systemName}</td>
                    <td className="p-3 font-mono">{cred.assignedEmail}</td>
                    <td className="p-3 text-center font-semibold">{cred.accessLevel}</td>
                    <td className="p-3 text-center font-mono text-gray-500 select-all">••••••••••</td>
                    <td className="p-3">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          cred.status === 'Active'
                            ? 'bg-green-50 text-green-600'
                            : cred.status === 'Suspended'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-[#E6E1D8] text-gray-500'
                        }`}
                      >
                        {cred.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Select
                        value={cred.status}
                        onChange={e => onUpdateCredential(emp.id, cred.id, e.target.value)}
                        className="text-[10px] bg-[#F7F4EE] border border-[#DAD4C8] px-1.5 py-1 rounded cursor-pointer text-gray-600 focus:ring-1 focus:ring-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                      >
                        <option value="Active">Grant Active</option>
                        <option value="Suspended">Suspend Access</option>
                        <option value="Revoked">Revoke Key</option>
                      </Select>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F2EEE7] border-b border-[#DAD4C8] text-gray-500 font-mono text-[9px] uppercase font-bold">
                <th className="p-3">Asset ID</th>
                <th className="p-3">Specification</th>
                <th className="p-3">Item Category</th>
                <th className="p-3">Assigned To</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Condition / Modification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DAD4C8]">
              {assets.map(ast => (
                <tr key={ast.id} className="hover:bg-[#F2EEE7] transition">
                  <td className="p-3 font-mono font-bold text-gray-700">{ast.id}</td>
                  <td className="p-3 font-semibold text-gray-900">{ast.assetName}</td>
                  <td className="p-3">{ast.assetType}</td>
                  <td className="p-3">
                    {ast.assignedToEmployeeName ? (
                      <span className="font-medium text-gray-800">{ast.assignedToEmployeeName}</span>
                    ) : (
                      <span className="text-gray-500 italic">Available in IT Depot</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        ast.status === 'Assigned'
                          ? 'bg-accent-50 text-accent-600'
                          : ast.status === 'Available'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {ast.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Select
                      value={ast.status}
                      onChange={e => handleAssetStatusChange(ast.id, e.target.value)}
                      className="text-[10px] bg-[#F7F4EE] border border-[#DAD4C8] px-1.5 py-1 rounded cursor-pointer text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    >
                      <option value="Available">Available</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Under Repair">Under Repair</option>
                      <option value="Lost">Lost</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Retired">Retired</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      <div className="flex justify-between items-center bg-[#F2EEE7] border-b border-[#DAD4C8] pb-3">
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
          className="px-2.5 py-1 text-xs border border-[#DAD4C8] bg-[#F7F4EE] rounded font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
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
          className="md:col-span-2 bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 space-y-4"
        >
          <h3 className="font-bold text-gray-900">Conduct Annual Appraisal Cycle Review</h3>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Review Cycle Period</label>
              <input
                type="text"
                value={reviewForm.reviewPeriod}
                onChange={e => setReviewForm({ ...reviewForm, reviewPeriod: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
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
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Annual Target Achievement & Deliverables</label>
            <textarea
              value={reviewForm.targetAchievement}
              onChange={e => setReviewForm({ ...reviewForm, targetAchievement: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Manager Qualitative Feedback</label>
            <textarea
              value={reviewForm.managerFeedback}
              onChange={e => setReviewForm({ ...reviewForm, managerFeedback: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recommended Promotion Target</label>
              <input
                type="text"
                value={reviewForm.recommendedPromotion}
                onChange={e => setReviewForm({ ...reviewForm, recommendedPromotion: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Proposed New CTC (LPA)</label>
              <input
                type="text"
                value={reviewForm.recommendedSalaryRevision}
                onChange={e => setReviewForm({ ...reviewForm, recommendedSalaryRevision: e.target.value })}
                placeholder="e.g. 22 LPA"
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
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
        <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900 uppercase font-mono text-[10px] text-gray-500">
            Historic Logs
          </h3>

          {targetEmp?.appraisalHistory && targetEmp.appraisalHistory.length > 0 ? (
            targetEmp.appraisalHistory.map(hist => (
              <div key={hist.id} className="p-3 border border-[#E2DDD2] rounded-lg space-y-2 bg-[#F2EEE7]">
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
  onToggleExitTask: (empId: string, taskId: string) => void;
  onToggleDeliverable: (empId: string, deliverableId: string) => void;
  onConfirmClearance: (empId: string) => void;
}

export function OffboardingChecklistView({
  offboarding,
  onToggleExitTask,
  onToggleDeliverable,
  onConfirmClearance,
}: OffboardingViewProps) {
  const toast = useToast();
  const [selectedCase, setSelectedCase] = useState('');

  // Data loads asynchronously, so fall back to the first case until one is picked.
  const activeCase = offboarding.find(o => o.employeeName === selectedCase) ?? offboarding[0];

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Offboarding & exit Workflows
          </h2>
          <p className="text-gray-500 text-[11px]">
            Notice period clearances, asset collection, and formal Knowledge Transfer document approvals.
          </p>
        </div>

        <Select
          value={selectedCase}
          onChange={e => setSelectedCase(e.target.value)}
          className="px-2.5 py-1 text-xs border border-[#DAD4C8] bg-[#F7F4EE] rounded font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {offboarding.map(o => (
            <option key={o.employeeId} value={o.employeeName}>
              {o.employeeName}
            </option>
          ))}
        </Select>
      </div>

      {activeCase ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* KT & Notice Summary Card */}
          <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] text-red-650 bg-red-50 font-bold px-2 py-0.5 rounded">
                Resignation Triggered
              </span>
              <h3 className="font-bold text-gray-900 font-display text-base mt-2">
                {activeCase.employeeName}
              </h3>
              <p className="text-gray-500">
                Notice end:{' '}
                <span className="font-mono font-bold text-gray-800">{activeCase.lastWorkingDay}</span>
              </p>
              <div className="bg-[#E6E1D8] p-2.5 rounded-lg text-[10px] border border-[#DAD4C8] space-y-1.5 font-mono">
                <p className="text-gray-500 uppercase font-bold text-[9px]">Knowledge Transfer Summary:</p>
                <p className="text-gray-700 font-sans">{activeCase.ktRecord?.currentProjects}</p>
                <div className="flex justify-between mt-2 font-bold py-1 border-t border-gray-150">
                  <span>KT Status:</span>
                  <span className="text-accent-600">{activeCase.ktRecord?.ktCompletionStatus}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onConfirmClearance(activeCase.employeeId);
                toast.success(`Final settlement signed for ${activeCase.employeeName}.`);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium rounded py-2 transition font-semibold"
            >
              Sign Final Settlement
            </button>
          </div>

          {/* Checkout clearances list */}
          <div className="md:col-span-2 bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-gray-900 border-b border-[#E6E1D8] pb-1.5">
              Compliance Clearance Checkpoints
            </h4>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {activeCase.checklist.map(t => (
                <div
                  key={t.id}
                  onClick={() => onToggleExitTask(activeCase.employeeId, t.id)}
                  className="flex items-center gap-3 p-2.5 border border-[#DAD4C8] hover:bg-gray-55 rounded-lg cursor-pointer transition"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                      t.isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 bg-[#F7F4EE]'
                    }`}
                  >
                    {t.isChecked && <Check size={10} />}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${t.isChecked ? 'line-through text-gray-500' : 'text-gray-800'}`}
                    >
                      {t.title}
                    </p>
                    <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                      Control: {t.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Exit Deliverables & Handover */}
          <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-1.5">
              <h4 className="font-bold text-gray-900">Exit Deliverables &amp; Handover</h4>
              <span className="text-[10px] font-mono text-gray-500">
                {(activeCase.deliverables || []).filter(d => d.isSubmitted).length}/
                {(activeCase.deliverables || []).length} submitted
              </span>
            </div>
            {(activeCase.deliverables || []).length === 0 ? (
              <p className="text-gray-500 text-[11px] py-3 text-center">
                No deliverables defined for this exit.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(activeCase.deliverables || []).map(d => (
                  <div
                    key={d.id}
                    onClick={() => onToggleDeliverable(activeCase.employeeId, d.id)}
                    className="flex items-center gap-3 p-2.5 border border-[#DAD4C8] hover:bg-gray-55 rounded-lg cursor-pointer transition"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                        d.isSubmitted
                          ? 'bg-accent-600 border-accent-600 text-white'
                          : 'border-gray-300 bg-[#F7F4EE]'
                      }`}
                    >
                      {d.isSubmitted && <Check size={10} />}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${d.isSubmitted ? 'line-through text-gray-500' : 'text-gray-800'}`}
                      >
                        {d.title}
                      </p>
                      {d.owner && (
                        <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                          Hand over to: {d.owner}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deliverable handover files (stored in Backblaze) */}
          <DocumentsPanel
            entityType="offboarding"
            entityId={activeCase.employeeId}
            category="deliverable"
            title="Deliverable Files (Handover Documents)"
          />
        </div>
      ) : (
        <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-6 text-center text-gray-500">
          No live employee offboarding case in notice cycle currently.
        </div>
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
      '{{COMPANY_NAME}}': BRAND.name,
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
        <form onSubmit={handleSend} className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Email Draft Trigger Creator</h3>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Choose Template Class</label>
            <Select
              value={activeTemplateId}
              onChange={e => setActiveTemplateId(e.target.value)}
              className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
            >
              {emailTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E6E1D8]">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Role Dynamic Variable</label>
              <input
                type="text"
                value={roleField}
                onChange={e => setRoleField(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#DAD4C8] bg-[#E6E1D8] rounded"
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
          <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider font-semibold">
                Live Variable Compilation Parser
              </span>
              <div className="border border-[#DAD4C8] p-3 rounded-lg bg-[#F2EEE7] font-mono text-[11px] text-gray-700 space-y-2 max-h-[300px] overflow-y-auto">
                <p className="font-bold text-gray-900 border-b border-gray-150 pb-1">
                  Subject: {selectedTemplate.subject.replace('{{ROLE}}', roleField)}
                </p>
                <p className="whitespace-pre-line leading-relaxed text-gray-600 pt-1">
                  {selectedTemplate.bodyTemplate
                    .replace('{{CANDIDATE_NAME}}', recipientName)
                    .replace('{{ROLE}}', roleField)
                    .replace('{{COMPANY_NAME}}', BRAND.name)
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
        <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-5 space-y-3 overflow-y-auto max-h-[380px]">
          <h3 className="font-bold text-gray-900 uppercase font-mono text-[10px] text-gray-500">
            Sent Triggers Log
          </h3>
          <div className="space-y-2">
            {sentMails.map(m => (
              <div key={m.id} className="p-2.5 border border-[#E2DDD2] bg-[#F2EEE7] rounded-lg">
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

  const connected = !!status?.connected;
  const configured = !!status?.configured;

  return (
    <div className="border border-[#DAD4C8] rounded-lg p-4 bg-[#F2EEE7] space-y-3">
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
                : 'bg-[#E6E1D8] text-gray-500'
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
          <button
            onClick={connect}
            disabled={loading}
            className="bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer transition flex items-center gap-1.5"
          >
            <CalendarDays size={13} />
            {connected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'rules'>('general');

  return (
    <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-6 text-xs select-none space-y-5">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          {BRAND.name} Workspace Settings
        </h2>
        <p className="text-gray-500 text-[11px]">
          Manage security guidelines, background validation rules, and template variables.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'general' | 'roles' | 'rules')}>
        <TabsList>
          <TabsTrigger value="general">General Workspace</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; Cryptography</TabsTrigger>
          <TabsTrigger value="rules">Automated Rules Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Workspace Tenant Name</p>
              <input
                type="text"
                value={workspace.name}
                readOnly
                placeholder="Set NEXT_PUBLIC_WORKSPACE_NAME"
                className="w-full bg-[#E6E1D8] px-2.5 py-1.5 rounded border border-[#DAD4C8]"
              />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Primary Domain Link</p>
              <input
                type="text"
                value={workspace.domain}
                readOnly
                placeholder="Set NEXT_PUBLIC_WORKSPACE_DOMAIN"
                className="w-full bg-[#E6E1D8] px-2.5 py-1.5 rounded border border-[#DAD4C8]"
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

        <TabsContent value="roles">
        <div className="space-y-3">
          <h4 className="font-bold text-gray-850">Regulatory Role permissions matrix</h4>
          <div className="border border-[#DAD4C8] rounded bg-[#E6E1D8] p-3 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="font-semibold">HR Specialist Role:</span>
              <span>Reads CRM, Uploads CVs, Schedules slots, triggers email templates drafts.</span>
            </div>
            <div className="flex justify-between">
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
          <div className="space-y-2 bg-[#F2EEE7] p-3 rounded-lg border border-[#E2DDD2]">
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
