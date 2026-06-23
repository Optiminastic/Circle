'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { BRAND } from '@/lib/brand';
import {
  LayoutDashboard,
  Users,
  ListTodo,
  LogOut,
  BarChart3,
  Settings,
  Briefcase,
  UserSearch,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  userRole: 'HR' | 'Admin';
  setUserRole: (role: 'HR' | 'Admin') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Whether the off-canvas drawer is open on mobile (< md). */
  mobileOpen?: boolean;
  /** Close the mobile drawer (tapping a nav link / the backdrop / Esc). */
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed: isCollapsed,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState({
    employees: true,
    offboarding: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navItem = (href: string, label: string, icon: React.ReactNode) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={onCloseMobile}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? 'bg-[#FFFFFF] text-gray-900 font-semibold shadow-2xs ring-1 ring-[#ECEDF0]'
            : 'text-gray-600 hover:bg-[#F1F3F5] hover:text-gray-900'
        } ${isCollapsed ? 'md:justify-center' : ''}`}
        title={label}
      >
        <span
          className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent-600' : 'text-gray-500 group-hover:text-gray-700'}`}
        >
          {icon}
        </span>
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      id="app-sidebar"
      className={`bg-[#FBFBFC] h-screen select-none flex flex-col transition-transform duration-200
        fixed inset-y-0 left-0 z-50 w-64 shadow-xl
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:z-auto md:shrink-0 md:translate-x-0 md:shadow-none md:transition-all
        ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}
    >
      {/* Workspace switcher — height aligned to the main header */}
      <div className="flex h-14 shrink-0 items-center bg-[#FFFFFF] px-3">
        {!isCollapsed ? (
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-[#F1F3F5]"
            title={BRAND.name}
          >
            <Logo size={30} className="shrink-0" />
            <div className="min-w-0 flex-1 leading-tight">
              <h1 className="truncate font-display text-sm font-bold tracking-tight text-gray-900">
                {BRAND.name}
              </h1>
              <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                HR Operating System
              </p>
            </div>
            <ChevronDown size={14} className="shrink-0 text-gray-400" />
          </button>
        ) : (
          <Logo size={28} className="mx-auto shrink-0" />
        )}
      </div>

      {/* Navigation Stack */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Top-level shortcuts */}
        <div className="space-y-0.5">
          {navItem('/', 'Dashboard', <LayoutDashboard size={14} />)}
          {navItem('/jobs', 'Job Postings', <Briefcase size={14} />)}
          {navItem('/candidates', 'Candidates', <UserSearch size={14} />)}
        </div>

        {/* EMPLOYEES DIVISION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => toggleSection('employees')}
              className="flex w-full items-center justify-between px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400 transition hover:text-gray-600"
            >
              <span>Employees</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${expandedSections.employees ? '' : '-rotate-90'}`}
              />
            </button>
          )}
          {(isCollapsed || expandedSections.employees) && (
            <div className="space-y-0.5">
              {navItem('/onboarding', 'Onboarding Checklist', <ListTodo size={14} />)}
              {navItem('/directory', 'Employee Directory', <Users size={14} />)}
            </div>
          )}
        </div>

        {/* OFFBOARDING DIVISION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => toggleSection('offboarding')}
              className="flex w-full items-center justify-between px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400 transition hover:text-gray-600"
            >
              <span>Offboarding</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${expandedSections.offboarding ? '' : '-rotate-90'}`}
              />
            </button>
          )}
          {(isCollapsed || expandedSections.offboarding) && (
            <div className="space-y-0.5">{navItem('/offboarding', 'Exit Cases', <LogOut size={14} />)}</div>
          )}
        </div>

        {/* ANALYTICS & SETTINGS */}
        <div className="space-y-0.5 border-t border-[#E4E6EA] pt-3">
          {navItem('/reports', 'Enterprise Reports', <BarChart3 size={14} />)}
          {navItem('/settings', 'Global Settings', <Settings size={14} />)}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
