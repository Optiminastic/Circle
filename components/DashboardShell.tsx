'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ModalHost } from './ModalHost';
import { CommandPalette } from './CommandPalette';
import { useUiStore } from '@/store/ui-store';
import { useAuth } from '@/store/auth-store';
import { useCandidates } from '@/features/candidates/hooks';
import { useEmployees } from '@/features/employees/hooks';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { userRole, setUserRole, setSearchQuery, setSelectedCandidateId } = useUiStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed(v => !v);

  // Access gate: bounce unauthenticated visitors to the login screen.
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  // Perceived performance: once signed in, warm the cache for every section in
  // the background so navigating the sidebar renders instantly from cache
  // (with React Query refreshing stale data silently).
  const qc = useQueryClient();
  useEffect(() => {
    if (!ready || !user) return;
    const targets: [readonly unknown[], () => Promise<unknown>][] = [
      [qk.jobs.all, () => repositories.jobs.list()],
      [qk.interviews.all, () => repositories.interviews.list()],
      [qk.iqTests.all, () => repositories.iqTests.list()],
      [qk.testInvites.all, () => repositories.testInvites.list()],
      [qk.assignments.all, () => repositories.assignments.list()],
      [qk.schedules.all, () => repositories.schedules.list()],
      [qk.bgvs.all, () => repositories.bgvs.list()],
      [qk.onboarding.all, () => repositories.onboarding.list()],
      [qk.assets.all, () => repositories.assets.list()],
      [qk.emailTemplates.all, () => repositories.emailTemplates.list()],
      [qk.sentEmails.all, () => repositories.sentEmails.list()],
      [qk.offboarding.all, () => repositories.offboarding.list()],
    ];
    for (const [queryKey, queryFn] of targets) {
      qc.prefetchQuery({ queryKey, queryFn, staleTime: 30_000 });
    }
  }, [ready, user, qc]);

  // Bootstrap status comes from the primary queries — no manual loading flags.
  const candidates = useCandidates();
  const employees = useEmployees();
  const loading = candidates.isLoading || employees.isLoading;
  const error = candidates.isError || employees.isError;

  // Hold rendering until we know the auth state (avoids a flash of the dashboard).
  if (!ready || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F1F3F5]">
        <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onQuickSelectCandidate = (id: string) => {
    setSelectedCandidateId(id);
    router.push('/candidates');
  };

  return (
    <div
      id="master-viewport"
      className="flex h-screen overflow-hidden bg-[#F1F3F5] font-sans antialiased text-gray-950"
    >
      <Sidebar
        userRole={userRole}
        setUserRole={setUserRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header
          onSearch={setSearchQuery}
          candidatesList={candidates.data ?? []}
          onQuickSelectCandidate={onQuickSelectCandidate}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-[#F1F3F5]">
          {error ? (
            <div className="max-w-md mx-auto mt-20 text-center">
              <div className="bg-[#FFFFFF] border border-red-200 rounded-xl p-6">
                <p className="text-sm font-semibold text-red-600">Service is down!</p>
                <p className="text-xs text-gray-500 mt-2">
                  Please contact the developer team.
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">Loading…</span>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <ModalHost />
      <CommandPalette />
    </div>
  );
}

export default DashboardShell;
