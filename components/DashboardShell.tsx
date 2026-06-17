'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { ModalHost } from './ModalHost';
import { CommandPalette } from './CommandPalette';
import { BrandLoading } from './LogoLoader';
import { useUiStore } from '@/store/ui-store';
import { useAuth } from '@/store/auth-store';
import { useCandidates } from '@/features/candidates/hooks';
import { useEmployees } from '@/features/employees/hooks';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { userRole, setUserRole } = useUiStore();
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
  const retrying = candidates.isFetching || employees.isFetching;

  // Re-fetch the bootstrap queries. Used by the "Try again" button and the
  // self-heal poll below.
  const retry = useCallback(() => {
    qc.refetchQueries({ queryKey: qk.candidates.all });
    qc.refetchQueries({ queryKey: qk.employees.all });
  }, [qc]);

  // Self-heal: the backend may come up after the frontend (e.g. started a few
  // seconds/minutes later). While errored, poll so the dashboard recovers on
  // its own once the API is reachable — no manual reload needed.
  useEffect(() => {
    if (!error) return;
    const id = setInterval(retry, 5000);
    return () => clearInterval(id);
  }, [error, retry]);

  // Hold rendering until we know the auth state (avoids a flash of the dashboard).
  if (!ready || !user) {
    return (
      <div className="h-screen bg-[#F1F3F5]">
        <BrandLoading label="" />
      </div>
    );
  }

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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#FFFFFF]">
        <Header sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-[#F1F3F5] rounded-tl-2xl border-t border-l border-[#E4E6EA]">
          {error ? (
            <div className="max-w-md mx-auto mt-20 text-center">
              <div className="bg-[#FFFFFF] border border-red-200 rounded-xl p-6">
                <p className="text-sm font-semibold text-red-600">Service is down!</p>
                <p className="text-xs text-gray-500 mt-2">
                  Couldn&apos;t reach the server. It will reconnect automatically — or
                  retry now.
                </p>
                <button
                  type="button"
                  onClick={retry}
                  disabled={retrying}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-card px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-secondary/50 disabled:opacity-60"
                >
                  {retrying ? 'Retrying…' : 'Try again'}
                </button>
              </div>
            </div>
          ) : loading ? (
            <BrandLoading />
          ) : (
            <>
              <Breadcrumbs />
              {children}
            </>
          )}
        </main>
      </div>

      <ModalHost />
      <CommandPalette />
    </div>
  );
}

export default DashboardShell;
