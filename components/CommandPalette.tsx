'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

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
 * Global ⌘K / Ctrl+K command palette for quick navigation. Mounted once in the
 * dashboard shell; uses the bespoke CommandDialog (inherits the crimson dialog).
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Quick navigation" description="Jump to any page">
      <CommandInput placeholder="Search pages…" />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        {GROUPS.map(group => {
          const items = NAV.filter(n => n.group === group);
          if (!items.length) return null;
          return (
            <CommandGroup key={group} heading={group}>
              {items.map(({ href, label, icon: Icon }) => (
                <CommandItem key={href} value={label} onSelect={() => go(href)} className="cursor-pointer">
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
