/**
 * Onboarding handoff — HR marks a hired candidate "arrived in office", which adds
 * them to the public candidate feed the external onboarding system fetches
 * (Curcle hosts the feed URL; nothing is pushed out).
 */

import { http } from '@/lib/http/client';

export interface MarkArrivedResult {
  ok: boolean;
  arrivedAt: string;
  updatedAt: string;
}

/** Mark the candidate arrived → they appear in the public candidate feed. */
export function markCandidateArrived(candidateId: string): Promise<MarkArrivedResult> {
  return http.post<MarkArrivedResult>(`/candidate-handoffs/${candidateId}/send`, {});
}
