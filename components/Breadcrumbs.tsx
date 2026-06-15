'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useCandidates } from '@/features/candidates/hooks';
import { useEmployees } from '@/features/employees/hooks';
import { useJobs } from '@/features/jobs/hooks';

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
 * job) to their names from cached data. Only links to routes that really exist.
 */
export function Breadcrumbs() {
  const pathname = usePathname() ?? '/';
  const { data: candidates = [] } = useCandidates();
  const { data: employees = [] } = useEmployees();
  const { data: jobs = [] } = useJobs();

  const segments = pathname.split('/').filter(Boolean);

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
      if (parent === 'candidates') {
        crumbs.push({ label: candidates.find(c => c.id === seg)?.fullName ?? seg, href: null });
        return;
      }
      if (parent === 'employees') {
        crumbs.push({ label: employees.find(e => e.id === seg)?.fullName ?? seg, href: null });
        return;
      }
      if (parent === 'jobs') {
        crumbs.push({ label: jobs.find(j => j.id === seg)?.title ?? seg, href: null });
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
