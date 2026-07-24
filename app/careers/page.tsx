import React from 'react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { fetchJobs } from '@/lib/api/server';
import { CareersOpenings } from '@/components/careers/CareersOpenings';
import { ArrowUpRight, ArrowDown, AlertTriangle, CheckCircle2, Users, Briefcase, TrendingUp } from 'lucide-react';
import type { Job } from '@/types';

/**
 * Public careers landing — served at {@link BRAND.careersHost}. Job data is
 * fetched ON THE SERVER (see `fetchJobs`), so the openings are baked into the
 * HTML (good for SEO + first paint) and the backend API call never appears in
 * the browser. Only live openings are public; drafts/closed/on-hold never show.
 *
 * Each row routes to `/jobs/[jobId]`, the public posting + application page.
 */
export default async function CareersPage() {
  let open: Job[] = [];
  let failed = false;
  try {
    const jobs = await fetchJobs();
    open = jobs.filter(j => j.status === 'Open');
  } catch {
    failed = true;
  }

  return (
    <div
      className="min-h-screen bg-[#FFFFFF] text-gray-900"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45)), url(/careers-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
      }}
    >
      {/* ---- Hero band (shares the page paper texture) ---- */}
      <div className="relative overflow-hidden">
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
        {/* Trust & Experience Section */}
        <div className="mb-12 rounded-2xl border border-accent-200/60 bg-gradient-to-br from-accent-50/80 to-white p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-600 text-white">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900">
              Why join {BRAND.company}?
            </h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-gray-700">
            Our HR platform is built from hands-on experience managing real hiring pipelines and employee lifecycles. We've processed hundreds of applications, conducted countless interviews, and refined every workflow based on what actually works in practice.
          </p>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white bg-white/60 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-accent-600">
                <Users size={18} />
                <span className="font-display text-2xl font-bold">Real-world</span>
              </div>
              <p className="text-xs text-gray-600">
                Built by HR practitioners who understand the daily challenges of talent management
              </p>
            </div>
            
            <div className="rounded-xl border border-white bg-white/60 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-accent-600">
                <Briefcase size={18} />
                <span className="font-display text-2xl font-bold">Battle-tested</span>
              </div>
              <p className="text-xs text-gray-600">
                Every feature refined through actual hiring cycles and employee onboarding processes
              </p>
            </div>
            
            <div className="rounded-xl border border-white bg-white/60 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-accent-600">
                <TrendingUp size={18} />
                <span className="font-display text-2xl font-bold">Proven</span>
              </div>
              <p className="text-xs text-gray-600">
                Workflows optimized based on direct feedback from HR teams managing live operations
              </p>
            </div>
          </div>
        </div>

        {/* Job Openings */}
        <div id="openings">
          {failed ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-gray-500">
              <AlertTriangle className="text-amber-500" size={28} />
              <p className="font-semibold text-gray-800">Could not load openings</p>
              <p className="text-sm">Please refresh the page in a moment.</p>
            </div>
          ) : (
            <CareersOpenings jobs={open} />
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-3xl border-t border-[#EDEEF1] px-5 py-10 text-[11px] text-gray-400">
        © {BRAND.company} · Careers
      </footer>
    </div>
  );
}
