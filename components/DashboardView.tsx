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
  CalendarClock,
  Video,
  MapPin,
  User,
  MoreHorizontal,
} from 'lucide-react';
import { TagPill, StatusPill } from '@/components/ui/table';

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

// Looping, muted ambient video behind the dashboard greeting header (Cloudinary).
const HEADER_VIDEO =
  'https://res.cloudinary.com/dui7h1n3d/video/upload/v1782882408/From_Klickpin.com-_Wave-filled_ocean_moods_for_people_who_love_beauty_with_soft_aesthetic_charm_to_brighten_your_feed-pin-id-23573598046061690_-_ROTATE_-_Videobolt.net_x2dqmi.mp4';

/** "Tue, 30 Jun · 11:00 AM" style interview slot. */
const fmtSlot = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
};

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

  // Candidates coming in for interviews — the next 6 scheduled interviews from
  // now onward, soonest first. Derived from the live `interviews` query, so it
  // refreshes automatically as new interviews are scheduled / rescheduled. Only
  // interviews whose candidate still exists are shown, so a deleted candidate's
  // orphaned interview never lingers here.
  const now = Date.now();
  const liveCandidateIds = new Set(candidates.map(c => c.id));
  const upcomingInterviews = interviews
    .filter(iv => iv.status === 'Scheduled' && liveCandidateIds.has(iv.candidateId))
    .map(iv => ({ iv, t: new Date(iv.dateTime).getTime() }))
    .filter(x => !Number.isNaN(x.t) && x.t >= now)
    .sort((a, b) => a.t - b.t)
    .slice(0, 6)
    .map(x => x.iv);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Upcoming interviews — candidates coming in next, soonest first */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">
            Upcoming Interviews ({upcomingInterviews.length})
          </h4>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-accent-600 hover:text-accent-700"
          >
            Calendar <ArrowRight size={10} />
          </Link>
        </div>

        {upcomingInterviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4E6EA] bg-[#FFFFFF] py-10 text-center text-xs text-gray-500">
            No upcoming interviews scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcomingInterviews.map(iv => {
              const online = iv.interviewRound === 'Online' || iv.interviewType === 'Online';
              return (
                <button
                  key={iv.id}
                  type="button"
                  onClick={() => onSelectCandidate(iv.candidateId)}
                  className="group flex flex-col rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 text-left shadow-2xs transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-accent-300 hover:shadow-lg"
                >
                  {/* Header: accent bar + name + tags + kebab */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 border-l-[3px] border-accent-500 pl-2.5">
                      <h5 className="truncate text-sm font-bold text-gray-900 group-hover:text-accent-700">
                        {iv.candidateName}
                      </h5>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {iv.department && <TagPill color="purple">{iv.department}</TagPill>}
                        {iv.appliedRole && <TagPill color="gray">{iv.appliedRole}</TagPill>}
                      </div>
                    </div>
                    <span className="grid size-6 shrink-0 place-items-center rounded-md text-gray-400 transition group-hover:bg-[#F1F3F5] group-hover:text-accent-600">
                      <MoreHorizontal size={15} />
                    </span>
                  </div>

                  {/* Interview slot */}
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2">
                    <CalendarClock size={14} className="shrink-0 text-accent-600" />
                    <span className="text-xs font-semibold text-gray-800">{fmtSlot(iv.dateTime)}</span>
                  </div>

                  {/* Footer: interviewer + mode */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EDEEF1] pt-2.5 text-[11px] text-gray-500">
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
      <NewCandidatesPanel candidates={candidates} />
    </div>
  );
}
export default DashboardView;
