'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Briefcase, Users, UserCheck, UserX, ArrowUpRight } from 'lucide-react';

interface KPICardsProps {
  openPositionsCount: number;
  activeCandidatesCount: number;
  employeesCount: number;
  offboardingCount: number;
  onCardClick?: (metric: string) => void;
  activeMetric?: string;
}

export function KPICards({
  openPositionsCount,
  activeCandidatesCount,
  employeesCount,
  offboardingCount,
  onCardClick,
  activeMetric,
}: KPICardsProps) {
  const kpis = [
    {
      id: 'open-positions',
      title: 'Open Positions',
      value: openPositionsCount,
      change: '+3 new this week',
      icon: <Briefcase size={16} className="text-accent-600" />,
      bg: 'bg-accent-50/50',
      border: 'border-accent-100',
    },
    {
      id: 'active-candidates',
      title: 'Active Candidates',
      value: activeCandidatesCount,
      change: '+12 evaluating',
      icon: <Users size={16} className="text-yellow-600" />,
      bg: 'bg-yellow-50/50',
      border: 'border-yellow-100',
    },
    {
      id: 'employees',
      title: 'Active Employees',
      value: employeesCount,
      change: '1 joining soon',
      icon: <UserCheck size={16} className="text-green-600" />,
      bg: 'bg-green-50/50',
      border: 'border-green-100',
    },
    {
      id: 'offboarding',
      title: 'Offboarding Cases',
      value: offboardingCount,
      change: '2 cases active',
      icon: <UserX size={16} className="text-red-600" />,
      bg: 'bg-red-50/50',
      border: 'border-red-100',
    },
  ];

  return (
    <div id="kpi-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(k => {
        const isSelected = activeMetric === k.id;
        return (
          <div
            key={k.id}
            onClick={() => onCardClick?.(k.id)}
            className={`bg-[#FFFFFF] border border-[#E1D6BC] p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs group ${
              isSelected ? 'ring-1 ring-accent-600 border-accent-200 shadow-xs' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-display">
                {k.title}
              </span>
              <div
                className={`w-8 h-8 rounded-lg ${k.bg} border ${k.border} flex items-center justify-center shrink-0`}
              >
                {k.icon}
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-gray-900 tracking-tight font-display">
                  {k.value}
                </span>
                <p className="text-[10px] text-gray-400 mt-1 font-mono font-medium">{k.change}</p>
              </div>
              <ArrowUpRight
                size={12}
                className="text-gray-300 group-hover:text-gray-600 transition duration-150 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default KPICards;
