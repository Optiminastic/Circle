'use client';
import { Select } from './Select';
import { DocumentsPanel } from './DocumentsPanel';
import { ActionMenu } from './ActionMenu';
import { useToast } from './Toaster';
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
  Check,
  Briefcase,
  SlidersHorizontal,
  X,
  Eye,
  Trash2,
  KeyRound,
  Laptop,
  Network,
  Download,
  Terminal,
  Send,
  BookOpen,
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
  const hrCallCandidates = candidates.filter(c => c.status === 'Moved to HR Call' || c.hrCall?.completed);

  return (
    <div className="space-y-4 text-xs select-none">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          HR Introductory Calls Manager
        </h2>
        <p className="text-gray-400 text-[11px]">
          Standardized assessment of interest level, joining notice period, communication, and expectation
          fit.
        </p>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F1E4] border-b border-[#E1D6BC] text-gray-500 font-mono text-[9px] uppercase font-bold">
              <th className="p-3">Candidate</th>
              <th className="p-3">Applied Position</th>
              <th className="p-3 text-center font-semibold">Comm Rating</th>
              <th className="p-3">Expected CTC</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Operational Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1D6BC]">
            {hrCallCandidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No candidates are currently scheduled or completed for introductory HR calls.
                </td>
              </tr>
            ) : (
              hrCallCandidates.map(c => (
                <tr key={c.id} className="hover:bg-[#F7F1E4] transition">
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
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectCandidate(c.id)}
                        className="text-[10px] bg-[#FFFFFF] border border-[#E1D6BC] hover:border-accent-400 text-accent-600 px-3 py-1 rounded-md font-semibold cursor-pointer transition"
                      >
                        {c.hrCall?.completed ? 'View Records' : 'Complete Form'}
                      </button>
                      <ActionMenu
                        items={[
                          {
                            key: 'file',
                            label: 'View File',
                            icon: <Eye size={13} />,
                            onClick: () => onSelectCandidate(c.id),
                          },
                          {
                            key: 'shortlist',
                            label: c.status === 'Shortlisted' ? 'Shortlisted' : 'Shortlist & Schedule',
                            icon: <UserCheck size={13} />,
                            disabled: c.status === 'Shortlisted' || !onShortlistCandidate,
                            onClick: () => onShortlistCandidate?.(c.id, c.fullName),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            danger: true,
                            disabled: !onDeleteCandidate,
                            onClick: () => {
                              if (confirm(`Remove ${c.fullName} from the pipeline?`)) {
                                onDeleteCandidate?.(c.id);
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
}

export function InterviewsView({
  interviews,
  candidates,
  onAddNewInterview,
  onSelectCandidate,
  onShortlistCandidate,
  onDeleteInterview,
}: InterviewsViewProps) {
  const toast = useToast();
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

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Interview Panel & Scheduling
          </h2>
          <p className="text-gray-400 text-[11px]">
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
            className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E1D6BC] shadow-lg w-96 space-y-3.5"
          >
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider font-mono">
              Schedule Candidate Panel
            </h3>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Select Available Candidate</label>
              <Select
                value={form.candidateId}
                onChange={e => setForm({ ...form, candidateId: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
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
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Assigned Interviewer</label>
              <input
                type="text"
                value={form.interviewer}
                onChange={e => setForm({ ...form, interviewer: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Date & Slot Time</label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={e => setForm({ ...form, dateTime: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Platform Link Mode</label>
              <Select
                value={form.mode}
                onChange={e => setForm({ ...form, mode: e.target.value as any })}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
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
                className="px-3 py-1.5 border border-[#E1D6BC] hover:bg-gray-100 rounded text-gray-600 font-semibold cursor-pointer"
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

      {/* Grid of active scheduled interviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {interviews.map(i => (
          <div
            key={i.id}
            className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition duration-150 relative"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] bg-accent-50 text-accent-600 font-bold px-2 py-0.5 rounded font-mono">
                  {i.interviewRound}
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      i.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {i.status}
                  </span>
                  <ActionMenu
                    items={[
                      {
                        key: 'file',
                        label: 'View File',
                        icon: <Eye size={13} />,
                        disabled: !onSelectCandidate,
                        onClick: () => onSelectCandidate?.(i.candidateId),
                      },
                      {
                        key: 'shortlist',
                        label: 'Shortlist & Schedule',
                        icon: <UserCheck size={13} />,
                        disabled: !onShortlistCandidate,
                        onClick: () => onShortlistCandidate?.(i.candidateId, i.candidateName),
                      },
                      {
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 size={13} />,
                        danger: true,
                        disabled: !onDeleteInterview,
                        onClick: () => {
                          if (confirm(`Delete the ${i.interviewRound} interview for ${i.candidateName}?`)) {
                            onDeleteInterview?.(i.id);
                          }
                        },
                      },
                    ]}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 font-display">{i.candidateName}</h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {i.appliedRole} • {i.department}
                </p>
              </div>

              <div className="text-[11px] text-gray-600 bg-[#EAE1CC] p-2 rounded-lg space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Panel Evaluator:</span>
                  <span className="font-semibold text-gray-800">{i.interviewerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slot Time:</span>
                  <span className="font-semibold text-gray-850">
                    {new Date(i.dateTime).toLocaleDateString()}{' '}
                    {new Date(i.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between truncate">
                  <span>Access Mode:</span>
                  <span className="font-semibold text-accent-600 underline truncate select-all">
                    {i.meetingMode}
                  </span>
                </div>
              </div>
            </div>

            {i.grading && (
              <div className="mt-3 pt-2.5 border-t border-[#E1D6BC]/60 text-[11px] space-y-1">
                <p className="font-bold text-gray-700">
                  Recommendation: <span className="text-emerald-600">{i.grading.recommendation}</span>
                </p>
                <p className="text-gray-400 italic">"{i.grading.interviewerComments}"</p>
              </div>
            )}
          </div>
        ))}
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
  const [activeTab, setActiveTab] = useState<'iq' | 'assignments'>('iq');

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Assessments & Assignments Library
          </h2>
          <p className="text-gray-400 text-[11px]">
            Role-based question building, IQ metrics automatic scoring, and trial repo reviews.
          </p>
        </div>
        <div className="border border-[#E1D6BC] rounded-lg bg-[#FFFFFF] overflow-hidden flex font-semibold text-xs">
          <button
            onClick={() => setActiveTab('iq')}
            className={`px-3 py-1.5 transition ${activeTab === 'iq' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EAE1CC]'}`}
          >
            IQ Test Logs
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-1.5 transition ${activeTab === 'assignments' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EAE1CC]'}`}
          >
            Submissions Queue
          </button>
        </div>
      </div>

      {activeTab === 'iq' ? (
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F1E4] border-b border-[#E1D6BC] text-gray-400 font-mono text-[9px] uppercase font-bold">
                <th className="p-3">Candidate</th>
                <th className="p-3">Test Date</th>
                <th className="p-3">Attempted questions</th>
                <th className="p-3">Succeeded percentage</th>
                <th className="p-3">Qualification</th>
                <th className="p-3">Remarks</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BC]">
              {iqTests.map(idx => (
                <tr key={idx.id} className="hover:bg-[#F7F1E4] transition">
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
                  <td className="p-3">
                    <div className="flex items-center justify-end">
                      <ActionMenu
                        items={[
                          {
                            key: 'file',
                            label: 'View File',
                            icon: <Eye size={13} />,
                            disabled: !onSelectCandidate,
                            onClick: () => onSelectCandidate?.(idx.candidateId),
                          },
                          {
                            key: 'shortlist',
                            label: 'Shortlist & Schedule',
                            icon: <UserCheck size={13} />,
                            disabled: !onShortlistCandidate,
                            onClick: () => onShortlistCandidate?.(idx.candidateId, idx.candidateName),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            danger: true,
                            disabled: !onDeleteTest,
                            onClick: () => {
                              if (confirm(`Delete this IQ test record for ${idx.candidateName}?`)) {
                                onDeleteTest?.(idx.id);
                              }
                            },
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
      ) : (
        <div className="space-y-4">
          {assignments.map(asm => (
            <div key={asm.id} className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start border-b border-[#EAE1CC] pb-2">
                <div>
                  <h4 className="font-bold text-gray-900">{asm.assignmentTitle}</h4>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    Role: {asm.role} • Max Score: {asm.maximumMarks} • Pass: {asm.passingMarks}
                  </p>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600`}
                >
                  {asm.difficultyLevel} Difficulty
                </span>
              </div>

              <p className="text-gray-600 bg-[#EAE1CC] p-3 rounded-lg">{asm.instructions}</p>

              <div>
                <h5 className="font-bold text-[10px] uppercase font-mono text-gray-400 mb-2">
                  Candidate submissions ({asm.submissions.length})
                </h5>
                <div className="space-y-2">
                  {asm.submissions.map(sub => (
                    <div
                      key={sub.id}
                      className="border border-gray-100 rounded-lg p-3 flex justify-between items-center text-xs bg-[#F7F1E4]"
                    >
                      <div>
                        <span className="font-semibold text-gray-900">{sub.candidateName}</span>
                        <p className="text-[10px] text-gray-400 font-mono">
                          Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {sub.grading ? (
                        <div className="text-right">
                          <span className="font-bold text-emerald-600">
                            {sub.grading.overallScore} / {asm.maximumMarks}
                          </span>
                          <span className="text-[10px] text-gray-400 block italic mt-0.5">
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
          <p className="text-gray-400 text-[11px]">
            Checklist-driven joiner actions. Completing criteria enables corporate asset/login allocations.
          </p>
        </div>

        {/* Selected Joiners Selector */}
        <Select
          value={selectedCandidate}
          onChange={e => setSelectedCandidate(e.target.value)}
          className="px-2.5 py-1 text-xs border border-[#E1D6BC] bg-[#FFFFFF] rounded font-medium focus:outline-none"
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
          <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <span className="text-[11px] text-gray-400 font-mono font-semibold uppercase tracking-wider">
                Candidate Progress
              </span>
              <h3 className="font-bold text-gray-900 font-display text-base truncate">
                {activeChecklist.candidateName}
              </h3>
              <p className="text-[11px] text-accent-600 font-semibold font-mono">
                {activeChecklist.onboardingStatus}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-4 bg-[#EAE1CC]/50 rounded-lg">
              <div className="text-3xl font-extrabold text-accent-600 font-display">
                {activeChecklist.progressPercentage}%
              </div>
              <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider block mt-1">
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
                className="w-full bg-gray-100 text-gray-400 font-medium rounded py-2 text-center text-[10px] font-mono cursor-not-allowed"
              >
                Clear all tasks to active EMP conversion
              </button>
            )}
          </div>

          {/* Checklist Tasks List (Linear style) (Col-span-2) */}
          <div className="md:col-span-2 bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-4">
            <div className="border-b border-[#EAE1CC] pb-2">
              <h4 className="font-bold text-gray-900">Pre-joining & Induction Checklist Items</h4>
              <p className="text-[10px] text-gray-400">Click checkboxes to log finalized state:</p>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {activeChecklist.tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onToggleTask(activeChecklist.candidateName, t.id)}
                  className="flex items-center gap-3 p-2.5 border border-[#E1D6BC] hover:bg-[#EAE1CC] rounded-lg cursor-pointer transition"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                      t.isChecked
                        ? 'bg-accent-600 border-accent-600 text-white'
                        : 'border-gray-300 bg-[#FFFFFF]'
                    }`}
                  >
                    {t.isChecked && <Check size={10} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${t.isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}
                    >
                      {t.title}
                    </p>
                    <span className="text-[9px] text-gray-400 font-mono italic block mt-0.5">
                      Category: {t.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-6 text-center text-gray-400">
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
}

export function EmployeeDirectoryView({ employees, onSelectEmployee, onUpdateEmployee }: DirectoryViewProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  const departments = ['All', 'Engineering', 'Product', 'Design', 'Sales', 'Human Resources'];

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
            Opti Circle Active Employee Directory
          </h2>
          <p className="text-gray-400 text-[11px]">
            Browse employee records, issued system logins, assigned hardware, and historic review scorecards.
          </p>
        </div>

        {/* Directory filter bars */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-2 text-gray-400">
              <Search size={12} />
            </span>
            <input
              type="text"
              placeholder="Filter names..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1 bg-[#FFFFFF] border border-[#E1D6BC] rounded text-xs focus:outline-none"
            />
          </div>

          <Select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-2 py-1 bg-[#FFFFFF] border border-[#E1D6BC] rounded focus:outline-none font-medium"
          >
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Grid of employees */}
      <div
        id="employees-cards"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {filtered.map(emp => (
          <div
            key={emp.id}
            onClick={() => onSelectEmployee(emp.id)}
            className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-4 flex flex-col justify-between hover:shadow-xs hover:border-accent-400 cursor-pointer transition duration-150"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs truncate">
                  {emp.fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </div>
                <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded font-mono">
                  {emp.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 text-xs tracking-tight">{emp.fullName}</h4>
                <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">{emp.role}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {emp.department} Squad • {emp.workLocation}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-[#E1D6BC]/65 flex justify-between items-center text-[10px] font-mono text-gray-400">
              <span>ID: {emp.id}</span>
              <span>Joined: {emp.joiningDate}</span>
            </div>
          </div>
        ))}
      </div>
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
          <p className="text-gray-400 text-[11px]">
            Security access controls list and physical company inventory logs.
          </p>
        </div>

        <div className="border border-[#E1D6BC] rounded-lg bg-[#FFFFFF] overflow-hidden flex font-semibold text-xs shrink-0">
          <button
            onClick={() => setActiveTab('creds')}
            className={`px-3 py-1.5 transition ${activeTab === 'creds' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EAE1CC]'}`}
          >
            System Credentials
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1.5 transition ${activeTab === 'assets' ? 'bg-accent-50 text-accent-600' : 'text-gray-600 hover:bg-[#EAE1CC]'}`}
          >
            Hardware Inventory
          </button>
        </div>
      </div>

      {activeTab === 'creds' ? (
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F1E4] border-b border-[#E1D6BC] text-gray-400 font-mono text-[9px] uppercase font-bold">
                <th className="p-3">Employee</th>
                <th className="p-3">Target System</th>
                <th className="p-3">Assigned Identity</th>
                <th className="p-3 text-center">Perm Match</th>
                <th className="p-3 text-center">Security PIN</th>
                <th className="p-3">State</th>
                <th className="p-3 text-right">Moderator Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BC]">
              {employees.flatMap(emp =>
                (emp.credentials || []).map(cred => (
                  <tr key={cred.id} className="hover:bg-[#F7F1E4] transition">
                    <td className="p-3 font-semibold text-gray-900">{emp.fullName}</td>
                    <td className="p-3 font-medium text-gray-800">{cred.systemName}</td>
                    <td className="p-3 font-mono">{cred.assignedEmail}</td>
                    <td className="p-3 text-center font-semibold">{cred.accessLevel}</td>
                    <td className="p-3 text-center font-mono text-gray-400 select-all">••••••••••</td>
                    <td className="p-3">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          cred.status === 'Active'
                            ? 'bg-green-50 text-green-600'
                            : cred.status === 'Suspended'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {cred.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Select
                        value={cred.status}
                        onChange={e => onUpdateCredential(emp.id, cred.id, e.target.value)}
                        className="text-[10px] bg-[#FFFFFF] border border-[#E1D6BC] px-1.5 py-1 rounded cursor-pointer text-gray-600 focus:ring-1 focus:ring-accent-600 focus:outline-none"
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
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F1E4] border-b border-[#E1D6BC] text-gray-400 font-mono text-[9px] uppercase font-bold">
                <th className="p-3">Asset ID</th>
                <th className="p-3">Specification</th>
                <th className="p-3">Item Category</th>
                <th className="p-3">Assigned To</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Condition / Modification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BC]">
              {assets.map(ast => (
                <tr key={ast.id} className="hover:bg-[#F7F1E4] transition">
                  <td className="p-3 font-mono font-bold text-gray-700">{ast.id}</td>
                  <td className="p-3 font-semibold text-gray-900">{ast.assetName}</td>
                  <td className="p-3">{ast.assetType}</td>
                  <td className="p-3">
                    {ast.assignedToEmployeeName ? (
                      <span className="font-medium text-gray-800">{ast.assignedToEmployeeName}</span>
                    ) : (
                      <span className="text-gray-400 italic">Available in IT Depot</span>
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
                      className="text-[10px] bg-[#FFFFFF] border border-[#E1D6BC] px-1.5 py-1 rounded cursor-pointer text-gray-600 focus:outline-none"
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
    recommendedSalaryRevision: '$180,000',
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
      currentSalary: '$150,000',
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
      <div className="flex justify-between items-center bg-[#F7F1E4] border-b border-[#E1D6BC] pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
            Appraisals & Growth Scorecards
          </h2>
          <p className="text-gray-400 text-[11px]">
            Systematic salary reviews, manager feedback recording, and promotion workflows.
          </p>
        </div>

        <Select
          value={selectedEmp}
          onChange={e => setSelectedEmp(e.target.value)}
          className="px-2.5 py-1 text-xs border border-[#E1D6BC] bg-[#FFFFFF] rounded font-medium focus:outline-none"
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
          className="md:col-span-2 bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-4"
        >
          <h3 className="font-bold text-gray-900">Conduct Annual Appraisal Cycle Review</h3>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Review Cycle Period</label>
              <input
                type="text"
                value={reviewForm.reviewPeriod}
                onChange={e => setReviewForm({ ...reviewForm, reviewPeriod: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
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
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Annual Target Achievement & Deliverables</label>
            <textarea
              value={reviewForm.targetAchievement}
              onChange={e => setReviewForm({ ...reviewForm, targetAchievement: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Manager Qualitative Feedback</label>
            <textarea
              value={reviewForm.managerFeedback}
              onChange={e => setReviewForm({ ...reviewForm, managerFeedback: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
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
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Proposed New Salary Bracket</label>
              <input
                type="text"
                value={reviewForm.recommendedSalaryRevision}
                onChange={e => setReviewForm({ ...reviewForm, recommendedSalaryRevision: e.target.value })}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
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
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900 uppercase font-mono text-[10px] text-gray-400">
            Historic Logs
          </h3>

          {targetEmp?.appraisalHistory && targetEmp.appraisalHistory.length > 0 ? (
            targetEmp.appraisalHistory.map(hist => (
              <div key={hist.id} className="p-3 border border-gray-100 rounded-lg space-y-2 bg-[#F7F1E4]">
                <div className="flex justify-between items-center font-mono text-[9px]">
                  <span className="font-semibold text-accent-600">{hist.reviewPeriod}</span>
                  <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
                    {hist.status}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-800">Scorecard: ⭐ {hist.performanceScore} / 5</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    Promotion recommendation: {hist.recommendedPromotion}
                  </p>
                </div>
                <p className="text-gray-500 italic">"{hist.managerFeedback}"</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs">
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
          <p className="text-gray-400 text-[11px]">
            Notice period clearances, asset collection, and formal Knowledge Transfer document approvals.
          </p>
        </div>

        <Select
          value={selectedCase}
          onChange={e => setSelectedCase(e.target.value)}
          className="px-2.5 py-1 text-xs border border-[#E1D6BC] bg-[#FFFFFF] rounded font-medium focus:outline-none"
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
          <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 flex flex-col justify-between space-y-4">
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
              <div className="bg-[#EAE1CC] p-2.5 rounded-lg text-[10px] border border-[#E1D6BC] space-y-1.5 font-mono">
                <p className="text-gray-400 uppercase font-bold text-[9px]">Knowledge Transfer Summary:</p>
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
          <div className="md:col-span-2 bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-gray-900 border-b border-[#EAE1CC] pb-1.5">
              Compliance Clearance Checkpoints
            </h4>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {activeCase.checklist.map(t => (
                <div
                  key={t.id}
                  onClick={() => onToggleExitTask(activeCase.employeeId, t.id)}
                  className="flex items-center gap-3 p-2.5 border border-[#E1D6BC] hover:bg-gray-55 rounded-lg cursor-pointer transition"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                      t.isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 bg-[#FFFFFF]'
                    }`}
                  >
                    {t.isChecked && <Check size={10} />}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${t.isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}
                    >
                      {t.title}
                    </p>
                    <span className="text-[9px] text-gray-400 font-mono block mt-0.5">
                      Control: {t.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Exit Deliverables & Handover */}
          <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAE1CC] pb-1.5">
              <h4 className="font-bold text-gray-900">Exit Deliverables &amp; Handover</h4>
              <span className="text-[10px] font-mono text-gray-400">
                {(activeCase.deliverables || []).filter(d => d.isSubmitted).length}/
                {(activeCase.deliverables || []).length} submitted
              </span>
            </div>
            {(activeCase.deliverables || []).length === 0 ? (
              <p className="text-gray-400 text-[11px] py-3 text-center">
                No deliverables defined for this exit.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(activeCase.deliverables || []).map(d => (
                  <div
                    key={d.id}
                    onClick={() => onToggleDeliverable(activeCase.employeeId, d.id)}
                    className="flex items-center gap-3 p-2.5 border border-[#E1D6BC] hover:bg-gray-55 rounded-lg cursor-pointer transition"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                        d.isSubmitted
                          ? 'bg-accent-600 border-accent-600 text-white'
                          : 'border-gray-300 bg-[#FFFFFF]'
                      }`}
                    >
                      {d.isSubmitted && <Check size={10} />}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${d.isSubmitted ? 'line-through text-gray-400' : 'text-gray-800'}`}
                      >
                        {d.title}
                      </p>
                      {d.owner && (
                        <span className="text-[9px] text-gray-400 font-mono block mt-0.5">
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
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-6 text-center text-gray-400">
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
  const [recipientName, setRecipientName] = useState('Sophia Henderson');
  const [recipientEmail, setRecipientEmail] = useState('sophia.h@gmail.com');
  const [roleField, setRoleField] = useState('Senior React Developer');

  const selectedTemplate = emailTemplates.find(t => t.id === activeTemplateId) ?? emailTemplates[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerEmail(selectedTemplate?.id || activeTemplateId, recipientName, recipientEmail, {
      '{{CANDIDATE_NAME}}': recipientName,
      '{{ROLE}}': roleField,
      '{{COMPANY_NAME}}': 'Curcle',
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
        <p className="text-gray-400 text-[11px]">
          System communication template builder, tracking mail delivery and candidate response times.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Template selector & trigger */}
        <form onSubmit={handleSend} className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Email Draft Trigger Creator</h3>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700">Choose Template Class</label>
            <Select
              value={activeTemplateId}
              onChange={e => setActiveTemplateId(e.target.value)}
              className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
            >
              {emailTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#EAE1CC]">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Role Dynamic Variable</label>
              <input
                type="text"
                value={roleField}
                onChange={e => setRoleField(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#E1D6BC] bg-[#EAE1CC] rounded"
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
          <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">
                Live Variable Compilation Parser
              </span>
              <div className="border border-[#E1D6BC] p-3 rounded-lg bg-[#F7F1E4] font-mono text-[11px] text-gray-700 space-y-2 max-h-[300px] overflow-y-auto">
                <p className="font-bold text-gray-900 border-b border-gray-150 pb-1">
                  Subject: {selectedTemplate.subject.replace('{{ROLE}}', roleField)}
                </p>
                <p className="whitespace-pre-line leading-relaxed text-gray-600 pt-1">
                  {selectedTemplate.bodyTemplate
                    .replace('{{CANDIDATE_NAME}}', recipientName)
                    .replace('{{ROLE}}', roleField)
                    .replace('{{COMPANY_NAME}}', 'Curcle')
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
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-3 overflow-y-auto max-h-[380px]">
          <h3 className="font-bold text-gray-900 uppercase font-mono text-[10px] text-gray-400">
            Sent Triggers Log
          </h3>
          <div className="space-y-2">
            {sentMails.map(m => (
              <div key={m.id} className="p-2.5 border border-gray-100 bg-[#F7F1E4] rounded-lg">
                <div className="flex justify-between text-[10px]">
                  <span className="font-semibold text-gray-800">{m.recipientName}</span>
                  <span className="text-green-600 font-bold">{m.status}</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 font-mono">{m.subject}</p>
                <p className="text-[9px] text-gray-400 font-mono mt-1.5">
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
export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'rules'>('general');

  return (
    <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-6 text-xs select-none space-y-5">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          Circle HR Workspace Settings
        </h2>
        <p className="text-gray-400 text-[11px]">
          Manage security guidelines, background validation rules, and template variables.
        </p>
      </div>

      <div className="border-b border-gray-100 flex gap-4 pb-1.5 font-semibold">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-1.5 border-b-2 ${activeTab === 'general' ? 'border-accent-600 text-accent-600' : 'border-transparent text-gray-400'}`}
        >
          General Workspace
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-1.5 border-b-2 ${activeTab === 'roles' ? 'border-accent-600 text-accent-600' : 'border-transparent text-gray-400'}`}
        >
          Roles & Cryptography
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-1.5 border-b-2 ${activeTab === 'rules' ? 'border-accent-600 text-accent-600' : 'border-transparent text-gray-400'}`}
        >
          Automated Rules Rules
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Workspace Tenant Name</p>
              <input
                type="text"
                value="Opti Corp HQ Inc"
                disabled
                className="w-full bg-[#EAE1CC] px-2.5 py-1.5 rounded border border-[#E1D6BC]"
              />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-800">Primary Domain Link</p>
              <input
                type="text"
                value="https://projectcircle.optiprime.io"
                disabled
                className="w-full bg-[#EAE1CC] px-2.5 py-1.5 rounded border border-[#E1D6BC]"
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
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-3">
          <h4 className="font-bold text-gray-850">Regulatory Role permissions matrix</h4>
          <div className="border border-[#E1D6BC] rounded bg-[#EAE1CC] p-3 space-y-2 font-mono text-[11px]">
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
      )}

      {activeTab === 'rules' && (
        <div className="space-y-3">
          <h4 className="font-bold text-gray-850">Corporate BGV Dependency Checklist Rules</h4>
          <div className="space-y-2 bg-[#F7F1E4] p-3 rounded-lg border border-gray-100">
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
      )}
    </div>
  );
}
