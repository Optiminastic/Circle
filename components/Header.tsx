'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Bell,
  CalendarRange,
  Mail,
  LogOut,
  ShieldCheck,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { DropdownMenu, Popover } from 'radix-ui';
import { SentEmailLog } from '../types';
import { useUiStore } from '@/store/ui-store';
import { useAuth, displayName, initials } from '@/store/auth-store';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { AccessControlModal } from './AccessControlModal';

/** "5 Jun 2026" -> "2h ago" style relative label (falls back to the raw date). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  /** Open the off-canvas nav drawer on mobile (< md). */
  onOpenMobileNav?: () => void;
}

export function Header({ sidebarCollapsed, onToggleSidebar, onOpenMobileNav }: HeaderProps) {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const { setCommandOpen } = useUiStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccess, setShowAccess] = useState(false);

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

  // Mac vs. others — show the right modifier hint in the search button.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent));
  }, []);

  // Real activity feed: the most recent emails the system has sent. Empty until
  // there's activity (no seeded/placeholder notifications).
  const { data: sentEmails = [] } = useQuery({
    queryKey: qk.sentEmails.all,
    queryFn: () => repositories.sentEmails.list(),
  });
  const notifications = [...sentEmails]
    .sort((a: SentEmailLog, b: SentEmailLog) => (a.dateSent < b.dateSent ? 1 : -1))
    .slice(0, 6)
    .map((e: SentEmailLog) => ({
      id: e.id,
      text: `${e.subject}${e.recipientName ? ` — ${e.recipientName}` : ''}`,
      time: relativeTime(e.dateSent),
      unread: e.status === 'Sent' || e.status === 'Delivered',
    }));

  return (
    <header
      id="app-header"
      className="bg-[#FFFFFF] h-14 px-4 md:px-6 flex items-center justify-between gap-2 sticky top-0 z-50 select-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile: open the nav drawer (the in-flow sidebar is hidden < md) */}
        <button
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-[#EDEEF1] hover:text-gray-700 cursor-pointer transition md:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Desktop: collapse/expand the sidebar */}
        <button
          id="btn-sidebar-collapse"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden shrink-0 rounded-lg p-2 text-gray-500 hover:bg-[#EDEEF1] hover:text-gray-700 cursor-pointer transition md:block"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Global Search — opens the ⌘K command palette. Full bar on sm+, icon-only on mobile. */}
        <button
          id="global-search-trigger"
          type="button"
          onClick={() => setCommandOpen(true)}
          className="group hidden w-44 items-center gap-2 rounded-xl border border-[#E4E6EA] bg-[#EDEEF1] py-2 pl-3 pr-2 text-left text-xs text-gray-500 transition hover:bg-[#FFFFFF] hover:border-accent-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 sm:flex sm:w-64 lg:w-80"
        >
          <Search size={14} className="shrink-0 text-gray-500" />
          <span className="flex-1 truncate">Search candidates, roles, employees…</span>
          <kbd className="hidden shrink-0 rounded border border-[#D7DAE0] bg-[#FFFFFF] px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 lg:block">
            {isMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
          className="shrink-0 rounded-lg border border-[#E4E6EA] p-2 text-gray-500 transition hover:bg-[#EDEEF1] hover:text-gray-700 sm:hidden"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Recruitment calendar */}
        <Link
          href="/calendar"
          aria-label="Recruitment Calendar"
          title="Recruitment Calendar"
          className={cn(
            'rounded-lg border border-[#E4E6EA] p-2 text-gray-500 transition hover:bg-accent hover:text-gray-700',
            ui.focusRing,
          )}
        >
          <CalendarRange size={14} />
        </Link>

        {/* Notification bell */}
        <Popover.Root open={showNotifications} onOpenChange={setShowNotifications}>
          <Popover.Trigger
            id="btn-notifications"
            className={cn(
              'relative rounded-lg border border-[#E4E6EA] p-2 text-gray-500 transition hover:bg-accent hover:text-gray-700',
              ui.focusRing,
            )}
            aria-label="Notifications"
          >
            <Bell size={14} />
            {notifications.some(n => n.unread) && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500"></span>
            )}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              className={cn(ui.surface, ui.motion, 'z-50 w-80 p-0 text-xs')}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2 font-semibold text-gray-900">
                <span>System Notifications</span>
                <span className="text-[10px] font-normal text-accent-600">Mark all read</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell size={20} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-[11px]">You&apos;re all caught up.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`border-b border-border p-3 transition last:border-none hover:bg-accent ${n.unread ? 'bg-accent-50/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`font-medium ${n.unread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                        >
                          {n.text}
                        </span>
                        {n.unread && (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600"></span>
                        )}
                      </div>
                      <span className="mt-1 block font-mono text-[10px] text-gray-500">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Active Profile */}
        <div className="border-l border-[#E4E6EA] pl-4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              id="btn-profile-menu"
              className={cn('group flex items-center gap-2 rounded-md', ui.focusRing)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-accent-500 to-accent-700 text-xs font-bold text-white font-display">
                {initials(user?.email)}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-semibold text-gray-900 transition group-hover:text-accent-600">
                  {user?.name || displayName(user?.email)}
                </p>
                <p className="font-mono text-[10px] text-gray-500">
                  {isAdmin ? 'Administrator' : 'HR Specialist'}
                </p>
              </div>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className={cn(ui.surface, ui.motion, 'z-50 w-60 p-1.5 text-xs')}
              >
                <DropdownMenu.Label className="border-b border-border px-3 py-2">
                  <p className="truncate font-semibold text-gray-900">
                    {user?.name || displayName(user?.email)}
                    {isAdmin && (
                      <span className="ml-1.5 rounded-full bg-purple-50 px-1.5 py-0.5 align-middle font-mono text-[9px] text-purple-600">
                        ADMIN
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[10px] font-normal text-gray-500">
                    <Mail size={10} /> {user?.email}
                  </p>
                </DropdownMenu.Label>
                {isAdmin && (
                  <DropdownMenu.Item
                    id="btn-manage-access"
                    onSelect={() => setShowAccess(true)}
                    className={cn(ui.item, 'mt-1 font-medium text-gray-600 focus:text-accent-600')}
                  >
                    <ShieldCheck size={13} /> Manage access
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item
                  id="btn-logout"
                  onSelect={onLogout}
                  className={cn(
                    ui.item,
                    'font-medium text-gray-600 focus:bg-red-50 focus:text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-600',
                  )}
                >
                  <LogOut size={13} /> Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {showAccess && <AccessControlModal onClose={() => setShowAccess(false)} />}
      </div>
    </header>
  );
}
export default Header;
