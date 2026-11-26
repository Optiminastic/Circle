'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';

/** Human label for each known route segment. */
const LABELS: Record<string, string> = {
  jobs: 'Job Postings',
  candidates: 'Candidates',
  applicants: 'Applicants',
  employees: 'Employee Directory',
  directory: 'Employee Directory',
  calendar: 'Recruitment Calendar',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
  performance: 'Task Performance',
  appraisals: 'Reviews & Feedback',
  communication: 'Communication',
  reports: 'Enterprise Reports',
  settings: 'Settings',
  'email-center': 'Email Center',
  'question-library': 'Question Library',
  'workspace-setup': 'Workspace Setup',
};

/** Top-level routes that actually have a list page we can link to. */
const VALID_ROUTES = new Set([
  '/jobs',
  '/candidates',
  '/calendar',
  '/directory',
  '/onboarding',
  '/offboarding',
  '/performance',
  '/appraisals',
  '/communication',
  '/reports',
  '/settings',
  '/email-center',
  '/question-library',
  '/workspace-setup',
]);

const humanize = (seg: string) =>
  seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

interface Crumb {
  label: string;
  href: string | null;
}

/**
 * Global breadcrumb shown on every dashboard page (hidden on the dashboard root).
 * Derives the trail from the URL, resolving entity ids (candidate / employee /
 * job) to their names. Only links to routes that really exist.
 *
 * Looks up exactly the one record a detail page's URL names (GET
 * /api/{resource}/{id}, an indexed PK lookup) instead of the full
 * candidates/employees/jobs tables (previously fetched here UNCONDITIONALLY,
 * on every single page including the dashboard root where this component
 * renders nothing at all) — see docs/PERFORMANCE_AUDIT.md P0-2 and the live
 * production report that caught this: candidates alone was 1,500+ rows with
 * each one's full extracted resume text.
 */
export function Breadcrumbs() {
  const pathname = usePathname() ?? '/';
  const segments = pathname.split('/').filter(Boolean);

  // Which single entity (if any) this page's URL needs a name for — decided
  // before any data hook, so only the one record actually needed is fetched.
  let candidateId: string | undefined;
  let employeeId: string | undefined;
  let jobId: string | undefined;
  segments.forEach((seg, i) => {
    const parent = segments[i - 1];
    if (LABELS[seg]) return;
    // 'applicants' = a candidate opened from a job's applicants list
    // (/jobs/[jobId]/applicants/[candidateId]) — same candidate lookup.
    if (parent === 'candidates' || parent === 'applicants') candidateId = seg;
    else if (parent === 'employees') employeeId = seg;
    else if (parent === 'jobs') jobId = seg;
  });

  // Hooks must run unconditionally (Rules of Hooks) — `enabled` is what
  // actually skips the fetch when this page doesn't need that lookup.
  const candidateQuery = useQuery({
    queryKey: qk.candidates.detail(candidateId ?? ''),
    queryFn: () => repositories.candidates.get(candidateId as string),
    enabled: Boolean(candidateId),
  });
  const employeeQuery = useQuery({
    queryKey: qk.employees.detail(employeeId ?? ''),
    queryFn: () => repositories.employees.get(employeeId as string),
    enabled: Boolean(employeeId),
  });
  const jobQuery = useQuery({
    queryKey: qk.jobs.detail(jobId ?? ''),
    queryFn: () => repositories.jobs.get(jobId as string),
    enabled: Boolean(jobId),
  });

  // Nothing to show on the dashboard home.
  if (segments.length === 0) return null;

  const crumbs: Crumb[] = [{ label: 'Dashboard', href: '/' }];
  let acc = '';
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const parent = segments[i - 1];
    const known = LABELS[seg];

    // Dynamic entity id (anything not in the label map, under a known parent).
    if (!known) {
      if (parent === 'candidates' || parent === 'applicants') {
        crumbs.push({ label: candidateQuery.data?.fullName ?? seg, href: null });
        return;
      }
      if (parent === 'employees') {
        crumbs.push({ label: employeeQuery.data?.fullName ?? seg, href: null });
        return;
      }
      if (parent === 'jobs') {
        crumbs.push({ label: jobQuery.data?.title ?? seg, href: null });
        return;
      }
      crumbs.push({ label: humanize(seg), href: null });
      return;
    }

    // 'employees' has no list page of its own — point it at the directory.
    if (seg === 'employees') {
      crumbs.push({ label: known, href: '/directory' });
      return;
    }
    crumbs.push({ label: known, href: VALID_ROUTES.has(acc) ? acc : null });
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex select-none items-center gap-1.5 text-[11px] font-medium text-gray-500"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={`${crumb.label}-${i}`}>
            {i > 0 && <ChevronRight size={12} className="shrink-0 text-gray-400" />}
            {isLast || !crumb.href ? (
              <span
                className={isLast ? 'truncate font-semibold text-gray-900' : 'truncate text-gray-500'}
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="truncate transition hover:text-accent-700">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
