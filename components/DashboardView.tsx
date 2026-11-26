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
import { Candidate } from '../types';
import type { DashboardOverview, UpcomingInterviewPair } from '@/lib/api/stats';
import {
  Briefcase,
  Users,
  UserCheck,
  UserX,
  ArrowRight,
  ArrowUpRight,
  Plus,
  CalendarClock,
  Video,
  MapPin,
  User,
  MoreHorizontal,
} from 'lucide-react';
import { TagPill, StatusPill } from '@/components/ui/table';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface DashboardViewProps {
  /** The 4 KPI cards — computed server-side (COUNT/conditional aggregates),
   *  not derived from a full-table fetch. See docs/PERFORMANCE_AUDIT.md P0-3. */
  stats: DashboardOverview;
  /** Next N Scheduled interviews, already joined with each candidate's
   *  CURRENT record server-side (candidate is `null` if since deleted). */
  upcomingInterviews: UpcomingInterviewPair[];
  /** Newest applicants, already sorted + bounded server-side
   *  (GET /api/candidates?sortBy=appliedAt&sortOrder=desc&limit=N) —
   *  not sliced from a full-table fetch. */
  newCandidates: Candidate[];
  onSelectCandidate: (id: string) => void;
  /** Independent per-section loading - the page itself only waits on
   *  `stats` (the fastest of the three); these two render their own
   *  skeleton instead of blocking the whole page. See
   *  docs/PRODUCTION_PERFORMANCE_FIX_REPORT.md's route-priority fetching
   *  work ("never use one global loading flag that waits for all
   *  application APIs"). */
  upcomingInterviewsLoading?: boolean;
  newCandidatesLoading?: boolean;
}

// Looping, muted ambient video behind the dashboard greeting header.
// Self-hosted from /public so the header doesn't depend on a third-party CDN.
const HEADER_VIDEO = '/greeting-header.mp4';

/** "Tue, 30 Jun · 11:00 AM" style interview slot. */
const fmtSlot = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
};

