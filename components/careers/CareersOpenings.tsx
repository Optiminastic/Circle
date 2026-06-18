'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { capitalizeFirst } from '@/lib/utils';
import { MapPin, Building, Clock4, ArrowUpRight, Building2 } from 'lucide-react';

/**
 * Interactive openings list for the careers page. The jobs are fetched on the
 * server and handed in as props (so no API call is visible in the browser); this
 * component only owns the department filter + rendering.
 */
export function CareersOpenings({ jobs }: { jobs: Job[] }) {
  const [dept, setDept] = useState('All');

  const departments = useMemo(
    () => ['All', ...Array.from(new Set(jobs.map(j => j.department).filter(Boolean))).sort()],
    [jobs],
  );

  const filtered = useMemo(
    () => (dept === 'All' ? jobs : jobs.filter(j => j.department === dept)),
    [jobs, dept],
  );

  return (
    <>
      {/* ---- Department filter chips ---- */}
      {jobs.length > 0 && (
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

      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E4E6EA] bg-[#F8F9FB] py-20 text-center">
          <Building2 className="text-gray-300" size={32} />
          <p className="font-semibold text-gray-700">
            {jobs.length === 0 ? 'No open roles right now' : 'No roles in this team'}
          </p>
          <p className="max-w-sm text-sm text-gray-500">
            {jobs.length === 0
              ? 'We’re not actively hiring at the moment — check back soon.'
              : 'Try a different team filter.'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-[#EDEEF1] border-t border-[#EDEEF1]">
          {filtered.map(job => {
            // A short one-liner under the title (first line of the description).
            const blurb = (job.description || '').split('\n').map(s => s.trim()).find(Boolean) ?? '';
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
                      {job.location && <Chip icon={<MapPin size={12} />}>{job.location}</Chip>}
                      <Chip icon={<Clock4 size={12} />}>{job.employmentType}</Chip>
                      {job.minExperienceYears > 0 && (
                        <Chip icon={<Building size={12} />}>{job.minExperienceYears}+ yrs</Chip>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
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
