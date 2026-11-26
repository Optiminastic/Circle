'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardOverview, fetchUpcomingInterviews } from '@/lib/api/stats';

const qk = {
  overview: ['stats', 'overview'] as const,
  upcomingInterviews: (limit: number) => ['stats', 'upcoming-interviews', limit] as const,
};

/** The 4 KPI cards — see docs/PERFORMANCE_AUDIT.md P0-3. 60s staleTime: these
 *  are aggregate counts, not data someone is actively editing in this same
 *  session — no need to treat them as always-stale. */
export function useDashboardOverview() {
  return useQuery({
    queryKey: qk.overview,
    queryFn: ({ signal }) => fetchDashboardOverview(signal),
    staleTime: 60_000,
  });
}

export function useUpcomingInterviews(limit = 6) {
  return useQuery({
    queryKey: qk.upcomingInterviews(limit),
    queryFn: ({ signal }) => fetchUpcomingInterviews(limit, signal),
    staleTime: 60_000,
  });
}
