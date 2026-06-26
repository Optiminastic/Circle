'use client';

import React from 'react';
import { Briefcase, Clock4, Wallet, MapPin, MessageSquare, Phone, Star, Mail } from 'lucide-react';
import { InterviewGrading, OnboardingChecklist } from '@/types';
import { OnboardingStepper } from './OnboardingStepper';
import { DocRequestPanel } from './DocRequestPanel';
import { CandidateHandoffCard } from './CandidateHandoffCard';
import { useToast } from './Toaster';
import { useCandidates } from '@/features/candidates/hooks';
import { useInterviews } from '@/features/interviews/hooks';
import { effectiveFit, fitStyle } from '@/lib/screening';

interface OnboardingDetailProps {
  checklist: OnboardingChecklist;
  onAddEmployeeTrigger: (checklist: OnboardingChecklist) => void;
}

const recTone = (r: InterviewGrading['recommendation']) =>
  r === 'Strong Hire' || r === 'Hire'
    ? 'bg-emerald-50 text-emerald-700'
    : r === 'Reject'
      ? 'bg-red-50 text-red-600'
      : 'bg-amber-50 text-amber-700';

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-gray-700">
      <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** Full onboarding workspace for one candidate — snapshot + journey. */
export function OnboardingDetail({ checklist, onAddEmployeeTrigger }: OnboardingDetailProps) {
  const toast = useToast();
  const { data: candidates = [] } = useCandidates();
  const { data: interviews = [] } = useInterviews();

  const candidate = candidates.find(c => c.id === checklist.candidateId);
  const fit = candidate ? effectiveFit(candidate) : undefined;
  // Email captured on the onboarding record is the reliable fallback.
  const email = candidate?.email || checklist.candidateEmail || '';

  // Latest graded interview = the most recent feedback we have on file.
  const lastGraded = interviews
    .filter(i => i.candidateId === checklist.candidateId && i.grading)
    .sort(
      (a, b) =>
        new Date(b.grading!.gradedAt || b.dateTime).getTime() -
        new Date(a.grading!.gradedAt || a.dateTime).getTime(),
    )[0];
  const hr = candidate?.hrCall;

  return (
    <div className="grid grid-cols-1 gap-5 text-xs lg:grid-cols-12 lg:items-start">
      {/* Candidate snapshot */}
      <div className="space-y-4 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 lg:col-span-3">
        <div className="space-y-1">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Candidate Snapshot
          </span>
          <h3 className="truncate font-display text-base font-bold text-gray-900">
            {candidate?.fullName || checklist.candidateName}
          </h3>
          <p className="font-mono text-[11px] font-semibold text-accent-600">
            {checklist.onboardingStatus}
          </p>
        </div>

        {/* Quick facts */}
        <div className="space-y-2 rounded-lg bg-[#F7F8FA] p-3">
          {email && (
            <Row icon={<Mail size={12} />}>
              <a href={`mailto:${email}`} className="break-all hover:text-accent-600">
                {email}
              </a>
            </Row>
          )}
          {candidate?.phone && (
            <Row icon={<Phone size={12} />}>
              <a href={`tel:${candidate.phone}`} className="hover:text-accent-600">
                {candidate.phone}
              </a>
            </Row>
          )}
          <Row icon={<Briefcase size={12} />}>
            {candidate?.appliedRole ?? '—'} · {candidate?.department ?? '—'}
          </Row>
          {candidate?.location && <Row icon={<MapPin size={12} />}>{candidate.location}</Row>}
          <Row icon={<Clock4 size={12} />}>
            {candidate?.totalExperienceYears ?? 0} yrs exp · {candidate?.noticePeriodDays ?? 0}d notice
          </Row>
          <Row icon={<Wallet size={12} />}>
            Current {candidate?.currentCtc || '—'} → Expected {candidate?.expectedCtc || '—'}
          </Row>
          {fit && (
            <div className="pt-0.5">
              <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${fitStyle(fit)}`}>
                {fit}
              </span>
            </div>
          )}
        </div>

        {/* Interview outcome */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <MessageSquare size={11} /> Interview outcome
          </p>
          {lastGraded?.grading ? (
            <div className="space-y-1.5 rounded-lg border border-[#ECEDF0] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-semibold text-gray-800">
                  {lastGraded.interviewRound}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${recTone(lastGraded.grading.recommendation)}`}
                >
                  {lastGraded.grading.recommendation}
                </span>
              </div>
              <p className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
                <Star size={10} className="text-amber-500" />
                Overall {lastGraded.grading.grades.overallSuitability}/5 · by{' '}
                {lastGraded.interviewerName || 'panel'}
              </p>
              {lastGraded.grading.interviewerComments && (
                <p className="text-[11px] italic leading-relaxed text-gray-600">
                  “{lastGraded.grading.interviewerComments}”
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-[#F7F8FA] p-3 text-[11px] text-gray-500">
              No interview feedback recorded yet.
            </p>
          )}
        </div>

        {/* HR call note */}
        {hr?.completed && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <Phone size={11} /> HR call
            </p>
            <div className="rounded-lg border border-[#ECEDF0] p-3">
              {hr.hrRecommendation && (
                <p className="text-[11px] font-semibold text-gray-800">{hr.hrRecommendation}</p>
              )}
              {hr.culturalFitRemarks && (
                <p className="mt-1 text-[11px] italic leading-relaxed text-gray-600">
                  “{hr.culturalFitRemarks}”
                </p>
              )}
              {!hr.hrRecommendation && !hr.culturalFitRemarks && (
                <p className="text-[11px] text-gray-500">Call completed — no notes recorded.</p>
              )}
            </div>
          </div>
        )}

        {/* Conclude onboarding */}
        {checklist.progressPercentage === 100 ? (
          <button
            onClick={() => {
              onAddEmployeeTrigger(checklist);
              toast.success(`${checklist.candidateName} onboarded into the employee directory.`);
            }}
            className="w-full cursor-pointer rounded-lg bg-accent-600 py-2 text-center font-semibold text-white transition hover:bg-accent-700"
          >
            Conclude Onboarding (EMP-ID)
          </button>
        ) : (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-[#EDEEF1] py-2 text-center font-mono text-[10px] font-medium text-gray-500"
          >
            Clear all tasks to active EMP conversion
          </button>
        )}
      </div>

      {/* Journey */}
      <div className="lg:col-span-6">
        <OnboardingStepper checklist={checklist} />
      </div>

      {/* Documents shared + verification checklist */}
      <div className="lg:col-span-3 space-y-4">
        <DocRequestPanel
          candidateId={checklist.candidateId}
          candidateName={checklist.candidateName}
          email={email}
        />
        <CandidateHandoffCard
          candidateId={checklist.candidateId}
          candidateName={checklist.candidateName}
        />
      </div>
    </div>
  );
}

export default OnboardingDetail;
