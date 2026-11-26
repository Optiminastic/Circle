'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  CalendarRange,
  UserSearch,
  ListTodo,
  Users,
  Gauge,
  TrendingUp,
  MessageSquare,
  LogOut,
  BarChart3,
  Settings,
  User,
  IdCard,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { useUiStore } from '@/store/ui-store';
import { useCandidatesPage } from '@/features/candidates/hooks';
import { useJobsPage } from '@/features/jobs/hooks';
import { useEmployeesPage } from '@/features/employees/hooks';

const TOP_N = 50;

interface NavEntry {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: string;
}

const NAV: NavEntry[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'General' },
  { href: '/jobs', label: 'Job Postings', icon: Briefcase, group: 'General' },
  { href: '/calendar', label: 'Recruitment Calendar', icon: CalendarRange, group: 'General' },
  { href: '/candidates', label: 'Candidates', icon: UserSearch, group: 'General' },
  { href: '/onboarding', label: 'Onboarding Checklist', icon: ListTodo, group: 'Employees' },
  { href: '/directory', label: 'Employee Directory', icon: Users, group: 'Employees' },
  { href: '/performance', label: 'Task Performance', icon: Gauge, group: 'Performance' },
  { href: '/appraisals', label: 'Reviews & Feedback', icon: TrendingUp, group: 'Performance' },
  { href: '/communication', label: 'Communication', icon: MessageSquare, group: 'Performance' },
  { href: '/offboarding', label: 'Exit Cases', icon: LogOut, group: 'Offboarding' },
  { href: '/reports', label: 'Enterprise Reports', icon: BarChart3, group: 'Workspace' },
  { href: '/settings', label: 'Global Settings', icon: Settings, group: 'Workspace' },
];

const GROUPS = ['General', 'Employees', 'Performance', 'Offboarding', 'Workspace'];

/**
 * Global ⌘K / Ctrl+K command + search palette. Mounted once in the dashboard
 * shell. Search spans live data (candidates, roles, employees) and quick page
 * navigation; selecting an entity routes to its detail page. The open state is
 * shared via the UI store so the header search box can open it too.
 */
export function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUiStore();

  // Fetches only the top TOP_N of each, server-side — this component only
  // ever rendered the first 50 of whatever useCandidates()/useJobs()/
  // useEmployees() returned anyway (cmdk fuzzy-filters within what's
  // rendered, not the full table), so this is the same rendered result for
  // a fraction of the data: previously the ENTIRE candidates table (2,400+
  // rows, each with its full extracted resume text) was downloaded just to
  // keep 50 of them. See docs/PERFORMANCE_AUDIT.md P0-2. This does not fix
  // "can't find a candidate past the first 50" — that limitation already
  // existed before this change — it only removes the cost of fetching the
  // other rows no view of this component could ever reach anyway.
  //
  // `enabled: commandOpen` — this component is mounted on EVERY route (via
  // DashboardShell), so without this it fired all three fetches on every
  // single page load regardless of whether the palette was ever opened.
  // Only fetches once the user actually opens it (Ctrl/Cmd+K); after that,
  // normal React Query caching means re-opening doesn't refetch unless
  // stale. See docs/PRODUCTION_PERFORMANCE_FIX_REPORT.md's route-priority
  // fetching work.
  const { data: candidatesPage } = useCandidatesPage({ page: 1, limit: TOP_N }, { enabled: commandOpen });
  const { data: jobsPage } = useJobsPage({ page: 1, limit: TOP_N }, { enabled: commandOpen });
  const { data: employeesPage } = useEmployeesPage({ page: 1, limit: TOP_N }, { enabled: commandOpen });
  const candidates = candidatesPage?.data ?? [];
  const jobs = jobsPage?.data ?? [];
  const employees = employeesPage?.data ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [commandOpen, setCommandOpen]);

  const go = (href: string) => {
    setCommandOpen(false);
    router.push(href);
  };

  // Already capped to TOP_N server-side (useCandidatesPage/etc above) — cmdk
  // fuzzy-filters by the typed query within whatever's rendered here.
  const topCandidates = candidates;
  const topJobs = jobs;
  const topEmployees = employees;

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title="Search"
      description="Search candidates, roles, employees, and pages"
      className="sm:max-w-2xl"
    >
      <CommandInput placeholder="Search candidates, roles, employees, pages…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {topCandidates.length > 0 && (
          <CommandGroup heading="Candidates">
            {topCandidates.map(c => (
              <CommandItem
                key={`cand-${c.id}`}
                value={`candidate ${c.fullName} ${c.appliedRole} ${c.department}`}
                onSelect={() => go(`/candidates/${c.id}`)}
                className="cursor-pointer"
              >
                <User size={16} className="text-gray-500" />
                <span className="flex-1 truncate">{c.fullName}</span>
                <span className="ml-auto truncate text-[11px] text-gray-400">
                  {c.appliedRole} · {c.department}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {topJobs.length > 0 && (
          <CommandGroup heading="Roles">
            {topJobs.map(j => (
              <CommandItem
                key={`job-${j.id}`}
                value={`role job ${j.title} ${j.department} ${j.location}`}
                onSelect={() => go(`/jobs/${j.id}/applicants`)}
                className="cursor-pointer"
              >
                <Briefcase size={16} className="text-gray-500" />
                <span className="flex-1 truncate">{j.title}</span>
                <span className="ml-auto truncate text-[11px] text-gray-400">
                  {j.department} · {j.location}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {topEmployees.length > 0 && (
          <CommandGroup heading="Employees">
            {topEmployees.map(e => (
              <CommandItem
                key={`emp-${e.id}`}
                value={`employee ${e.fullName} ${e.role} ${e.department}`}
                onSelect={() => go(`/employees/${e.id}`)}
                className="cursor-pointer"
              >
                <IdCard size={16} className="text-gray-500" />
                <span className="flex-1 truncate">{e.fullName}</span>
                <span className="ml-auto truncate text-[11px] text-gray-400">
                  {e.role} · {e.department}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {GROUPS.map(group => {
          const items = NAV.filter(n => n.group === group);
          if (!items.length) return null;
          return (
            <CommandGroup key={group} heading={group}>
              {items.map(({ href, label, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={`page ${label}`}
                  onSelect={() => go(href)}
                  className="cursor-pointer"
                >
                  <Icon size={16} className="text-gray-500" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
