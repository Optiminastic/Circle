/**
 * Cheap backend-reachability check — a few bytes, one `SELECT 1`-equivalent
 * check server-side — as opposed to downloading full tables just to learn
 * "is the server up". See DashboardShell.tsx and
 * docs/PERFORMANCE_IMPLEMENTATION_LOG.md Phase 2 §8's flagged-but-not-yet-
 * fixed note, and the live production report that followed it.
 */

import { http } from '@/lib/http/client';

export interface BackendHealth {
  status: string;
  database: string;
}

export function fetchBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  return http.get<BackendHealth>('/health', signal);
}
