'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { BRAND } from '@/lib/brand';
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  ListTodo,
  LogOut,
  BarChart3,
  Settings,
  ShieldCheck,
  Briefcase,
  UserSearch,
} from 'lucide-react';

interface SidebarProps {
  userRole: 'HR' | 'Admin';
  setUserRole: (role: 'HR' | 'Admin') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ userRole, setUserRole, collapsed: isCollapsed }: SidebarProps) {
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
            ? 'bg-[#F7F4EE] text-gray-900 font-semibold shadow-sm'
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
      className={`bg-[#E2DDD2] border-r border-[#CFC8BA] h-screen select-none flex flex-col shrink-0 transition-all duration-200 sticky top-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#CFC8BA] flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <Logo size={28} className="shrink-0" />
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight font-display">{BRAND.name}</h1>
              <p className="text-[10px] text-gray-500 uppercase font-mono font-semibold tracking-wider">
                HR Operating System
              </p>
            </div>
          </div>
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
          {navItem('/calendar', 'Recruitment Calendar', <CalendarRange size={14} />)}
          {navItem('/candidates', 'Candidates', <UserSearch size={14} />)}
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
        <div className="pt-2 border-t border-[#CFC8BA] space-y-0.5">
          {navItem('/reports', 'Enterprise Reports', <BarChart3 size={14} />)}
          {navItem('/settings', 'Global Settings', <Settings size={14} />)}
        </div>
      </div>

      {/* Role Manager Switcher */}
      <div className="p-3 border-t border-[#CFC8BA] bg-[#E2DDD2] flex flex-col gap-2">
        {!isCollapsed ? (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-gray-500 font-mono font-semibold uppercase tracking-wider">
              Access Scope
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <ShieldCheck
                  size={12}
                  className={userRole === 'Admin' ? 'text-purple-600' : 'text-emerald-600'}
                />
                {userRole === 'Admin' ? 'Admin / Leader' : 'HR Specialist'}
              </span>
              <button
                id="btn-toggle-role"
                onClick={() => setUserRole(userRole === 'HR' ? 'Admin' : 'HR')}
                className="text-[9px] bg-[#F7F4EE] border border-[#DAD4C8] hover:bg-[#E6E1D8] text-gray-900 px-1.5 py-0.5 rounded font-mono font-bold uppercase cursor-pointer"
              >
                SWAP
              </button>
            </div>
          </div>
        ) : (
          <button
            id="btn-toggle-role-collapsed"
            onClick={() => setUserRole(userRole === 'HR' ? 'Admin' : 'HR')}
            className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full hover:bg-[#E2DDD2] transition ${userRole === 'Admin' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}
            title="Toggle system view role"
          >
            <ShieldCheck size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
