'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertCircle,
  FileText,
  CheckCircle2,
  ArrowUpRight,
  ClipboardCheck,
  Phone,
  CalendarClock,
  TrendingDown,
} from 'lucide-react';
import { Candidate, Interview } from '../types';

interface HiringFunnelChartProps {
  candidates: Candidate[];
  interviews: Interview[];
  onSelectCandidate?: (id: string) => void;
}

export function HiringFunnelChart({ candidates, interviews, onSelectCandidate }: HiringFunnelChartProps) {
  // Cumulative funnel: each stage counts the DISTINCT candidates who reached it
  // OR moved beyond it. Status is a single current value, so we also infer
  // progress from HR-call records, interview records, and terminal outcomes —
  // otherwise a candidate who advanced would wrongly drop out of earlier stages.
  const interviewedIds = new Set(
    interviews
      .filter(i => i.status === 'Scheduled' || i.status === 'Completed')
      .map(i => i.candidateId),
  );
  const isEngaged = (c: Candidate) =>
    c.status !== 'New Application' && c.status !== 'Duplicate Profile';
  const reachedHrCall = (c: Candidate) =>
    Boolean(c.hrCall) ||
    interviewedIds.has(c.id) ||
    ['Moved to HR Call', 'Offer Shortlisted', 'Selected'].includes(c.status);
  const reachedInterview = (c: Candidate) =>
    interviewedIds.has(c.id) || ['Offer Shortlisted', 'Selected'].includes(c.status);
  const isSelected = (c: Candidate) => c.status === 'Selected';

  const total = candidates.length;
  const rawStages = [
    {
      label: 'Applications received',
      count: total,
      Icon: FileText,
      bar: 'from-accent-500 to-accent-700',
      track: 'bg-accent-50',
    },
    {
      label: 'Under review / shortlisted',
      count: candidates.filter(isEngaged).length,
      Icon: ClipboardCheck,
      bar: 'from-purple-500 to-purple-700',
      track: 'bg-purple-50',
    },
    {
      label: 'HR screening calls',
      count: candidates.filter(reachedHrCall).length,
      Icon: Phone,
      bar: 'from-teal-500 to-teal-700',
      track: 'bg-teal-50',
    },
    {
      label: 'Interviewed',
      count: candidates.filter(reachedInterview).length,
      Icon: CalendarClock,
      bar: 'from-amber-500 to-amber-600',
      track: 'bg-amber-50',
    },
    {
      label: 'Selected',
      count: candidates.filter(isSelected).length,
      Icon: CheckCircle2,
      bar: 'from-emerald-500 to-emerald-700',
      track: 'bg-emerald-50',
    },
  ];

  // Clamp each stage so it never exceeds the one above it (a true funnel) and
  // derive both the overall yield and the step-to-step conversion.
  let prev = total;
  const funnelStages = rawStages.map((s, i) => {
    const count = i === 0 ? s.count : Math.min(s.count, prev);
    const pct = total ? Math.round((count / total) * 100) : 0;
    const stepPct = i === 0 ? 100 : prev ? Math.round((count / prev) * 100) : 0;
    prev = count;
    return { ...s, count, pct, stepPct };
  });

  // Real monthly yield — candidates by applied month, interviews by scheduled month.
  const monthKey = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}`;
  };
  const now = new Date();
  const lineChartData = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return {
      name: d.toLocaleString('en-US', { month: 'short' }),
      Candidates: candidates.filter(c => monthKey(c.appliedDate) === key).length,
      Interviews: interviews.filter(iv => monthKey(iv.dateTime) === key).length,
      Selected: candidates.filter(
        c => monthKey(c.appliedDate) === key && c.status === 'Selected',
      ).length,
    };
  });

  // Real action items derived from the live pipeline (no placeholder tasks).
  const pendingTasks = [
    ...candidates
      .filter(c => c.status === 'Moved to HR Call' && !c.hrCall?.completed)
      .slice(0, 4)
      .map(c => ({
        id: `hr-${c.id}`,
        title: `Log HR introductory call remarks for ${c.fullName}`,
        category: 'HR Call',
        severity: 'High',
      })),
    ...interviews
      .filter(i => i.status === 'Scheduled')
      .slice(0, 4)
      .map(i => ({
        id: `iv-${i.id}`,
        title: `Grade interview for ${i.candidateName}`,
        category: 'Interview',
        severity: 'Medium',
      })),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visual Funnel Stack (Left 2 cols) */}
      <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 tracking-tight font-display">
              Hiring yield &amp; conversion funnel
            </h4>
            <p className="text-xs text-gray-500">
              How candidates convert from application through to interview.
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold leading-none text-gray-900">
              {funnelStages[funnelStages.length - 1].pct}%
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Overall yield
            </p>
          </div>
        </div>

        {/* Funnel — each stage is a subset of the one above it */}
        <div className="space-y-3.5 pt-1">
          {funnelStages.map((stage, i) => {
            const StageIcon = stage.Icon;
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-gray-800">
                    <span className={`grid size-6 shrink-0 place-items-center rounded-md ${stage.track}`}>
                      <StageIcon size={13} className="text-gray-600" />
                    </span>
                    {stage.label}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-semibold text-gray-900">{stage.count}</span>
                    <span className="font-mono text-gray-500">{stage.pct}%</span>
                    {i > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F1F3F5] px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                        <TrendingDown size={9} />
                        {stage.stepPct}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EDEEF1]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stage.bar} transition-all duration-500`}
                    style={{ width: `${Math.max(stage.count > 0 ? 4 : 0, stage.pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Area Trend Chart */}
        <div className="pt-4 border-t border-[#E4E6EA]/60 h-48 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D11453" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#D11453" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9AA0A6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#9AA0A6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSelected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '6px', border: '1px solid #E4E6EA' }}
              />
              <Area
                type="monotone"
                dataKey="Candidates"
                stroke="#D11453"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCandidates)"
              />
              <Area
                type="monotone"
                dataKey="Interviews"
                stroke="#9AA0A6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInterviews)"
              />
              <Area
                type="monotone"
                dataKey="Selected"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSelected)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actionable ToDos (Right 1 col) */}
      <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 tracking-tight font-display">
              Attention Triggers
            </h4>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
              {pendingTasks.length} Pending
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Strict dependency blocks that need clearance regarding candidates and exits:
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-[220px]">
            {pendingTasks.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-green-500" />
                <p className="text-[11px]">No pending action items.</p>
              </div>
            )}
            {pendingTasks.map(t => (
              <div
                key={t.id}
                className="p-2.5 border border-[#E4E6EA] rounded-lg hover:bg-gray-55 hover:border-gray-350 transition duration-150 text-xs flex gap-2 w-full"
              >
                <AlertCircle
                  size={14}
                  className={`shrink-0 mt-0.5 ${t.severity === 'Critical' ? 'text-red-500' : 'text-amber-500'}`}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 leading-normal">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px]">
                    <span className="text-gray-500">Context: {t.category}</span>
                    <span>•</span>
                    <span
                      className={`font-semibold ${t.severity === 'Critical' ? 'text-red-600' : 'text-amber-600'}`}
                    >
                      {t.severity} Priority
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom audit pointer */}
        <div className="pt-3 border-t border-[#E4E6EA] mt-4 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-green-500" /> BGV Automated Sync Active
          </span>
          <ArrowUpRight size={12} className="text-gray-500" />
        </div>
      </div>
    </div>
  );
}
export default HiringFunnelChart;
