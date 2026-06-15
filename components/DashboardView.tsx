'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { NewCandidatesPanel } from './NewCandidatesPanel';
import { CountUp } from '@/components/ui/count-up';
import { useAuth, displayName } from '@/store/auth-store';
import {
  Candidate,
  Interview,
  IQTest,
  Assignment,
  Job,
  Employee,
  OffboardingWorkflow,
} from '../types';
import {
  Briefcase,
  Users,
  UserCheck,
  UserX,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Clock,
  Timer,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { TagPill, StatusPill } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';

interface DashboardViewProps {
  candidates: Candidate[];
  interviews: Interview[];
  iqTests: IQTest[];
  assignments: Assignment[];
  jobs: Job[];
  employees: Employee[];
  offboarding: OffboardingWorkflow[];
  onSelectCandidate: (id: string) => void;
}

const PROBATION_MONTHS = 6;

/** "13 Jun 2026" style short date. */
const fmtDate = (d: Date) =>
  Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export function DashboardView({
  candidates,
  interviews,
  iqTests,
  jobs,
  employees,
  offboarding,
  onSelectCandidate,
}: DashboardViewProps) {
  const { user } = useAuth();
  const name = (user?.name || displayName(user?.email) || 'there').split(' ')[0];

  // Time-of-day greeting, backdrop + today's date, computed after mount to avoid
  // any server/client hydration mismatch.
  const [greeting, setGreeting] = useState('Welcome back');
  const [today, setToday] = useState('');
  const [bgImage, setBgImage] = useState('/greeting-bg.jpg');
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) {
      setGreeting('Good morning');
      setBgImage('/greeting-bg-morning.jpg');
    } else if (h < 17) {
      setGreeting('Good afternoon');
      setBgImage('/greeting-bg-afternoon.jpg');
    } else if (h < 21) {
      setGreeting('Good evening');
      setBgImage('/greeting-bg-evening.jpg');
    } else {
      setGreeting('Good evening');
      setBgImage('/greeting-bg-night.jpg');
    }
    setToday(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    );
  }, []);

  // ---- Real, derived metrics (no more hardcoded numbers) ----
  const openPositions = jobs.filter(j => j.status === 'Open').length;
  const activeCandidates = candidates.filter(
    c => c.status !== 'Rejected' && c.status !== 'Duplicate Profile',
  ).length;
  const interviewingCount = new Set(
    interviews.filter(i => i.status === 'Scheduled').map(i => i.candidateId),
  ).size;
  const activeEmployees = employees.filter(e => e.status === 'Active').length;

  const onProbation = employees.filter(e => {
    if (e.status !== 'Active') return false;
    const d = new Date(e.joiningDate);
    if (Number.isNaN(d.getTime())) return false;
    const months = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return months >= 0 && months < PROBATION_MONTHS;
  }).length;

  const activeExits = offboarding.filter(o => o.status !== 'Completed').length;
  const onNotice = offboarding.filter(o => o.status === 'Notice Period Active').length;

  // ---- Avg time-to-hire (apply → hire) ----------------------------------
  // There's no explicit "hired" timestamp, so we take the candidate's latest
  // recorded pipeline touchpoint (interview / IQ test / HR call / screening)
  // as the moment the decision landed, for everyone who was Selected.
  const DAY_MS = 86_400_000;
  const hireDayKey = (ms: number) => {
    const d = new Date(ms);
    return d.getFullYear() * 12 + d.getMonth();
  };
  const hireDurations = candidates
    .filter(c => c.status === 'Selected')
    .map(c => {
      const start = new Date(c.appliedDate).getTime();
      if (Number.isNaN(start)) return null;
      const stamps = [
        ...interviews.filter(iv => iv.candidateId === c.id).map(iv => new Date(iv.dateTime).getTime()),
        ...iqTests.filter(t => t.candidateId === c.id).map(t => new Date(t.testDate).getTime()),
        c.hrCall?.completedDate ? new Date(c.hrCall.completedDate).getTime() : NaN,
        c.screeningReview?.reviewedDate ? new Date(c.screeningReview.reviewedDate).getTime() : NaN,
      ].filter(t => !Number.isNaN(t));
      if (!stamps.length) return null;
      const end = Math.max(...stamps);
      const days = (end - start) / DAY_MS;
      return days >= 0 ? { days, end } : null;
    })
    .filter((x): x is { days: number; end: number } => x !== null);

  const mean = (xs: number[]) => xs.reduce((s, n) => s + n, 0) / xs.length;
  const avgTimeToHire = hireDurations.length ? mean(hireDurations.map(h => h.days)) : null;

  // Trend vs last month (only when both months have at least one hire).
  const nowKey = hireDayKey(Date.now());
  const thisMonth = hireDurations.filter(h => hireDayKey(h.end) === nowKey).map(h => h.days);
  const lastMonth = hireDurations.filter(h => hireDayKey(h.end) === nowKey - 1).map(h => h.days);
  const hireTrend =
    thisMonth.length && lastMonth.length ? mean(thisMonth) - mean(lastMonth) : null;

  const stats = [
    {
      id: 'open-positions',
      title: 'Open Positions',
      value: openPositions,
      total: jobs.length,
      sub: `${jobs.length} total posting${jobs.length === 1 ? '' : 's'}`,
      href: '/jobs',
      Icon: Briefcase,
      iconCls: 'text-accent-600 bg-accent-50 border-accent-100',
    },
    {
      id: 'active-candidates',
      title: 'Active Candidates',
      value: activeCandidates,
      total: undefined as number | undefined,
      sub: `${interviewingCount} in interview`,
      href: '/candidates',
      Icon: Users,
      iconCls: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      id: 'employees',
      title: 'Active Employees',
      value: activeEmployees,
      total: employees.length,
      sub: `${onProbation} on probation`,
      href: '/directory',
      Icon: UserCheck,
      iconCls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'offboarding',
      title: 'Offboarding Cases',
      value: activeExits,
      total: undefined as number | undefined,
      sub: `${onNotice} on notice`,
      href: '/offboarding',
      Icon: UserX,
      iconCls: 'text-red-600 bg-red-50 border-red-100',
    },
  ];

  const onboardingArrivals = candidates
    .filter(c => c.status === 'Shortlisted' || c.status === 'Moved to HR Call')
    .slice(0, 3);

  return (
    <div className="relative space-y-6 select-none pb-10">
      {/* Decorative ambient glows — give the glass cards something to frost over
          and break up the flat background. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-1/3 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-accent-400/15 blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-40 -z-10 h-64 w-[28rem] rounded-full bg-amber-300/15 blur-[90px]"
      />

      {/* Greeting header */}
      <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] px-7 py-8 sm:flex-row sm:items-center sm:justify-between">
        {/* Photo backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-bottom opacity-55"
          style={{ backgroundImage: `url('${bgImage}')` }}
        />
        {/* Light wash on the left so the text stays readable */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FFFFFF]/85 via-[#FFFFFF]/45 to-[#FFFFFF]/10"
        />
        <div className="relative z-10 min-w-0">
          <p className="font-mono text-[12px] uppercase tracking-wider text-accent-600">{today || ' '}</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-gray-900">
            {greeting}, {name}
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Here&apos;s what&apos;s moving across hiring, your team, and exits today.
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-2.5">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-700"
          >
            <Plus size={16} /> Post a job
          </Link>
          <Link
            href="/directory"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-700"
          >
            <Users size={16} /> Directory
          </Link>
        </div>
      </div>

      {/* KPI stat cards — real values, clickable */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s, i) => {
          const Icon = s.Icon;
          return (
            <Link
              key={s.id}
              href={s.href}
              style={{ animationDelay: `${i * 70}ms` }}
              className="group flex animate-in cursor-pointer flex-col justify-between rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-xl fade-in-0 slide-in-from-bottom-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-accent-200/70 hover:shadow-xl hover:shadow-accent-500/10"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {s.title}
                </span>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-110 ${s.iconCls}`}
                >
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className="flex items-baseline gap-0.5">
                    <CountUp
                      value={s.value}
                      className="font-display text-2xl font-bold tracking-tight text-gray-900 tabular-nums"
                    />
                    {typeof s.total === 'number' && (
                      <span className="font-display text-sm font-semibold text-gray-400 tabular-nums">
                        /{s.total}
                      </span>
                    )}
                  </span>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-500">{s.sub}</p>
                </div>
                <ArrowUpRight
                  size={14}
                  className="transform text-gray-300 transition duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-600"
                />
              </div>
            </Link>
          );
        })}

        {/* Avg time-to-hire — built with shadcn <Card>, styled to match the glass
            KPI row. Lower is better, so a downward trend is shown in green. */}
        <Card
          style={{ animationDelay: `${stats.length * 70}ms` }}
          className="group animate-in justify-between gap-0 rounded-2xl border-white/60 bg-white/70 p-0 py-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-xl fade-in-0 slide-in-from-bottom-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-accent-200/70 hover:shadow-xl hover:shadow-accent-500/10"
        >
          <CardHeader className="px-4">
            <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-gray-500">
              Avg Time-to-Hire
            </CardTitle>
            <CardAction>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-600 transition-transform duration-200 group-hover:scale-110">
                <Timer size={16} />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="px-4">
            <span className="flex items-baseline gap-0.5">
              <span className="font-display text-2xl font-bold tracking-tight text-gray-900 tabular-nums">
                {avgTimeToHire == null ? '—' : avgTimeToHire.toFixed(1)}
              </span>
              {avgTimeToHire != null && (
                <span className="font-display text-sm font-semibold text-gray-400">days</span>
              )}
            </span>
            {avgTimeToHire == null ? (
              <p className="mt-0.5 font-mono text-[10px] text-gray-500">No hires recorded yet</p>
            ) : hireTrend != null ? (
              <p
                className={`mt-0.5 flex items-center gap-1 font-mono text-[10px] font-medium ${
                  hireTrend <= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {hireTrend <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                {Math.abs(hireTrend).toFixed(1)}d vs last month
              </p>
            ) : (
              <p className="mt-0.5 font-mono text-[10px] text-gray-500">
                Across {hireDurations.length} hire{hireDurations.length === 1 ? '' : 's'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expected arrivals / onboarding */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">
            Expected Arrivals ({onboardingArrivals.length})
          </h4>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-accent-600 hover:text-accent-700"
          >
            Onboarding <ArrowRight size={10} />
          </Link>
        </div>

        {onboardingArrivals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4E6EA] bg-[#FFFFFF] py-10 text-center text-xs text-gray-500">
            No candidates approaching their joining window.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {onboardingArrivals.map(oa => {
              const applied = new Date(oa.appliedDate);
              const join = new Date(Date.now() + oa.noticePeriodDays * 86_400_000);
              return (
                <button
                  key={oa.id}
                  type="button"
                  onClick={() => onSelectCandidate(oa.id)}
                  className="group flex flex-col rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 text-left shadow-2xs transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-accent-300 hover:shadow-lg"
                >
                  {/* Header: accent bar + name + tags + kebab */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 border-l-[3px] border-accent-500 pl-2.5">
                      <h5 className="truncate text-sm font-bold text-gray-900 group-hover:text-accent-700">
                        {oa.fullName}
                      </h5>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <TagPill color="purple">{oa.department}</TagPill>
                        <TagPill color="gray">{oa.appliedRole}</TagPill>
                      </div>
                    </div>
                    <span className="grid size-6 shrink-0 place-items-center rounded-md text-gray-400 transition group-hover:bg-[#F1F3F5] group-hover:text-accent-600">
                      <MoreHorizontal size={15} />
                    </span>
                  </div>

                  {/* Applied → expected join */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Applied
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-gray-800">{fmtDate(applied)}</p>
                    </div>
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#E4E6EA] text-gray-400">
                      <ChevronRight size={13} />
                    </span>
                    <div className="flex-1">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Earliest join
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-gray-800">{fmtDate(join)}</p>
                    </div>
                  </div>

                  {/* Footer: meta + status */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EDEEF1] pt-2.5 text-[11px] text-gray-500">
                    <span className="flex min-w-0 items-center gap-1">
                      <Clock size={11} className="shrink-0" />
                      <span className="truncate">Notice {oa.noticePeriodDays} days</span>
                    </span>
                    <StatusPill tone="amber" label={oa.status} icon={<Clock size={11} />} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* New candidates */}
      <NewCandidatesPanel candidates={candidates} />
    </div>
  );
}
export default DashboardView;
