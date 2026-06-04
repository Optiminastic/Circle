'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Plus,
  HelpCircle,
  Check,
  MapPin,
  Briefcase,
  Mail,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Candidate } from '../types';
import { useAuth, displayName, initials } from '@/store/auth-store';
import { AccessControlModal } from './AccessControlModal';

interface HeaderProps {
  onSearch: (query: string) => void;
  onAddCandidateClick: () => void;
  userRole: 'HR' | 'Admin';
  candidatesList: Candidate[];
  onQuickSelectCandidate: (candidateId: string) => void;
}

export function Header({
  onSearch,
  onAddCandidateClick,
  userRole,
  candidatesList,
  onQuickSelectCandidate,
}: HeaderProps) {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

  const notifications = [
    {
      id: 1,
      text: 'Sophia Henderson completed Candidate IQ Test (Passed 85%)',
      time: '2h ago',
      unread: true,
    },
    { id: 2, text: 'BGV Request triggered for David Hassel', time: '1d ago', unread: false },
    { id: 3, text: 'Interview Feedback pending for Candidate Arjun Mehta', time: '3d ago', unread: false },
  ];

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
      className="bg-[#FFFFFF] border-b border-[#EAEAEC] h-14 px-6 flex items-center justify-between sticky top-0 z-50 select-none"
    >
      {/* Global Search Bar */}
      <div className="relative w-80">
        <span className="absolute left-3 top-2.5 text-gray-400">
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
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F1F1F2] border border-[#EAEAEC] rounded-md focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-accent-600 focus:border-accent-600 transition"
        />

        {/* Global Quick Search Results overlay */}
        {showSearchResults && filteredCandidates.length > 0 && (
          <div className="absolute top-11 left-0 w-96 bg-[#FFFFFF] border border-[#EAEAEC] rounded-md shadow-lg py-2 z-50 text-xs">
            <div className="px-3 py-1 font-semibold text-[10px] text-gray-400 font-mono uppercase tracking-wider border-b border-[#EAEAEC] mb-1">
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
                className="w-full text-left px-3 py-2 hover:bg-[#F1F1F2] flex items-center justify-between group"
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
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-medium shrink-0">
                  {c.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Help Status label */}
        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Opti Corp Setup
        </span>

        {/* Quick Action additions button */}
        {userRole === 'HR' && (
          <button
            id="btn-quick-add-candidate"
            onClick={onAddCandidateClick}
            className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white font-medium text-xs px-3 py-1.5 rounded-md shadow-sm cursor-pointer transition"
          >
            <Plus size={12} />
            <span>Add Candidate</span>
          </button>
        )}

        {/* Notification bell triggers */}
        <div className="relative">
          <button
            id="btn-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 hover:bg-[#F1F1F2] border border-[#EAEAEC] rounded-md text-gray-500 hover:text-gray-700 cursor-pointer relative transition"
          >
            <Bell size={14} />
            {notifications.some(n => n.unread) && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-10 w-80 bg-[#FFFFFF] border border-[#EAEAEC] rounded-md shadow-lg py-2 z-50 text-xs">
              <div className="px-4 py-2 font-semibold text-gray-900 border-b border-[#EAEAEC] flex justify-between items-center">
                <span>System Notifications</span>
                <span className="text-[10px] text-accent-600 font-normal">Mark all read</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-[#EAEAEC] hover:bg-[#F1F1F2] last:border-none transition ${n.unread ? 'bg-accent-50/30' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span
                        className={`font-medium ${n.unread ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}
                      >
                        {n.text}
                      </span>
                      {n.unread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-600 shrink-0 mt-1"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block font-mono">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Help icon */}
        <button className="p-1.5 hover:bg-[#F1F1F2] border border-[#EAEAEC] rounded-md text-gray-500 cursor-pointer transition">
          <HelpCircle size={14} />
        </button>

        {/* Active Profile */}
        <div className="relative border-l border-[#EAEAEC] pl-4">
          <button
            id="btn-profile-menu"
            onClick={() => setShowProfile(s => !s)}
            onBlur={() => setTimeout(() => setShowProfile(false), 200)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-500 to-accent-700 flex items-center justify-center text-white text-xs font-bold font-display">
              {initials(user?.email)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-900 group-hover:text-accent-600 transition">
                {user?.name || displayName(user?.email)}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                {isAdmin ? 'Administrator' : 'HR Specialist'}
              </p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-60 bg-white border border-[#EAEAEC] rounded-lg shadow-lg py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#EAEAEC]">
                <p className="font-semibold text-gray-900 truncate">
                  {user?.name || displayName(user?.email)}
                  {isAdmin && (
                    <span className="ml-1.5 text-[9px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full align-middle">
                      ADMIN
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-400 font-mono truncate flex items-center gap-1 mt-0.5">
                  <Mail size={10} /> {user?.email}
                </p>
              </div>
              {isAdmin && (
                <button
                  id="btn-manage-access"
                  onMouseDown={() => setShowAccess(true)}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-600 hover:bg-[#F1F1F2] hover:text-accent-600 cursor-pointer transition font-medium"
                >
                  <ShieldCheck size={13} /> Manage access
                </button>
              )}
              <button
                id="btn-logout"
                onMouseDown={onLogout}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-600 hover:bg-red-50 hover:text-red-600 cursor-pointer transition font-medium"
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </div>

        {showAccess && <AccessControlModal onClose={() => setShowAccess(false)} />}
      </div>
    </header>
  );
}
export default Header;
