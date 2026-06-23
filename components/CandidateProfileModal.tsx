'use client';
import { Select } from './Select';
import { DocumentsPanel } from './DocumentsPanel';
import { useToast } from './Toaster';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestReportModal, fmtTestDate } from './TestReportModal';
import { useTestInvites } from '@/features/test-invites/hooks';
import { useSchedules } from '@/features/schedule/hooks';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Link2,
  Linkedin,
  FileText,
  Clock,
  CheckCircle,
  ThumbsUp,
  Settings,
  Briefcase,
  AlertTriangle,
  Award,
  BookOpen,
  Send,
  Plus,
  BrainCircuit,
  ClipboardList,
  ShieldAlert,
  Eye,
  CalendarClock,
} from 'lucide-react';
import {
  Candidate,
  Interview,
  IQTest,
  Assignment,
  BGVRequirement,
  TestInvite,
} from '../types';

interface CandidateProfileModalProps {
  candidate: Candidate;
  onClose: () => void;
  interviews: Interview[];
  iqTests: IQTest[];
  assignments: Assignment[];
  bgv: BGVRequirement | undefined | null;
  initialTab?: 'profile' | 'evaluation' | 'bgv';
  onUpdateCandidate: (updated: Candidate) => void;
  onUpdateBGV: (updated: BGVRequirement) => void;
  onStartBGV?: () => void;
  onGradingSubmitted: (
    interviewId: string,
    recommendation: string,
    comments: string,
    overallScore: number,
  ) => void;
  onScheduleInterview: (round: string, interviewer: string, dateTime: string, mode: string) => void;
  userRole: 'HR' | 'Admin';
}

