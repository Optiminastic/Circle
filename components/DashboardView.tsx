'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { KPICards } from './KPICards';
import { KanbanPipeline } from './KanbanPipeline';
import { HiringFunnelChart } from './HiringFunnelChart';
import { Candidate, Interview, IQTest, Assignment } from '../types';
import { Calendar, UserPlus, FileCheck, ArrowRight, UserCheck } from 'lucide-react';

interface DashboardViewProps {
  candidates: Candidate[];
  interviews: Interview[];
  iqTests: IQTest[];
  assignments: Assignment[];
  onSelectCandidate: (id: string) => void;
  onMoveCandidate: (id: string, stage: any) => void;
}

export function DashboardView({
  candidates,
  interviews,
  iqTests,
  assignments,
  onSelectCandidate,
  onMoveCandidate,
}: DashboardViewProps) {
  // Stats derivations
  const openPositionsCount = 8;
  const activeCandidatesCount = candidates.filter(
    c => c.status !== 'Rejected' && c.status !== 'Duplicate Profile',
  ).length;
  const employeesCount = 24; // starting database count
  const offboardingCount = 1; // David Hassel

  // Filter upcoming scheduled interviews
  const upcomingInterviews = interviews.filter(i => i.status === 'Scheduled').slice(0, 3);

  // New arrivals / onboarding candidates
  const onboardingArrivals = candidates
    .filter(c => c.status === 'Shortlisted' || c.status === 'Moved to HR Call')
    .slice(0, 2);

  return (
    <div className="space-y-6 select-none pb-10">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-display">
            Executive HR Workspace
          </h2>
          <p className="text-gray-400 text-xs">
            Lifecycle monitoring of evaluations, credential security key dispatches, and clearances.
          </p>
        </div>
        <div className="text-right text-[11px] text-gray-500 font-mono">
          Last sync: <span className="font-semibold text-gray-900">Today, 07:21 UTC</span>
        </div>
      </div>

      {/* 1st row: 4 KPI Cards */}
      <KPICards
        openPositionsCount={openPositionsCount}
        activeCandidatesCount={activeCandidatesCount}
        employeesCount={employeesCount}
        offboardingCount={offboardingCount}
      />

      {/* 2nd row: Candidate Pipeline Board (Kanban Segment) */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl space-y-4">
        <KanbanPipeline
          candidates={candidates}
          onMoveCandidate={onMoveCandidate}
          onSelectCandidate={onSelectCandidate}
        />
      </div>

      {/* 3rd row: Conversion Metrics Charts block & action queues */}
      <HiringFunnelChart
        candidates={candidates}
        interviews={interviews}
        onSelectCandidate={onSelectCandidate}
      />

      {/* 4th row: Upcoming sessions & Recent recruits arrivals list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interviews scheduled timeline */}
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#EAE1CC] pb-2">
            <h4 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-wider">
              Upcoming Panel Interviews ({upcomingInterviews.length})
            </h4>
            <span className="text-[10px] text-accent-600 font-semibold font-mono">See Calendar</span>
          </div>

          <div className="space-y-3">
            {upcomingInterviews.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No interviews scheduled today.</p>
            ) : (
              upcomingInterviews.map(i => (
                <div
                  key={i.id}
                  className="p-3 border border-[#E1D6BC] rounded-lg bg-[#EAE1CC]/50 flex justify-between items-center hover:border-accent-300 transition duration-150"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-gray-900 text-xs">{i.candidateName}</span>
                    <p className="text-[11px] text-gray-500">
                      {i.appliedRole} • {i.interviewRound}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(i.dateTime).toLocaleDateString()}{' '}
                      {new Date(i.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectCandidate(i.candidateId)}
                    className="text-[10px] bg-[#FFFFFF] border border-[#E1D6BC] hover:border-accent-400 hover:text-accent-600 text-gray-600 px-2.5 py-1 rounded-md font-semibold font-mono transition shrink-0 cursor-pointer"
                  >
                    Assess
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Onboarding pipeline alerts */}
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#EAE1CC] pb-2">
            <h4 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-wider">
              Arrivals Expected This Month ({onboardingArrivals.length})
            </h4>
            <span className="text-[10px] text-accent-600 font-semibold font-mono">View All</span>
          </div>

          <div className="space-y-3">
            {onboardingArrivals.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                No expected candidates matching joining criteria during this window.
              </p>
            ) : (
              onboardingArrivals.map(oa => (
                <div
                  key={oa.id}
                  className="p-3 border border-[#E1D6BC] rounded-lg bg-[#EAE1CC]/50 flex justify-between items-center hover:border-accent-300 transition duration-150"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-gray-900 text-xs">{oa.fullName}</span>
                    <p className="text-[11px] text-gray-500">
                      {oa.appliedRole} ({oa.department})
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] bg-accent-50 text-accent-600 px-1.5 py-0.5 rounded font-mono font-bold">
                        Notice: {oa.noticePeriodDays} Days
                      </span>
                      <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-mono font-bold">
                        {oa.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCandidate(oa.id)}
                    className="text-[10px] bg-[#FFFFFF] border border-[#E1D6BC] text-gray-600 px-2.5 py-1.5 rounded-lg flex items-center gap-1 hover:border-accent-400 transition font-semibold cursor-pointer"
                  >
                    Check list <ArrowRight size={10} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default DashboardView;
