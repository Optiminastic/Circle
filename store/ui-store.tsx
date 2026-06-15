'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Client-only UI state — deliberately separate from server state (TanStack Query).
 * Holds the access-role switch, global search text, and which entity drawer is open.
 */

export type UserRole = 'HR' | 'Admin';

export type CandidateTab = 'profile' | 'evaluation' | 'bgv';

interface UiState {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCandidateId: string | null;
  setSelectedCandidateId: (id: string | null) => void;
  selectedCandidateTab: CandidateTab;
  /** Open a candidate's file directly on a specific tab (e.g. BGV) from anywhere. */
  openCandidate: (id: string, tab?: CandidateTab) => void;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  /** Whether the global ⌘K command/search palette is open. */
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

const UiStateContext = createContext<UiState | null>(null);

export function UiStateProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>('HR');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidateId, _setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCandidateTab, setSelectedCandidateTab] = useState<CandidateTab>('profile');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  const setSelectedCandidateId = (id: string | null) => {
    setSelectedCandidateTab('profile');
    _setSelectedCandidateId(id);
  };

  const openCandidate = (id: string, tab: CandidateTab = 'profile') => {
    setSelectedCandidateTab(tab);
    _setSelectedCandidateId(id);
  };

  const value = useMemo<UiState>(
    () => ({
      userRole,
      setUserRole,
      searchQuery,
      setSearchQuery,
      selectedCandidateId,
      setSelectedCandidateId,
      selectedCandidateTab,
      openCandidate,
      selectedEmployeeId,
      setSelectedEmployeeId,
      commandOpen,
      setCommandOpen,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userRole, searchQuery, selectedCandidateId, selectedCandidateTab, selectedEmployeeId, commandOpen],
  );

  return <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>;
}

export function useUiStore(): UiState {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error('useUiStore must be used within a UiStateProvider');
  return ctx;
}
