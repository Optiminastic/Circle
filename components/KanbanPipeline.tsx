'use client';
import { Select } from './Select';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Candidate, CandidateStatus } from '../types';
import { User, ShieldAlert, ArrowLeftRight, Calendar, Bookmark, Briefcase, FileText } from 'lucide-react';

interface KanbanPipelineProps {
  candidates: Candidate[];
  onMoveCandidate: (candidateId: string, targetStatus: CandidateStatus) => void;
  onSelectCandidate: (candidateId: string) => void;
}

export function KanbanPipeline({ candidates, onMoveCandidate, onSelectCandidate }: KanbanPipelineProps) {
  // Map our CandidateStatus to Kanban stages
  const STAGES: { key: CandidateStatus; label: string; countColor: string; bg: string }[] = [
    {
      key: 'New Application',
      label: 'New',
      countColor: 'text-accent-600 bg-accent-50',
      bg: 'bg-[#EAE1CC]/50',
    },
    {
      key: 'Under Review',
      label: 'Review',
      countColor: 'text-purple-600 bg-purple-50',
      bg: 'bg-[#EAE1CC]/50',
    },
    {
      key: 'Shortlisted',
      label: 'Shortlisted',
      countColor: 'text-purple-600 bg-purple-50',
      bg: 'bg-[#EAE1CC]/50',
    },
    {
      key: 'Moved to HR Call',
      label: 'HR Call',
      countColor: 'text-teal-600 bg-teal-50',
      bg: 'bg-teal-50/10',
    },
    { key: 'Rejected', label: 'Rejected', countColor: 'text-red-600 bg-red-50', bg: 'bg-red-50/10' },
    { key: 'On Hold', label: 'On Hold', countColor: 'text-yellow-600 bg-yellow-50', bg: 'bg-yellow-50/10' },
  ];

  const getCandidatesByStatus = (status: CandidateStatus) => {
    return candidates.filter(c => c.status === status);
  };

  return (
    <div className="space-y-3 select-none">
      {/* Kanban Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
            Recruitment Pipeline (Live Kanban)
          </h3>
          <p className="text-xs text-gray-400">
            Click a card to view profile or use quick actions to move stages instantly.
          </p>
        </div>
      </div>

      {/* Kanban Horizontal Board */}
      <div
        id="recruitment-kanban"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto pb-4"
      >
        {STAGES.map(stage => {
          const list = getCandidatesByStatus(stage.key);
          return (
            <div
              key={stage.key}
              className={`border border-[#E1D6BC] rounded-xl p-3 flex flex-col min-h-[300px] ${stage.bg}`}
            >
              {/* Column Stats Header */}
              <div className="flex items-center justify-between mb-3 border-b border-[#E1D6BC]/60 pb-2">
                <span className="text-xs font-semibold text-gray-800">{stage.label}</span>
                <span
                  className={`text-[10px] size-5 rounded-full flex items-center justify-center font-bold font-mono ${stage.countColor}`}
                >
                  {list.length}
                </span>
              </div>

              {/* Candidates stacked in column */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[400px] pr-0.5">
                {list.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#E1D6BC] rounded-lg text-[10px] text-gray-400 bg-[#FFFFFF]">
                    Drop candidates here
                  </div>
                ) : (
                  list.map(c => (
                    <div
                      key={c.id}
                      className="bg-[#FFFFFF] border border-[#E1D6BC] p-3 rounded-lg shadow-2xs hover:border-accent-400 hover:shadow-xs transition duration-200 cursor-pointer group flex flex-col justify-between"
                    >
                      <div onClick={() => onSelectCandidate(c.id)}>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-gray-900 group-hover:text-accent-600 transition truncate">
                            {c.fullName}
                          </span>
                        </div>

                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 font-mono truncate">
                          <Briefcase size={10} className="shrink-0" />
                          <span>{c.appliedRole}</span>
                        </div>

                        <div className="mt-2 text-[10px] text-gray-500 font-mono flex items-center gap-1">
                          <Bookmark size={10} className="shrink-0 text-gray-400" />
                          <span>Exp: {c.totalExperienceYears} yrs</span>
                        </div>
                      </div>

                      {/* Manual Quick Move Trigger Selector to simplify UX */}
                      <div className="mt-3 pt-2.5 border-t border-[#E1D6BC]/40 flex items-center gap-1.5 justify-between">
                        <span className="text-[9px] font-mono text-gray-400 font-medium">Quick stage:</span>
                        <Select
                          id={`quick-status-move-${c.id}`}
                          value={c.status}
                          onChange={e => onMoveCandidate(c.id, e.target.value as CandidateStatus)}
                          className="text-[9px] bg-[#EAE1CC] border border-[#E1D6BC] rounded px-1.5 py-0.5 font-medium text-gray-600 focus:outline-none focus:ring-1 focus:ring-accent-600 cursor-pointer"
                        >
                          <option value="New Application">New</option>
                          <option value="Under Review">Review</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Moved to HR Call">HR Call</option>
                          <option value="Rejected">Rejected</option>
                          <option value="On Hold">On Hold</option>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default KanbanPipeline;
