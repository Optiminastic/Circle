'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Bell,
  CalendarRange,
  Library,
  Check,
  MapPin,
  Briefcase,
  Mail,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { DropdownMenu, Popover } from 'radix-ui';
import { Candidate, SentEmailLog } from '../types';
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
  onSearch: (query: string) => void;
  candidatesList: Candidate[];
  onQuickSelectCandidate: (candidateId: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  onSearch,
  candidatesList,
  onQuickSelectCandidate,
  sidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearch(val);
    setShowSearchResults(val.length > 1);
  };

  const filteredCandidates =
    searchQuery.length > 1
      ? candidatesList.filter(
          c =>
            c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.appliedRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.department.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [];

  return (
    <header
      id="app-header"
      className="bg-[#FFFFFF] border-b border-[#E4E6EA] h-14 px-6 flex items-center justify-between sticky top-0 z-50 select-none"
    >
      <div className="flex items-center gap-2">
        {/* Sidebar collapse toggle */}
        <button
          id="btn-sidebar-collapse"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-[#EDEEF1] hover:text-gray-700 cursor-pointer transition"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Global Search Bar */}
        <div className="relative w-80">
        <span className="absolute left-3 top-2.5 text-gray-500">
          <Search size={14} />
        </span>
        <input
          id="global-search-input"
          type="text"
          placeholder="Search candidates, roles, departments..."
          value={searchQuery}
          onChange={handleSearchChange}
          onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
          onFocus={() => {
            if (searchQuery.length > 1) setShowSearchResults(true);
          }}
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#EDEEF1] border border-[#E4E6EA] rounded-md focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus:ring-1 focus:ring-accent-600 focus:border-accent-600 transition"
        />

        {/* Global Quick Search Results overlay */}
        {showSearchResults && filteredCandidates.length > 0 && (
          <div className={cn(ui.surface, 'absolute top-11 left-0 z-50 w-96 py-2 text-xs')}>
            <div className="mb-1 border-b border-border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Matching Candidates ({filteredCandidates.length})
            </div>
            {filteredCandidates.map(c => (
              <button
                key={c.id}
                onMouseDown={() => {
                  onQuickSelectCandidate(c.id);
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                className="group flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent"
              >
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-accent-600 transition truncate">
                    {c.fullName}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Briefcase size={10} /> {c.appliedRole}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} /> {c.location}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-[#EDEEF1] text-gray-600 px-1.5 py-0.5 rounded font-mono font-medium shrink-0">
                  {c.status}
                </span>
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Recruitment calendar */}
        <Link
          href="/calendar"
          aria-label="Recruitment Calendar"
          title="Recruitment Calendar"
          className={cn(
            'rounded-md border border-[#E4E6EA] p-1.5 text-gray-500 transition hover:bg-accent hover:text-gray-700',
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
              'relative rounded-md border border-[#E4E6EA] p-1.5 text-gray-500 transition hover:bg-accent hover:text-gray-700',
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

        {/* Question library */}
        <Link
          href="/question-library"
          aria-label="Question Library"
          title="Question Library"
          className={cn(
            'rounded-md border border-[#E4E6EA] p-1.5 text-gray-500 transition hover:bg-accent hover:text-gray-700',
            ui.focusRing,
          )}
        >
          <Library size={14} />
        </Link>

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
