'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { capitalizeFirst } from '@/lib/utils';
import { useJobs } from '@/features/jobs/hooks';
import {
  MapPin,
  Globe,
  Building,
  Clock4,
  ArrowUpRight,
  ArrowDown,
  Loader2,
  AlertTriangle,
  Building2,
} from 'lucide-react';

/**
 * Public careers landing — served at {@link BRAND.careersHost}. It reads the same
 * `/api/jobs` the HR dashboard writes to, so the moment HR posts (or opens) a job
 * it appears here automatically. Each row routes to `/jobs/[jobId]`, the existing
 * public posting + application page.
 */
export default function CareersPage() {
  const { data: jobs = [], isLoading, isError } = useJobs();
  const [dept, setDept] = useState('All');

  // Only live openings are public. Drafts / closed / on-hold never surface.
  const open = useMemo(() => jobs.filter(j => j.status === 'Open'), [jobs]);

  const departments = useMemo(
    () => ['All', ...Array.from(new Set(open.map(j => j.department).filter(Boolean))).sort()],
    [open],
  );

  const filtered = useMemo(
    () => (dept === 'All' ? open : open.filter(j => j.department === dept)),
    [open, dept],
  );

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-gray-900">
      {/* ---- Textured hero band (header + hero share the sand/slate texture) ---- */}
      <div className="bg-sandslate relative overflow-hidden">
        {/* Soft veil: keeps the texture vivid up top, fades into the white list below. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-white"
        />

        {/* ---- Top bar ---- */}
        <header className="relative border-b border-black/[0.06]">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-5">
            <Logo size={24} />
            <span className="font-display text-sm font-bold tracking-tight">{BRAND.company}</span>
            <a
              href={BRAND.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto hidden shrink-0 items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500 transition hover:text-accent-600 sm:inline-flex"
            >
              {BRAND.url.replace(/^https?:\/\//, '')} <ArrowUpRight size={11} />
            </a>
          </div>
        </header>

        {/* ---- Hero — huge left-aligned "WE ARE HIRING!" with the chair to the side ---- */}
        <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-12 sm:pt-16 lg:min-h-[31rem]">
          {/* Empty chair — a seat waiting to be filled; bold side accent. It may
              overlap the copy (that's intended). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/careers-chair.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute bottom-2 right-8 hidden h-[18rem] select-none lg:block lg:right-24 xl:right-44 xl:h-[21rem]"
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <p className="font-display text-xs font-bold uppercase tracking-tight text-gray-700 sm:text-sm">
              Build what&apos;s next at {BRAND.company}
            </p>
            <h1 className="headline-3d mt-2 font-display text-[2.75rem] font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              We are hiring!
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-600 sm:mt-5 sm:text-[15px]">
              We&apos;re looking for passionate people to join {BRAND.company} — flat hierarchies,
              clear communication, and full ownership of what you ship.
            </p>
            <a
              href="#openings"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-700 sm:mt-6"
            >
              View open roles <ArrowDown size={15} />
            </a>

            {/* Chair sits below the copy on mobile / tablet. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/careers-chair.png"
              alt="An empty chair — a seat waiting for you"
              className="mx-auto mt-8 h-52 w-auto select-none object-contain sm:h-60 lg:hidden"
            />
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-3xl px-5 pb-20">
        {/* ---- Department filter chips ---- */}
        {!isLoading && !isError && open.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {departments.map(d => {
              const active = d === dept;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDept(d)}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                    active
                      ? 'border-accent-600 bg-accent-600 text-white'
                      : 'border-[#E4E6EA] bg-white text-gray-600 hover:border-accent-300'
                  }`}
                >
                  {d === 'All' ? 'View all' : d}
                </button>
              );
            })}
          </div>
        )}

        {/* ---- States ---- */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-24 text-gray-500">
            <Loader2 className="animate-spin text-accent-600" size={26} />
            <p className="text-sm">Loading open roles…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center text-gray-500">
            <AlertTriangle className="text-amber-500" size={28} />
            <p className="font-semibold text-gray-800">Could not load openings</p>
            <p className="text-sm">Please refresh the page in a moment.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E4E6EA] bg-[#F8F9FB] py-20 text-center">
            <Building2 className="text-gray-300" size={32} />
            <p className="font-semibold text-gray-700">
              {open.length === 0 ? 'No open roles right now' : 'No roles in this team'}
            </p>
            <p className="max-w-sm text-sm text-gray-500">
              {open.length === 0
                ? 'We’re not actively hiring at the moment — check back soon.'
                : 'Try a different team filter.'}
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-[#EDEEF1] border-t border-[#EDEEF1]">
            {filtered.map(job => {
              // A short one-liner under the title (first line of the description).
              const blurb = (job.description || '').split('\n').map(s => s.trim()).find(Boolean) ?? '';
              const remote = job.workMode === 'Remote';
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="group flex items-start gap-4 py-6 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[17px] font-bold tracking-tight text-gray-900 group-hover:text-accent-700">
                          {capitalizeFirst(job.title)}
                        </h3>
                        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-900 group-hover:text-accent-700">
                          Apply
                          <ArrowUpRight
                            size={15}
                            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </span>
                      </div>

                      {blurb && (
                        <p className="mt-1.5 line-clamp-1 max-w-xl text-[13px] text-gray-500">
                          {blurb}
                        </p>
                      )}

                      {/* meta chips */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Chip icon={remote ? <Globe size={12} /> : <MapPin size={12} />}>
                          {remote ? '100% remote' : job.workMode}
                        </Chip>
                        <Chip icon={<Clock4 size={12} />}>{job.employmentType}</Chip>
                        {!remote && job.location && (
                          <Chip icon={<Building size={12} />}>{job.location}</Chip>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <footer className="mx-auto max-w-3xl border-t border-[#EDEEF1] px-5 py-10 text-[11px] text-gray-400">
        © {BRAND.company} · Careers
      </footer>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E6EA] bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600">
      <span className="text-gray-400">{icon}</span>
      {children}
    </span>
  );
}
