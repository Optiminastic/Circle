'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  Clock,
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarRange,
  BrainCircuit,
  ListTodo,
  FolderLock,
  Boxes,
  TrendingUp,
  LogOut,
  MessageSquare,
  Gauge,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserSearch,
  FileText,
  Briefcase,
} from 'lucide-react';

interface SidebarProps {
  userRole: 'HR' | 'Admin';
  setUserRole: (role: 'HR' | 'Admin') => void;
}

export function Sidebar({ userRole, setUserRole }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    recruitment: true,
    employees: true,
    performance: true,
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
            ? 'bg-white text-gray-900 font-semibold'
            : 'text-gray-500 hover:bg-[#DBDEE3] hover:text-gray-900'
        }`}
        title={label}
      >
        <span
          className={`w-4 h-4 shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}
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
      className={`bg-[#E4E6EA] border-r border-[#EAEAEC] h-screen select-none flex flex-col shrink-0 transition-all duration-200 sticky top-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#EAEAEC] flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <Logo size={28} className="shrink-0" />
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight font-display">Curcle</h1>
              <p className="text-[10px] text-gray-400 uppercase font-mono font-semibold tracking-wider">
                HR Operating System
              </p>
            </div>
          </div>
        ) : (
          <Logo size={28} className="mx-auto shrink-0" />
        )}

        <button
          id="btn-sidebar-collapse"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 shrink-0"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
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

        {/* RECRUITMENT DIVISION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div
              onClick={() => toggleSection('recruitment')}
              className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase font-mono tracking-wider cursor-pointer hover:text-gray-600"
            >
              <span>Recruitment</span>
              <span className="text-[8px]">{expandedSections.recruitment ? '▼' : '▶'}</span>
            </div>
          )}
          {(isCollapsed || expandedSections.recruitment) && (
            <div className="space-y-0.5">
              {navItem('/hr-calls', 'HR Introductory Calls', <Clock size={14} />)}
              {navItem('/iq-tests', 'IQ Test Modules', <BrainCircuit size={14} />)}
              {navItem('/assignments', 'Role Assignments', <FileText size={14} />)}
              {navItem('/interviews', 'Interviews & Panel', <CalendarDays size={14} />)}
            </div>
          )}
        </div>

        {/* EMPLOYEES DIVISION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div
              onClick={() => toggleSection('employees')}
              className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase font-mono tracking-wider cursor-pointer hover:text-gray-600"
            >
              <span>Employees</span>
              <span className="text-[8px]">{expandedSections.employees ? '▼' : '▶'}</span>
            </div>
          )}
          {(isCollapsed || expandedSections.employees) && (
            <div className="space-y-0.5">
              {navItem('/onboarding', 'Onboarding Checklist', <ListTodo size={14} />)}
              {navItem('/directory', 'Employee Directory', <Users size={14} />)}
              {navItem('/credentials', 'System Credentials', <FolderLock size={14} />)}
              {navItem('/assets', 'Hardware Assets', <Boxes size={14} />)}
            </div>
          )}
        </div>

        {/* PERFORMANCE DIVISION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div
              onClick={() => toggleSection('performance')}
              className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase font-mono tracking-wider cursor-pointer hover:text-gray-600"
            >
              <span>Performance</span>
              <span className="text-[8px]">{expandedSections.performance ? '▼' : '▶'}</span>
            </div>
          )}
          {(isCollapsed || expandedSections.performance) && (
            <div className="space-y-0.5">
              {navItem('/performance', 'Task Performance', <Gauge size={14} />)}
              {navItem('/appraisals', 'Reviews & Feedback', <TrendingUp size={14} />)}
              {navItem('/communication', 'Communication', <MessageSquare size={14} />)}
            </div>
          )}
        </div>

        {/* OFFBOARDING DIVISION */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div
              onClick={() => toggleSection('offboarding')}
              className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase font-mono tracking-wider cursor-pointer hover:text-gray-600"
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
        <div className="pt-2 border-t border-[#EAEAEC] space-y-0.5">
          {navItem('/reports', 'Enterprise Reports', <BarChart3 size={14} />)}
          {navItem('/settings', 'Global Settings', <Settings size={14} />)}
        </div>
      </div>

      {/* Role Manager Switcher */}
      <div className="p-3 border-t border-[#EAEAEC] bg-[#DDE0E5] flex flex-col gap-2">
        {!isCollapsed ? (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-gray-400 font-mono font-semibold uppercase tracking-wider">
              Access Scope
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <ShieldCheck
                  size={12}
                  className={userRole === 'Admin' ? 'text-indigo-600' : 'text-emerald-600'}
                />
                {userRole === 'Admin' ? 'Admin / Leader' : 'HR Specialist'}
              </span>
              <button
                id="btn-toggle-role"
                onClick={() => setUserRole(userRole === 'HR' ? 'Admin' : 'HR')}
                className="text-[9px] bg-[#FFFFFF] border border-[#EAEAEC] hover:bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded font-mono font-bold uppercase cursor-pointer"
              >
                SWAP
              </button>
            </div>
          </div>
        ) : (
          <button
            id="btn-toggle-role-collapsed"
            onClick={() => setUserRole(userRole === 'HR' ? 'Admin' : 'HR')}
            className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full hover:bg-gray-200 transition ${userRole === 'Admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}
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
