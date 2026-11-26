/**
 * Dashboard aggregate endpoints — computed server-side (COUNT/conditional
 * aggregates), replacing the full-table `useCandidates`/`useEmployees`/
 * `useJobs`/`useInterviews`/`useOffboarding` fetches DashboardView used to
 * derive these same numbers from client-side. See
 * docs/PERFORMANCE_AUDIT.md P0-3 and circle-be/app/api/routes/stats.py.
 */

import { http } from '@/lib/http/client';
import { Candidate, Interview } from '@/types';

export interface DashboardOverview {
  jobs: { total: number; open: number };
  candidates: { active: number; interviewing: number };
  employees: { total: number; active: number; onProbation: number };
  offboarding: { activeExits: number; onNotice: number };
}

export interface UpcomingInterviewPair {
  interview: Interview;
  /** The candidate's CURRENT record, already joined server-side — `null`
   *  when the candidate has since been deleted. */
  candidate: Candidate | null;
}

export function fetchDashboardOverview(signal?: AbortSignal): Promise<DashboardOverview> {
  return http.get<DashboardOverview>('/stats/overview', signal);
}

export function fetchUpcomingInterviews(
  limit = 6,
  signal?: AbortSignal,
): Promise<UpcomingInterviewPair[]> {
  return http.get<UpcomingInterviewPair[]>(`/stats/upcoming-interviews?limit=${limit}`, signal);
}
