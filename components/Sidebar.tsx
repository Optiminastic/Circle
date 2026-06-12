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
  Library,
} from 'lucide-react';

interface SidebarProps {
  userRole: 'HR' | 'Admin';
  setUserRole: (role: 'HR' | 'Admin') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed: isCollapsed }: SidebarProps) {
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
        className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs rounded-lg transition-all duration-150 group font-medium ${
          isActive
            ? 'bg-[#FFFFFF] text-gray-900 font-semibold shadow-sm'
            : 'text-gray-600 hover:bg-[#D2D2D6] hover:text-gray-900'
        }`}
        title={label}
      >
        <span
          className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-700' : 'text-gray-500 group-hover:text-gray-700'}`}
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
      className={`bg-[#ECEDF0] border-r border-[#D7DAE0] h-screen select-none flex flex-col shrink-0 transition-all duration-200 sticky top-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#D7DAE0] flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <Logo size={40} className="shrink-0" />
            <div className="leading-tight">
              <h1 className="text-base font-bold text-gray-900 tracking-tight font-display">{BRAND.name}</h1>
              <p className="text-[10px] text-gray-500 uppercase font-mono font-semibold tracking-wider">
                HR Operating System
              </p>
            </div>
          </div>
        ) : (
          <Logo size={34} className="mx-auto shrink-0" />
        )}
      </div>

      {/* Navigation Stack */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Top-level shortcuts */}
        <div className="space-y-0.5">
          {navItem('/', 'Dashboard', <LayoutDashboard size={14} />)}
          {navItem('/jobs', 'Job Postings', <Briefcase size={14} />)}
          {navItem('/candidates', 'Candidates', <UserSearch size={14} />)}
          {navItem('/question-library', 'Question Library', <Library size={14} />)}
        </div>

        {/* EMPLOYEES DIVISION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div
              onClick={() => toggleSection('employees')}
              className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase font-mono tracking-wider cursor-pointer hover:text-gray-600"
            >
              <span>Employees</span>
              <span className="text-[8px]">{expandedSections.employees ? '▼' : '▶'}</span>
            </div>
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
            <div
              onClick={() => toggleSection('offboarding')}
              className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase font-mono tracking-wider cursor-pointer hover:text-gray-600"
            >
              <span>Offboarding</span>
              <span className="text-[8px]">{expandedSections.offboarding ? '▼' : '▶'}</span>
            </div>
          )}
          {(isCollapsed || expandedSections.offboarding) && (
            <div className="space-y-0.5">{navItem('/offboarding', 'Exit Cases', <LogOut size={14} />)}</div>
          )}
        </div>

        {/* ANALYTICS & SETTINGS */}
        <div className="pt-2 border-t border-[#D7DAE0] space-y-0.5">
          {navItem('/reports', 'Enterprise Reports', <BarChart3 size={14} />)}
          {navItem('/settings', 'Global Settings', <Settings size={14} />)}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
