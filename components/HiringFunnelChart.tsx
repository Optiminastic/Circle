'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarDays, AlertCircle, FileText, CheckCircle2, Award, ArrowUpRight } from 'lucide-react';
import { Candidate, Interview } from '../types';

interface HiringFunnelChartProps {
  candidates: Candidate[];
  interviews: Interview[];
  onSelectCandidate?: (id: string) => void;
}

export function HiringFunnelChart({ candidates, interviews, onSelectCandidate }: HiringFunnelChartProps) {
  // Aggregate candidate stages
  const stageCounts = {
    new: candidates.filter(c => c.status === 'New Application').length,
    review: candidates.filter(c => c.status === 'Under Review').length,
    shortlisted: candidates.filter(c => c.status === 'Shortlisted').length,
    hrCall: candidates.filter(c => c.status === 'Moved to HR Call').length,
    interviews: interviews.filter(i => i.status === 'Scheduled').length,
    selected: candidates.filter(
      c => c.status === 'Shortlisted' && c.hrCall?.nextStep === 'Proceed to Interview',
    ).length,
  };

  const funnelStages = [
    { label: 'Applications Recieved', count: candidates.length, pct: 100, color: 'bg-accent-600' },
    {
      label: 'Shortlisted for Assessment',
      count: stageCounts.shortlisted + stageCounts.hrCall,
      pct: Math.round(((stageCounts.shortlisted + stageCounts.hrCall) / (candidates.length || 1)) * 100),
      color: 'bg-purple-600',
    },
    {
      label: 'HR Screening Calls',
      count: stageCounts.hrCall,
      pct: Math.round((stageCounts.hrCall / (candidates.length || 1)) * 100),
      color: 'bg-teal-600',
    },
    {
      label: 'Active Interviews Scheduled',
      count: stageCounts.interviews,
      pct: Math.round((stageCounts.interviews / (candidates.length || 1)) * 100),
      color: 'bg-amber-600',
    },
  ];

  // Recharts interactive mock data representing monthly HR yield
  const lineChartData = [
    { name: 'Jan', Candidates: 30, Selected: 2, Interviews: 10 },
    { name: 'Feb', Candidates: 45, Selected: 3, Interviews: 18 },
    { name: 'Mar', Candidates: 58, Selected: 5, Interviews: 25 },
    { name: 'Apr', Candidates: 65, Selected: 4, Interviews: 22 },
    { name: 'May', Candidates: 82, Selected: 7, Interviews: 35 },
    { name: 'Jun', Candidates: candidates.length + 15, Selected: 8, Interviews: interviews.length + 5 },
  ];

  const pendingTasks = [
    {
      id: 1,
      title: 'Input HR introductory call remarks for Clara Dupont',
      category: 'HR Call',
      severity: 'High',
    },
    {
      id: 2,
      title: 'Verify previous payroll documents uploaded by Sophia Henderson',
      category: 'BGV',
      severity: 'Medium',
    },
    {
      id: 3,
      title: 'Deactivate AWS system credentials for exit case David Hassel',
      category: 'Offboarding',
      severity: 'Critical',
    },
    {
      id: 4,
      title: 'Grade live assessment submission for React developer trial',
      category: 'Role Assignment',
      severity: 'Medium',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visual Funnel Stack (Left 2 cols) */}
      <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 tracking-tight font-display">
            Hiring Yield & conversion Funnel
          </h4>
          <p className="text-xs text-gray-400">
            Yield conversion statistics from pipeline inception to finalized placement.
          </p>
        </div>

        {/* Dynamic Funnel Progress bars */}
        <div className="space-y-3 pt-2">
          {funnelStages.map((stage, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between items-center text-xs text-gray-700">
                <span className="font-semibold">{stage.label}</span>
                <span className="text-gray-500 font-mono">
                  {stage.count} {stage.count === 1 ? 'candidate' : 'candidates'} ({stage.pct}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.max(5, stage.pct)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Area Trend Chart */}
        <div className="pt-4 border-t border-[#E1D6BC]/60 h-48 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891B2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0891B2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9AA0A6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#9AA0A6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '6px', border: '1px solid #E1D6BC' }}
              />
              <Area
                type="monotone"
                dataKey="Candidates"
                stroke="#0891B2"
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
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actionable ToDos (Right 1 col) */}
      <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 tracking-tight font-display">
              Attention Triggers
            </h4>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
              {pendingTasks.length} Pending
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Strict dependency blocks that need clearance regarding candidates and exits:
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-[220px]">
            {pendingTasks.map(t => (
              <div
                key={t.id}
                className="p-2.5 border border-[#E1D6BC] rounded-lg hover:bg-gray-55 hover:border-gray-350 transition duration-150 text-xs flex gap-2 w-full"
              >
                <AlertCircle
                  size={14}
                  className={`shrink-0 mt-0.5 ${t.severity === 'Critical' ? 'text-red-500' : 'text-amber-500'}`}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 leading-normal">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px]">
                    <span className="text-gray-400">Context: {t.category}</span>
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
        <div className="pt-3 border-t border-[#E1D6BC] mt-4 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-green-500" /> BGV Automated Sync Active
          </span>
          <ArrowUpRight size={12} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
export default HiringFunnelChart;
