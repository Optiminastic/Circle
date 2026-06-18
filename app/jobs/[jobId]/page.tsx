import React from 'react';
import { Logo } from '@/components/Logo';
import { fetchJob } from '@/lib/api/server';
import { ApplyForm } from '@/components/jobs/ApplyForm';
import { capitalizeFirst } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { MapPin, Briefcase, Clock4, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Public job posting + application page. The posting is fetched ON THE SERVER,
 * so the role content is baked into the HTML (SEO + first paint) and no backend
 * API call appears in the browser. Only the application form below is a client
 * component (it needs upload + submit interactivity).
 */
export default async function PublicJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  let job = null;
  let failed = false;
  try {
    job = await fetchJob(jobId);
  } catch {
    failed = true;
  }

  if (failed || !job) {
    return (
      <Centered>
        <AlertTriangle className="text-amber-500" size={28} />
        <p className="text-gray-800 font-semibold">This opening could not be found</p>
        <p className="text-gray-500 text-sm">
          The link may be incorrect or the posting was removed.
        </p>
      </Centered>
    );
  }

  const closed = job.status === 'Closed' || job.status === 'On Hold';
  const requirements = job.requirements
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      {/* Textured hero band — public, candidate-facing only (not the HRMS). */}
      <div className="bg-sandslate relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white"
        />

        {/* Minimal top bar */}
        <header className="relative border-b border-black/[0.06]">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-5">
            <Logo size={24} />
            <span className="font-display text-sm font-bold tracking-tight text-gray-900">
              {BRAND.name}
            </span>
            <span className="ml-auto font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Careers
            </span>
          </div>
        </header>

        {/* Role header (on the texture) */}
        <div className="relative mx-auto max-w-2xl space-y-3 px-5 pb-10 pt-10 sm:pt-12">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
              closed
                ? 'border-red-200 bg-red-50/90 text-red-600'
                : 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
            }`}
          >
            <span className={`size-1.5 rounded-full ${closed ? 'bg-red-500' : 'bg-emerald-500'}`} />
            {closed ? 'Applications closed' : 'Actively hiring'}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {capitalizeFirst(job.title)}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-gray-600">
            <span className="font-semibold text-gray-800">{BRAND.name}</span>
            <span className="text-gray-400">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {job.location}
            </span>
            <span className="text-gray-400">·</span>
            <span className="inline-flex items-center gap-1">
              <Briefcase size={13} /> {job.employmentType}
            </span>
            <span className="text-gray-400">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock4 size={13} /> {job.minExperienceYears}+ yrs
            </span>
            <span className="text-gray-400">·</span>
            <span className="inline-flex items-center gap-1">
              <Wallet size={13} /> {job.salaryMin} – {job.salaryMax}
            </span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5 pb-12">
        {/* About the role */}
        <section className="mt-2 space-y-6 pt-6">
          <div>
            <h2 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-500">
              About the role
            </h2>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-gray-700">
              {job.description}
            </p>
          </div>
          {requirements.length > 0 && (
            <div>
              <h2 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-500">
                What we&apos;re looking for
              </h2>
              <ul className="space-y-2">
                {requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-gray-700">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Apply (client) */}
        <ApplyForm job={job} />
      </main>

      <footer className="mx-auto max-w-2xl border-t border-[#EDEEF1] px-5 py-8 text-center text-[11px] text-gray-400">
        {BRAND.name} · Careers
      </footer>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center gap-3 px-5">
      {children}
    </div>
  );
}