export function CandidateProfileModal({
  candidate,
  onClose,
  interviews,
  iqTests,
  assignments,
  bgv,
  initialTab = 'profile',
  onUpdateCandidate,
  onUpdateBGV,
  onStartBGV,
  onGradingSubmitted,
  onScheduleInterview,
  userRole,
}: CandidateProfileModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'evaluation' | 'bgv'>(initialTab);

  // Local forms state
  const [hrCallForm, setHrCallForm] = useState({
    completed: candidate.hrCall?.completed || false,
    candidateAvailability: candidate.hrCall?.candidateAvailability || '',
    communicationRating: candidate.hrCall?.communicationRating || 3,
    professionalBackgroundSummary: candidate.hrCall?.professionalBackgroundSummary || '',
    reasonForJobChange: candidate.hrCall?.reasonForJobChange || '',
    currentCtc: candidate.hrCall?.currentCtc || candidate.currentCtc || '',
    expectedCtc: candidate.hrCall?.expectedCtc || candidate.expectedCtc || '',
    noticePeriodDays: candidate.hrCall?.noticePeriodDays || candidate.noticePeriodDays || 30,
    roleUnderstanding: candidate.hrCall?.roleUnderstanding || '',
    interestLevel: candidate.hrCall?.interestLevel || 3,
    culturalFitRemarks: candidate.hrCall?.culturalFitRemarks || '',
    hrRecommendation: candidate.hrCall?.hrRecommendation || '',
    nextStep: candidate.hrCall?.nextStep || 'Proceed to Interview',
  });

  // Scheduling local form
  const [scheduleForm, setScheduleForm] = useState({
    round: 'Technical Panel 1',
    interviewer: 'Donald Knuth',
    dateTime: '2026-06-15T14:30',
    mode: 'Google Meet',
  });

  // Grading local form state
  const [gradingForm, setGradingForm] = useState({
    selectedInterviewId: '',
    recommendation: 'Hire',
    comments: 'Demonstrated solid algorithm understanding and exceptional React hooks mastery.',
    overallScore: 4.5,
  });

  const [bgvDocComment, setBgvDocComment] = useState('');
  const [testReport, setTestReport] = useState<TestInvite | null>(null);

  // Live pipeline data: online test invites/results + scheduled events.
  const { data: allTestInvites = [] } = useTestInvites();
  const { data: allSchedules = [] } = useSchedules();

  const handleSaveHrCall = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCandidate: Candidate = {
      ...candidate,
      status: hrCallForm.nextStep === 'Proceed to Interview' ? 'Shortlisted' : 'On Hold',
      hrCall: {
        completed: true,
        candidateAvailability: hrCallForm.candidateAvailability,
        communicationRating: Number(hrCallForm.communicationRating),
        professionalBackgroundSummary: hrCallForm.professionalBackgroundSummary,
        reasonForJobChange: hrCallForm.reasonForJobChange,
        currentCtc: hrCallForm.currentCtc,
        expectedCtc: hrCallForm.expectedCtc,
        noticePeriodDays: Number(hrCallForm.noticePeriodDays),
        roleUnderstanding: hrCallForm.roleUnderstanding,
        interestLevel: Number(hrCallForm.interestLevel),
        culturalFitRemarks: hrCallForm.culturalFitRemarks,
        hrRecommendation: hrCallForm.hrRecommendation,
        nextStep: hrCallForm.nextStep as any,
        completedDate: new Date().toISOString().split('T')[0],
      },
    };
    onUpdateCandidate(updatedCandidate);
    toast.success('HR call summary recorded — pipeline stage updated.');
  };

  const handleUpdateDocStatus = (docType: string, targetStatus: string) => {
    if (!bgv) return;
    const updatedDocs = bgv.documents.map(d =>
      d.type === docType ? { ...d, status: targetStatus as any, remarks: bgvDocComment || undefined } : d,
    );

    const allVerified = updatedDocs.every(d => d.status === 'Verified' || d.status === 'Pending'); // simplified check

    const updatedBgv: BGVRequirement = {
      ...bgv,
      documents: updatedDocs,
      overallStatus: allVerified ? 'Verified' : 'Under Verification',
      verificationTimeline: [
        {
          date: new Date().toISOString().split('T')[0],
          action: `Set document status [${docType}] to [${targetStatus}]`,
          performedBy: 'Sarah Jenkins (HR Director)',
        },
        ...bgv.verificationTimeline,
      ],
    };
    onUpdateBGV(updatedBgv);
    setBgvDocComment('');
  };

  // Associated Candidate Interviews
  const candidateInterviews = interviews.filter(i => i.candidateId === candidate.id);
  // BGV gate: verification may only be triggered by HR once an interview has
  // been graded successfully (Hire / Strong Hire).
  const interviewCleared = candidateInterviews.some(
    i => i.grading && ['Strong Hire', 'Hire'].includes(i.grading.recommendation),
  );
  // Latest IQ attempt (newest first) so a re-scheduled retake's score wins.
  const candidateIq = iqTests
    .filter(iq => iq.candidateId === candidate.id)
    .sort((a, b) => (b.testDate ?? '').localeCompare(a.testDate ?? ''))[0];
  const candidateTests = allTestInvites
    .filter(t => t.candidateId === candidate.id)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const candidateEvents = allSchedules
    .filter(s => s.candidateId === candidate.id && s.status !== 'Cancelled')
    .sort((a, b) => (a.dateTime ?? '').localeCompare(b.dateTime ?? ''));

  const copyTestLink = async (id: string) => {
    const url = `${window.location.origin}/test/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Test link copied.');
    } catch {
      toast.error('Could not copy the test link — try again.');
    }
  };
  const candidateAssignmentsSubmissions = assignments.flatMap(a =>
    a.submissions
      .filter(s => s.candidateId === candidate.id)
      .map(s => ({ ...s, assignmentTitle: a.assignmentTitle })),
  );

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex justify-end z-[100] transition-opacity duration-300">
      <div className="bg-[#FFFFFF] w-full max-w-4xl h-full flex flex-col shadow-2xl relative animate-slide-in select-none">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E4E6EA] bg-[#F7F8FA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center text-accent-600 font-bold text-sm">
              {candidate.fullName
                .split(' ')
                .map(n => n[0])
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">{candidate.fullName}</h2>
                <span className="text-[10px] bg-accent-50 text-accent-600 font-semibold px-2 py-0.5 rounded font-mono">
                  {candidate.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Applied for {candidate.appliedRole} • {candidate.department}
              </p>
            </div>
          </div>

          <button
            id="close-profile-modal"
            aria-label="Close" onClick={onClose}
            className="p-1.5 hover:bg-[#EDEEF1] rounded-md text-gray-500 hover:text-gray-600 shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as 'profile' | 'evaluation' | 'bgv')}
          className="shrink-0 gap-0"
        >
          <TabsList className="bg-[#FFFFFF] px-6 text-xs font-medium">
            <TabsTrigger value="profile" className="py-3">
              Profile &amp; Resume
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="py-3">
              Assessments &amp; Grading
            </TabsTrigger>
            <TabsTrigger value="bgv" className="py-3">
              BGV &amp; Onboarding Setup{' '}
              {bgv && (
                <span className="ml-1 rounded-md bg-yellow-50 px-1 text-[9px] font-bold text-yellow-600">
                  Pending
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content Body split */}
        <div className="flex-1 overflow-y-auto flex min-h-0 bg-[#F7F8FA]">
          {activeTab === 'profile' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              {/* Left Sidebar column: details */}
              <div className="w-full md:w-5/12 border-r border-[#E4E6EA] p-5 space-y-5 overflow-y-auto bg-[#FFFFFF]">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                    Overview
                  </h3>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                      <span>Source:</span>
                      <span className="font-semibold text-gray-900">{candidate.sourceOfApplication}</span>
                    </div>
                    {candidate.referralDetails && (
                      <div className="flex justify-between py-1 border-b border-gray-55 text-accent-600 bg-accent-50/50 p-2 rounded">
                        <span>Referral:</span>
                        <span className="font-semibold text-right">{candidate.referralDetails}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                      <span>Experience:</span>
                      <span className="font-semibold text-gray-900">
                        {candidate.totalExperienceYears} Years (Relevant: {candidate.relevantExperienceYears}{' '}
                        Yrs)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                      <span>Notice Period:</span>
                      <span className="font-semibold text-gray-900">{candidate.noticePeriodDays} Days</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                    CTC Metrics
                  </h3>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                      <span>Current:</span>
                      <span className="font-semibold text-gray-900">{candidate.currentCtc}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#EDEEF1]">
                      <span>Expected:</span>
                      <span className="font-semibold text-gray-900 text-accent-600">
                        {candidate.expectedCtc}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                    Contact Details
                  </h3>
                  <div className="space-y-2.5 text-xs text-gray-600">
                    <a
                      href={`mailto:${candidate.email}`}
                      className="flex items-center gap-2 hover:text-accent-600"
                    >
                      <Mail size={12} className="text-gray-500" />
                      <span className="truncate">{candidate.email}</span>
                    </a>
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-gray-500" />
                      <span>{candidate.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-gray-500" />
                      <span>{candidate.location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                    Professional Channels
                  </h3>
                  <div className="flex gap-2.5 text-xs">
                    {candidate.linkedInUrl && (
                      <a
                        href={candidate.linkedInUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-accent-600 bg-accent-50 px-2.5 py-1 rounded-md hover:bg-accent-100 font-medium"
                      >
                        <Linkedin size={11} />
                        LinkedIn
                      </a>
                    )}
                    {candidate.portfolioLink && (
                      <a
                        href={candidate.portfolioLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-gray-650 bg-[#EDEEF1] px-2.5 py-1 rounded-md hover:bg-[#ECEDF0] font-medium"
                      >
                        <Link2 size={11} />
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E4E6EA]">
                  <DocumentsPanel
                    entityType="candidate"
                    entityId={candidate.id}
                    category="resume"
                    title="Resume & Documents"
                    previewOnly
                  />
                </div>
              </div>

              {/* Right column: activity timeline & HR intros call */}
              <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                {/* Cultural/Initial Remark panel */}
                <div className="bg-[#FFFFFF] border border-[#E4E6EA] p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                    HR Screening Remarks
                  </h4>
                  <p className="text-xs text-gray-800 italic bg-[#EDEEF1] p-3 rounded-lg border-l-2 border-accent-500 font-serif leading-relaxed">
                    "
                    {candidate.hrRemarks ||
                      'No initial remarks have been entered. Add some below during introductory screening.'}
                    "
                  </p>
                </div>

                {/* Introductory Call summary details */}
                <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E4E6EA]/60 pb-2">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                      HR Introductory Call (Feedback)
                    </h3>
                    {candidate.hrCall?.completed ? (
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
                        Completed
                      </span>
                    ) : (
                      <span className="text-[10px] bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-bold">
                        Pending Call
                      </span>
                    )}
                  </div>

                  {!candidate.hrCall?.completed ? (
                    /* Interactive intro input form if pending */
                    <form onSubmit={handleSaveHrCall} className="space-y-4 text-xs">
                      <p className="text-[11px] text-gray-500 italic">
                        Enter metrics below to document the candidate call securely:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="font-semibold text-gray-700">Availability to Join</label>
                          <input
                            type="text"
                            placeholder="Immediate, 15 days, 1 month..."
                            value={hrCallForm.candidateAvailability}
                            onChange={e =>
                              setHrCallForm({ ...hrCallForm, candidateAvailability: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus:ring-1 focus:ring-accent-600 bg-[#EDEEF1]"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-gray-700">Communication Quality (1-5)</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={hrCallForm.communicationRating}
                            onChange={e =>
                              setHrCallForm({ ...hrCallForm, communicationRating: Number(e.target.value) })
                            }
                            className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-gray-700">Professional Background Summary</label>
                        <textarea
                          placeholder="Brief technical stack experience outline..."
                          value={hrCallForm.professionalBackgroundSummary}
                          onChange={e =>
                            setHrCallForm({ ...hrCallForm, professionalBackgroundSummary: e.target.value })
                          }
                          rows={2}
                          className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 bg-[#EDEEF1] font-sans"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="font-semibold text-gray-700">Recommended Next Step</label>
                          <Select
                            value={hrCallForm.nextStep}
                            onChange={e => setHrCallForm({ ...hrCallForm, nextStep: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded-md bg-[#EDEEF1]"
                          >
                            <option value="Proceed to Interview">Proceed to Panel Interview</option>
                            <option value="Keep on Hold">Keep on Hold</option>
                            <option value="Reject">Reject Candidate</option>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-gray-700">Cultural Fit Remarks</label>
                        <input
                          type="text"
                          placeholder="Attitude matches our horizontal principles..."
                          value={hrCallForm.culturalFitRemarks}
                          onChange={e => setHrCallForm({ ...hrCallForm, culturalFitRemarks: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 bg-[#EDEEF1]"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="bg-accent-600 hover:bg-accent-700 text-white font-medium px-4 py-1.5 rounded-md cursor-pointer transition"
                        >
                          Complete HR Call
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Display call summary state */
                    <div className="text-xs space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F7F8FA] p-3 rounded-lg border border-[#E4E6EA]">
                        <div>
                          <p className="text-gray-500 font-mono text-[9px] uppercase">Availability</p>
                          <p className="font-semibold text-gray-850">
                            {candidate.hrCall.candidateAvailability}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-mono text-[9px] uppercase">Comm Rating</p>
                          <p className="font-semibold text-gray-850">
                            ⭐ {candidate.hrCall.communicationRating} / 5
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-mono text-[9px] uppercase">Form Recommendation</p>
                          <p className="font-semibold text-accent-600">{candidate.hrCall.nextStep}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-gray-500 font-mono text-[9px] uppercase">
                          Professional Background
                        </p>
                        <p className="text-gray-700 bg-[#EDEEF1] p-2 rounded">
                          {candidate.hrCall.professionalBackgroundSummary}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-gray-500 font-mono text-[9px] uppercase">Cultural Fit Analysis</p>
                        <p className="text-gray-700 bg-[#EDEEF1] p-2 rounded">
                          {candidate.hrCall.culturalFitRemarks}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Recruitment pipeline — scheduled events + online test results */}
              <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-4">
                <div className="border-b border-[#E4E6EA]/65 pb-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                    Recruitment Pipeline — Tests &amp; Schedule
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Scheduled rounds, IQ test and assessment results with detailed analysis.
                  </p>
                </div>

                {/* Scheduled events strip */}
                {candidateEvents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {candidateEvents.map(ev => (
                      <span
                        key={ev.id}
                        className="flex items-center gap-1.5 text-[10px] font-mono font-semibold bg-[#F7F8FA] border border-[#E4E6EA] text-gray-700 px-2.5 py-1.5 rounded-lg"
                      >
                        <CalendarClock size={11} className="text-accent-600" />
                        {ev.type} ·{' '}
                        {new Date(ev.dateTime).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[8px] ${
                            ev.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-accent-50 text-accent-600'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Test invites / results */}
                {candidateTests.length === 0 ? (
                  <div className="text-center py-5 text-gray-500 text-xs">
                    No online tests have been sent to this candidate yet — shortlist them with
                    &quot;IQ Test&quot; to trigger one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {candidateTests.map(t => {
                      const finished =
                        t.status === 'Completed' || t.status === 'Auto-Submitted';
                      return (
                        <div
                          key={t.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-[#E4E6EA] bg-[#F7F8FA] rounded-lg px-3.5 py-2.5"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-800 min-w-[90px]">
                            {t.kind === 'iq' ? (
                              <BrainCircuit size={13} className="text-accent-600" />
                            ) : (
                              <ClipboardList size={13} className="text-accent-600" />
                            )}
                            {t.kind === 'iq' ? 'IQ Test' : 'Assessment'}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              t.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-600'
                                : t.status === 'Auto-Submitted'
                                  ? 'bg-orange-50 text-orange-600'
                                  : t.status === 'In Progress'
                                    ? 'bg-sky-50 text-sky-600'
                                    : 'bg-[#EDEEF1] text-gray-500'
                            }`}
                          >
                            {t.status}
                          </span>
                          {finished && (
                            <>
                              <span className="text-[12px] font-bold text-gray-900 tabular-nums">
                                {t.score}
                                {t.kind === 'assessment' && '%'}
                              </span>
                              <span
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                  t.passed
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-red-50 text-red-500'
                                }`}
                              >
                                {t.passed ? 'QUALIFIED' : 'NOT QUALIFIED'}
                              </span>
                              {(t.violations ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-orange-500 font-semibold text-[10px]">
                                  <ShieldAlert size={11} /> {t.violations} violation
                                  {(t.violations ?? 0) === 1 ? '' : 's'}
                                </span>
                              )}
                            </>
                          )}
                          <span className="text-[10px] text-gray-500 font-mono ml-auto">
                            {fmtTestDate(t.completedAt ?? t.createdAt)}
                          </span>
                          {finished ? (
                            <button
                              onClick={() => setTestReport(t)}
                              className="text-[10px] bg-[#FFFFFF] border border-[#E4E6EA] text-gray-700 hover:text-accent-600 hover:border-accent-300 px-2 py-1 rounded-md font-semibold font-mono flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            >
                              <Eye size={11} /> Detailed report
                            </button>
                          ) : (
                            <button
                              onClick={() => copyTestLink(t.id)}
                              className="text-[10px] bg-[#FFFFFF] border border-[#E4E6EA] text-gray-700 hover:text-accent-600 hover:border-accent-300 px-2 py-1 rounded-md font-semibold font-mono flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              title="Copy the candidate's test link"
                            >
                              <Link2 size={11} /> Copy link
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scheduled / Historic Interviews panel */}
              <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4E6EA]/65 pb-2">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                      Interview Panel Records
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Scheduled rounds and evaluation grading records are listed here.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onScheduleInterview(
                        scheduleForm.round,
                        scheduleForm.interviewer,
                        scheduleForm.dateTime,
                        scheduleForm.mode,
                      );
                      toast.success('Interview scheduled — invite email recorded in history.');
                    }}
                    className="bg-[#EDEEF1] hover:bg-[#ECEDF0] text-gray-800 text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition font-semibold"
                  >
                    <Plus size={12} /> Schedule New
                  </button>
                </div>

                <div className="space-y-3">
                  {candidateInterviews.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      No interviews are logged for this candidate yet.
                    </div>
                  ) : (
                    candidateInterviews.map(idx => (
                      <div
                        key={idx.id}
                        className="p-3 border border-[#E4E6EA] rounded-lg space-y-3 bg-[#F7F8FA]"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-gray-800 text-xs">{idx.interviewRound}</span>
                            <p className="text-[10px] text-gray-500 font-mono">
                              with {idx.interviewerName} • {idx.meetingMode}
                            </p>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              idx.status === 'Completed'
                                ? 'bg-green-50 text-green-600'
                                : 'bg-accent-50 text-accent-600'
                            }`}
                          >
                            {idx.status}
                          </span>
                        </div>

                        {idx.grading ? (
                          <div className="border-t border-[#ECEDF0] pt-2 text-xs space-y-2">
                            <div className="bg-[#FFFFFF] p-2.5 rounded border border-[#E4E6EA] flex justify-between items-center text-[10px]">
                              <div>
                                <span className="text-gray-500 font-mono uppercase mr-2">
                                  Evaluation Feedback:
                                </span>
                                <span className="font-semibold text-gray-800">
                                  {idx.grading.recommendation}
                                </span>
                              </div>
                              <span className="font-mono text-gray-500">
                                Graded on {idx.grading.gradedAt}
                              </span>
                            </div>
                            <p className="text-gray-500 italic bg-[#FFFFFF] p-2 rounded">
                              "{idx.grading.interviewerComments}"
                            </p>
                          </div>
                        ) : (
                          // Active evaluation feedback trigger if pending
                          userRole === 'HR' && (
                            <div className="border-t border-[#ECEDF0] pt-3 space-y-3 text-xs">
                              <p className="font-bold text-gray-500 font-mono text-[9px] uppercase">
                                Input secure interview feedback:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Select
                                  value={gradingForm.recommendation}
                                  onChange={e =>
                                    setGradingForm({ ...gradingForm, recommendation: e.target.value })
                                  }
                                  className="px-2.5 py-1 border border-[#E4E6EA] rounded text-xs bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                                >
                                  <option value="Strong Hire">Strong Hire</option>
                                  <option value="Hire">Standard Hire</option>
                                  <option value="Hold">Hold</option>
                                  <option value="Reject">Reject</option>
                                  <option value="Re-Interview Required">Re-Interview Required</option>
                                </Select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onGradingSubmitted(
                                      idx.id,
                                      gradingForm.recommendation,
                                      gradingForm.comments,
                                      gradingForm.overallScore,
                                    );
                                    toast.success('Evaluation recorded — status updated.');
                                  }}
                                  className="bg-accent-600 hover:bg-accent-700 text-white font-medium rounded py-1 cursor-pointer text-[11px] transition"
                                >
                                  Submit Grading
                                </button>
                              </div>
                              <input
                                type="text"
                                value={gradingForm.comments}
                                onChange={e => setGradingForm({ ...gradingForm, comments: e.target.value })}
                                placeholder="Candidate detailed grading feedback comments..."
                                className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#FFFFFF]"
                              />
                            </div>
                          )
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* IQ Tests and Assignments Results row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IQ Test Panel */}
                <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Award size={13} className="text-accent-600" /> Custom IQ Test Outcome
                  </h3>
                  {candidateIq ? (
                    <div className="text-xs space-y-2">
                      <div className="flex justify-between py-1 bg-[#F7F8FA] px-2 rounded font-mono text-[10px]">
                        <span>Test Result:</span>
                        <span className="font-bold text-green-600">{candidateIq.qualificationStatus}</span>
                      </div>
                      <div className="space-y-1 text-gray-600">
                        <div className="flex justify-between">
                          <span>Acu-Score:</span>
                          <span className="font-bold text-gray-850">{candidateIq.scorePercentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Questions Attempted:</span>
                          <span className="font-mono">
                            {candidateIq.questionsAttempted} / {candidateIq.totalQuestions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Elapsed Time:</span>
                          <span>{candidateIq.timeTakenMinutes} mins</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 italic">Notes: {candidateIq.remarks}</p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      IQ Test assessment has not been triggered or received yet.
                    </div>
                  )}
                </div>

                {/* Submissions Section */}
                <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono flex items-center gap-1">
                    <BookOpen size={13} className="text-purple-600" /> Trial Code Assignments
                  </h3>
                  {candidateAssignmentsSubmissions.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      No active submissions logged on this repository.
                    </div>
                  ) : (
                    candidateAssignmentsSubmissions.map(sub => (
                      <div key={sub.id} className="text-xs space-y-2">
                        <div className="flex justify-between font-mono text-[10px] bg-[#F7F8FA] p-1.5 rounded">
                          <span className="truncate max-w-[120px]">{sub.assignmentTitle}</span>
                          <span className="font-bold text-green-650">{sub.status}</span>
                        </div>
                        {sub.grading ? (
                          <div className="space-y-1 text-gray-650">
                            <div className="flex justify-between font-semibold">
                              <span>Overall Quality Score:</span>
                              <span className="text-purple-600">{sub.grading.overallScore} / 100</span>
                            </div>
                            <p className="text-[10px] bg-[#EDEEF1] p-1 rounded italic mt-1 font-sans">
                              "{sub.grading.evaluatorComments}"
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500 block italic">
                            Evaluation is currently under review by product lead.
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bgv' && (
            <div className="flex-1 p-6 space-y-5 overflow-y-auto">
              {/* BGV Status Overview */}
              {bgv ? (
                <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-5">
                  <div className="flex justify-between items-center border-b border-[#ECEDF0] pb-2.5">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
                        Background Verification (BGV Queue)
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        Strict regulatory audit and identity authentication portal.
                      </p>
                    </div>
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full font-bold">
                      {bgv.overallStatus}
                    </span>
                  </div>

                  {/* Documents table list details */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-12 text-[10px] font-mono text-gray-500 border-b border-[#E4E6EA] pb-1 font-bold uppercase">
                      <span className="col-span-5">Document Class</span>
                      <span className="col-span-3 text-center">Status</span>
                      <span className="col-span-4 text-right">Moderator Control</span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {bgv.documents.map((doc, k) => (
                        <div
                          key={k}
                          className="grid grid-cols-12 items-center text-xs py-1.5 border-b border-[#EDEEF1] last:border-none"
                        >
                          <div className="col-span-5 flex items-center gap-1.5 truncate">
                            <FileText size={12} className="text-gray-500" />
                            <span className="font-semibold text-gray-800 truncate">{doc.type}</span>
                          </div>

                          <div className="col-span-3 text-center">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                                doc.status === 'Verified'
                                  ? 'bg-green-50 text-green-600'
                                  : doc.status === 'Pending'
                                    ? 'bg-gray-105 text-gray-500 bg-[#EDEEF1]'
                                    : doc.status === 'Rejected'
                                      ? 'bg-red-50 text-red-600'
                                      : 'bg-yellow-50 text-yellow-600'
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>

                          <div className="col-span-4 flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleUpdateDocStatus(doc.type, 'Verified')}
                              className="text-[9px] bg-green-50 text-green-600 hover:bg-green-100 px-1.5 py-0.5 rounded-sm font-semibold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateDocStatus(doc.type, 'Rejected')}
                              className="text-[9px] bg-red-50 text-red-600 hover:bg-red-100 px-1.5 py-0.5 rounded-sm font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments Box */}
                  <div className="space-y-1 text-xs">
                    <label className="font-semibold text-gray-700">Add BGV remark / rejection reason:</label>
                    <textarea
                      placeholder="Comment which document needs resubmission or why audit cleared..."
                      value={bgvDocComment}
                      onChange={e => setBgvDocComment(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 border border-[#E4E6EA] rounded text-xs bg-[#EDEEF1]"
                    />
                  </div>

                  {/* Verification History Log */}
                  <div className="space-y-2 pt-3 border-t border-[#ECEDF0]">
                    <h4 className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider">
                      BGV Compliance Timeline
                    </h4>
                    <div className="space-y-2 text-[10px] text-gray-500 font-mono max-h-[100px] overflow-y-auto">
                      {bgv.verificationTimeline.map((log, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-gray-500 shrink-0">{log.date}</span>
                          <span className="text-gray-500 shrink-0">|</span>
                          <p className="text-gray-700 font-sans">
                            {log.action}{' '}
                            <span className="font-mono text-[9px] text-gray-500">({log.performedBy})</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : interviewCleared ? (
                <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 text-center text-gray-500 text-xs py-10">
                  <CheckCircle className="mx-auto text-emerald-500 mb-2" size={24} />
                  <p className="font-semibold text-gray-700">
                    Interview cleared — {candidate.fullName} is eligible for background
                    verification.
                  </p>
                  <p className="text-[11px] mt-1 text-gray-500">
                    Starting BGV generates the required document checklist.
                  </p>
                  {onStartBGV && (
                    <button
                      onClick={() => {
                        onStartBGV();
                        toast.success(`BGV initiated for ${candidate.fullName} — checklist created.`);
                      }}
                      className="mt-4 bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg font-semibold text-xs cursor-pointer transition inline-flex items-center gap-1.5"
                    >
                      <CheckCircle size={13} /> Start BGV Verification
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 text-center text-gray-500 text-xs py-10">
                  <AlertTriangle className="mx-auto text-amber-500 mb-2" size={24} />
                  <p className="font-semibold text-gray-600">
                    BGV is locked until the candidate clears the interview.
                  </p>
                  <p className="text-[11px] mt-1 text-gray-500 max-w-sm mx-auto">
                    Background verification can be started by HR only after an interview for{' '}
                    {candidate.fullName} has been graded{' '}
                    <span className="font-semibold">Hire</span> or{' '}
                    <span className="font-semibold">Strong Hire</span> in the Assessments &amp;
                    Grading tab.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed per-question test analysis */}
        {testReport && (
          <TestReportModal invite={testReport} onClose={() => setTestReport(null)} />
        )}
      </div>
    </div>
  );
}
export default CandidateProfileModal;
