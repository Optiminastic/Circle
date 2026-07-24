import React from 'react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { fetchJobs } from '@/lib/api/server';
import { CareersOpenings } from '@/components/careers/CareersOpenings';
import { ArrowUpRight, ArrowDown, AlertTriangle, ExternalLink } from 'lucide-react';
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

      {/* ---- Why Join Us section with authoritative links ---- */}
      <section className="mx-auto max-w-3xl px-5 pb-12 pt-8">
        <div className="rounded-2xl border border-[#E4E6EA] bg-white/80 p-6 backdrop-blur-sm sm:p-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900">
            Why Join {BRAND.company}?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            We believe in creating a workplace that supports professional growth, work-life balance,
            and continuous learning. Research shows that these factors are critical to employee
            satisfaction and long-term career success.
          </p>
          
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-[#EDEEF1] bg-[#F8F9FB] p-4">
              <h3 className="text-sm font-semibold text-gray-900">Professional Development</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                We invest in continuous learning and skill development. According to the{' '}
                <a
                  href="https://www.bls.gov/careeroutlook/2022/article/career-planning.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-accent-600 hover:text-accent-700 hover:underline"
                >
                  U.S. Bureau of Labor Statistics
                  <ExternalLink size={11} className="shrink-0" />
                </a>
                , ongoing professional development is essential for career advancement and job satisfaction.
              </p>
            </div>

            <div className="rounded-lg border border-[#EDEEF1] bg-[#F8F9FB] p-4">
              <h3 className="text-sm font-semibold text-gray-900">Work-Life Balance</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                We support flexible work arrangements and prioritize employee well-being. The{' '}
                <a
                  href="https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-accent-600 hover:text-accent-700 hover:underline"
                >
                  World Health Organization
                  <ExternalLink size={11} className="shrink-0" />
                </a>
                {' '}emphasizes that healthy work environments are fundamental to mental health and productivity.
              </p>
            </div>

            <div className="rounded-lg border border-[#EDEEF1] bg-[#F8F9FB] p-4">
              <h3 className="text-sm font-semibold text-gray-900">Diversity & Inclusion</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                We're committed to building diverse teams. Research from{' '}
                <a
                  href="https://www.eeoc.gov/employers/small-business/3-best-practices-recruiting-and-hiring"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-accent-600 hover:text-accent-700 hover:underline"
                >
                  U.S. Equal Employment Opportunity Commission
                  <ExternalLink size={11} className="shrink-0" />
                </a>
                {' '}shows that diverse workplaces foster innovation and better decision-making.
              </p>
            </div>

            <div className="rounded-lg border border-[#EDEEF1] bg-[#F8F9FB] p-4">
              <h3 className="text-sm font-semibold text-gray-900">Career Growth</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                We provide clear career pathways and mentorship opportunities. According to{' '}
                <a
                  href="https://en.wikipedia.org/wiki/Career_development"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-accent-600 hover:text-accent-700 hover:underline"
                >
                  career development research
                  <ExternalLink size={11} className="shrink-0" />
                </a>
                , structured career development programs significantly improve employee retention and engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main id="openings" className="mx-auto max-w-3xl px-5 pb-20">
        {failed ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center text-gray-500">
            <AlertTriangle className="text-amber-500" size={28} />
            <p className="font-semibold text-gray-800">Could not load openings</p>
            <p className="text-sm">Please refresh the page in a moment.</p>
          </div>
        ) : (
          <CareersOpenings jobs={open} />
        )}
      </main>

      <footer className="mx-auto max-w-3xl border-t border-[#EDEEF1] px-5 py-10 text-[11px] text-gray-400">
        © {BRAND.company} · Careers
      </footer>
    </div>
  );
}
