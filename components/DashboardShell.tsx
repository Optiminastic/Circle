'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { ModalHost } from './ModalHost';
import { CommandPalette } from './CommandPalette';
import { BrandLoading } from './LogoLoader';
import { useUiStore } from '@/store/ui-store';
import { useAuth } from '@/store/auth-store';
import { fetchBackendHealth } from '@/lib/api/health';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';

const HEALTH_QUERY_KEY = ['backend-health'] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const { userRole, setUserRole } = useUiStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed(v => !v);

  // Off-canvas nav drawer for mobile (< md). Separate from the desktop collapse.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  // Close the drawer whenever the route changes (tapping a nav link navigates).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Access gate: bounce unauthenticated visitors to the login screen.
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  // Perceived performance: once signed in, warm the cache for every section in
  // the background so navigating the sidebar renders instantly from cache
  // (with React Query refreshing stale data silently).
  //
  // Staggered + delayed, not fired all at once: live production network
  // timing (2026-11-26) showed all 16 of these full-table requests hitting
  // the backend in the same ~10ms window, saturating its DB connection pool
  // (6 + 4 overflow per uvicorn worker) and dragging the DASHBOARD'S OWN
  // critical-path queries (/api/stats/overview, /api/stats/upcoming-interviews)
  // from a normal <1s down to 2.8s/5.6s, with several of the warm-up requests
  // themselves queueing 9-14s behind the contention. A short delay lets the
  // current page's own queries claim connections first; the concurrency cap
  // keeps the warm-up from reproducing the same stampede once it starts. See
  // docs/PERFORMANCE_IMPLEMENTATION_LOG.md Phase 3 (post-merge production
  // report) for the full timing capture.
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
      [qk.assessmentBanks.all, () => repositories.assessmentBanks.list()],
      [qk.interviewBanks.all, () => repositories.interviewBanks.list()],
      [qk.screeningBanks.all, () => repositories.screeningBanks.list()],
      [qk.iqBank.all, () => repositories.iqBank.list()],
    ];
    const WARMUP_DELAY_MS = 2000;
    const WARMUP_CONCURRENCY = 3;
    let cancelled = false;
    const timer = setTimeout(async () => {
      for (let i = 0; i < targets.length; i += WARMUP_CONCURRENCY) {
        if (cancelled) return;
        const batch = targets.slice(i, i + WARMUP_CONCURRENCY);
        await Promise.allSettled(
          batch.map(([queryKey, queryFn]) => qc.prefetchQuery({ queryKey, queryFn, staleTime: 30_000 }))
        );
      }
    }, WARMUP_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, user, qc]);

  // Bootstrap status: is the server reachable? A cheap /api/health check
  // (a few bytes, one lightweight DB ping server-side) — NOT the full
  // candidates/employees tables this used to fetch just to read
  // .isLoading/.isError/.isFetching off of (the data itself was never used
  // here). That meant every page load blocked on two full-table fetches
  // before showing ANY content, on every route in the app. See
  // docs/PERFORMANCE_AUDIT.md P0-3 and the live production report that
  // caught this (the dashboard's "Loading…" never seemed to resolve for a
  // candidates/employees table that had grown large enough).
  const health = useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: ({ signal }) => fetchBackendHealth(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false, // the self-heal poll below already re-tries every 5s
  });
  const loading = health.isLoading;
  const error = health.isError || health.data?.database === 'down';
  const retrying = health.isFetching;

  // Re-fetch the bootstrap query. Used by the "Try again" button and the
  // self-heal poll below.
  const retry = useCallback(() => {
    qc.refetchQueries({ queryKey: HEALTH_QUERY_KEY });
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
      <div className="h-screen bg-surface-sunken">
        <BrandLoading label="" />
      </div>
    );
  }

  return (
    <div
      id="master-viewport"
      className="flex h-screen overflow-hidden bg-surface-sunken font-sans antialiased text-gray-950"
    >
      <Sidebar
        userRole={userRole}
        setUserRole={setUserRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        mobileOpen={mobileNavOpen}
        onCloseMobile={closeMobileNav}
      />

      {/* Backdrop for the mobile drawer (md and up never renders it). */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobileNav}
          aria-hidden
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-surface">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 min-h-0 bg-surface-sunken rounded-tl-lg border-t border-l border-line">
          {error ? (
            <div className="max-w-md mx-auto mt-20 text-center">
              <div className="bg-surface border border-red-200 rounded-md p-6">
                <p className="text-sm font-semibold text-red-600">Service is down!</p>
                <p className="text-xs text-gray-500 mt-2">
                  Couldn&apos;t reach the server. It will reconnect automatically — or
                  retry now.
                </p>
                <button
                  type="button"
                  onClick={retry}
                  disabled={retrying}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-secondary/50 disabled:opacity-60"
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