export function DashboardView({
  stats,
  upcomingInterviews: upcomingInterviewPairs,
  newCandidates,
  onSelectCandidate,
  upcomingInterviewsLoading = false,
  newCandidatesLoading = false,
}: DashboardViewProps) {
  const { user } = useAuth();
  const name = (user?.name || displayName(user?.email) || 'there').split(' ')[0];

  // Time-of-day greeting + today's date, computed after mount to avoid any
  // server/client hydration mismatch.
  const [greeting, setGreeting] = useState('Welcome back');
  const [today, setToday] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    setToday(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    );
  }, []);

  // ---- Real, server-computed metrics (COUNT/conditional aggregates, not a
  // full-table fetch filtered client-side) — see docs/PERFORMANCE_AUDIT.md P0-3 ----
  const openPositions = stats.jobs.open;
  const totalJobs = stats.jobs.total;
  const activeCandidates = stats.candidates.active;
  const interviewingCount = stats.candidates.interviewing;
  const activeEmployees = stats.employees.active;
  const totalEmployees = stats.employees.total;
  const onProbation = stats.employees.onProbation;
  const activeExits = stats.offboarding.activeExits;
  const onNotice = stats.offboarding.onNotice;

  const statCards = [
    {
      id: 'open-positions',
      title: 'Open Positions',
      value: openPositions,
      total: totalJobs,
      sub: `${totalJobs} total posting${totalJobs === 1 ? '' : 's'}`,
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
      total: totalEmployees,
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

  // Candidates coming in for interviews — already the next N Scheduled
  // interviews from now, soonest first, joined with each candidate's CURRENT
  // record server-side (see circle-be/app/repositories/stats_repository.py
  // upcoming_interviews) instead of downloading both full tables to filter/
  // sort/join them here. `candidate` is null when that candidate has since
  // been deleted — falls back to the interview's own frozen snapshot, same
  // as before.
  const upcomingInterviews = upcomingInterviewPairs.map(pair => pair.interview);
  const candidateById = new Map(
    upcomingInterviewPairs
      .filter(pair => pair.candidate !== null)
      .map(pair => [pair.interview.candidateId, pair.candidate as Candidate]),
  );

  return (
    <div className="relative space-y-4 select-none pb-8">
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
      <div className="relative flex flex-col gap-4 overflow-hidden min-h-[215px] rounded-lg border border-white/10 bg-[#0b1f3a] px-6 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between">
        {/* Ambient looping video backdrop — muted, auto-playing, cover-fit */}
        <video
          aria-hidden="true"
          src={HEADER_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Light wash on the left so the text stays readable */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b1f3a] via-[#0b1f3a]/55 to-[#0b1f3a]/10"
        />
        <div className="relative z-10 min-w-0">
          <p className="font-mono text-[12px] uppercase tracking-wider text-white/70">{today || ' '}</p>
          <h2 className="mt-0.5 font-display text-xl font-bold tracking-tight text-white">
            {greeting}, {name}
          </h2>
          <p className="mt-1.5 text-sm text-white/75">
            Here&apos;s what&apos;s moving across hiring, your team, and exits today.
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            size="default"
            className="border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15"
          >
            <Link href="/jobs">
              <Plus size={16} /> Post a job
            </Link>
          </Button>
          <Button asChild variant="secondary" size="default">
            <Link href="/directory">
              <Users size={16} /> Directory
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI stat cards — real values, clickable */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => {
          const Icon = s.Icon;
          return (
            <Link
              key={s.id}
              href={s.href}
              style={{ animationDelay: `${i * 70}ms` }}
              className="group flex animate-in cursor-pointer flex-col gap-2 rounded-md border border-line bg-surface p-4 fade-in-0 slide-in-from-bottom-1 transition-colors duration-150 hover:border-accent-300 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {s.title}
                </span>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-transform duration-200 group-hover:scale-110 ${s.iconCls}`}
                >
                  <Icon size={16} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="min-w-0">
                  <CountUp
                    value={s.value}
                    className="font-display text-2xl font-bold leading-none tracking-tight text-gray-900 tabular-nums"
                  />
                  <p className="mt-1.5 truncate text-[11px] text-gray-500">{s.sub}</p>
                </div>
                <ArrowUpRight
                  size={14}
                  className="transform text-gray-300 transition duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-600"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Upcoming interviews — candidates coming in next, soonest first */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">
            Upcoming Interviews {upcomingInterviewsLoading ? '' : `(${upcomingInterviews.length})`}
          </h4>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-accent-600 hover:text-accent-700"
          >
            Calendar <ArrowRight size={10} />
          </Link>
        </div>

        {upcomingInterviewsLoading ? (
          <div className="rounded-md border border-line bg-surface">
            <SkeletonRows rows={3} columns={[30, 25, 20, 15]} />
          </div>
        ) : upcomingInterviews.length === 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-line bg-surface px-5 py-4">
            <p className="text-xs text-gray-500">No upcoming interviews scheduled.</p>
            <Link
              href="/calendar"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
            >
              Schedule one <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcomingInterviews.map(iv => {
              const online = iv.interviewRound === 'Online' || iv.interviewType === 'Online';
              // The interview record freezes the candidate's name/role/department
              // at the moment it was scheduled. If the candidate's application
              // (role, department) changes afterward, that snapshot goes stale —
              // so always prefer the live candidate record it links to, and only
              // fall back to the snapshot if that candidate can't be found.
              const liveCandidate = candidateById.get(iv.candidateId);
              const displayName = liveCandidate?.fullName || iv.candidateName;
              const displayDepartment = liveCandidate?.department || iv.department;
              const displayRole = liveCandidate?.appliedRole || iv.appliedRole;
              return (
                <button
                  key={iv.id}
                  type="button"
                  onClick={() => onSelectCandidate(iv.candidateId)}
                  className="group flex flex-col rounded-lg border border-line bg-surface p-4 text-left shadow-2xs transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-accent-300 hover:shadow-lg"
                >
                  {/* Header: accent bar + name + tags + kebab */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 border-l-[3px] border-accent-500 pl-2.5">
                      <h5 className="truncate text-sm font-bold text-gray-900 group-hover:text-accent-700">
                        {displayName}
                      </h5>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {displayDepartment && <TagPill color="purple">{displayDepartment}</TagPill>}
                        {displayRole && <TagPill color="gray">{displayRole}</TagPill>}
                      </div>
                    </div>
                    <span className="grid size-6 shrink-0 place-items-center rounded-sm text-gray-400 transition group-hover:bg-surface-sunken group-hover:text-accent-600">
                      <MoreHorizontal size={15} />
                    </span>
                  </div>

                  {/* Interview slot */}
                  <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2">
                    <CalendarClock size={14} className="shrink-0 text-accent-600" />
                    <span className="text-xs font-semibold text-gray-800">{fmtSlot(iv.dateTime)}</span>
                  </div>

                  {/* Footer: interviewer + mode */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line-hover pt-2.5 text-[11px] text-gray-500">
                    <span className="flex min-w-0 items-center gap-1">
                      <User size={11} className="shrink-0" />
                      <span className="truncate">{iv.interviewerName || 'To be assigned'}</span>
                    </span>
                    <StatusPill
                      tone={online ? 'blue' : 'amber'}
                      label={online ? 'Online' : 'Onsite'}
                      icon={online ? <Video size={11} /> : <MapPin size={11} />}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* New candidates */}
      <NewCandidatesPanel candidates={newCandidates} loading={newCandidatesLoading} />
    </div>
  );
}
export default DashboardView;
