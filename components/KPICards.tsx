'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Briefcase, Users, UserCheck, UserX, ArrowUpRight } from 'lucide-react';
import { CountUp } from '@/components/ui/count-up';

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
      icon: <Briefcase size={16} className="text-accent-600" />,
      bg: 'bg-accent-50/50',
      border: 'border-accent-100',
    },
    {
      id: 'active-candidates',
      title: 'Active Candidates',
      value: activeCandidatesCount,
      icon: <Users size={16} className="text-yellow-600" />,
      bg: 'bg-yellow-50/50',
      border: 'border-yellow-100',
    },
    {
      id: 'employees',
      title: 'Active Employees',
      value: employeesCount,
      icon: <UserCheck size={16} className="text-green-600" />,
      bg: 'bg-green-50/50',
      border: 'border-green-100',
    },
    {
      id: 'offboarding',
      title: 'Offboarding Cases',
      value: offboardingCount,
      icon: <UserX size={16} className="text-red-600" />,
      bg: 'bg-red-50/50',
      border: 'border-red-100',
    },
  ];

  return (
    <div id="kpi-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k, i) => {
        const isSelected = activeMetric === k.id;
        return (
          <div
            key={k.id}
            onClick={() => onCardClick?.(k.id)}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`group flex animate-in cursor-pointer flex-col justify-between rounded-md border border-line bg-surface p-4 fade-in-0 slide-in-from-bottom-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              isSelected ? 'border-accent-200 shadow-md ring-1 ring-accent-600' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-semibold uppercase tracking-wider text-gray-500">
                {k.title}
              </span>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${k.bg} border ${k.border} transition-transform duration-200 group-hover:scale-110`}
              >
                {k.icon}
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <CountUp
                value={k.value}
                className="font-display text-2xl font-bold tracking-tight text-gray-900 tabular-nums"
              />
              <ArrowUpRight
                size={12}
                className="transform text-gray-300 transition duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-600"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default KPICards;
