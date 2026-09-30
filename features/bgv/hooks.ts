'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ClaimDetails } from '@/lib/bgv-claim-fields';
import { apiBase } from '@/lib/api-base';
import { qk } from '@/lib/query/keys';

/** Result of pushing a candidate into OnGrid (BGV phase 1 — onboard only). */
export interface OngridOnboardResult {
  ok: boolean;
  individualId?: string;
  documents?: { docType: string; route?: string; status: string }[];
  response?: {
    id?: string;
    name?: string;
    city?: string;
    phone?: string;
    gender?: string;
    currentAddress?: string;
  };
  reason?: string;
}

async function ongridOnboard(candidateId: string): Promise<OngridOnboardResult> {
  const res = await fetch(
    `${apiBase()}/api/bgv/${encodeURIComponent(candidateId)}/ongrid-onboard`,
    { method: 'POST', credentials: 'include' },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not reach OnGrid (${res.status})`);
  }
  return res.json();
}

/**
 * Onboard the candidate to OnGrid: create the individual + push their accepted
 * document images. Verifications are triggered by HR in OnGrid's portal, not here.
 * The backend persists the result onto the bgvs record, so we refresh that.
 */
export function useOngridOnboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) => ongridOnboard(candidateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bgvs.all }),
  });
}


/** Result of asking OnGrid to actually run the selected checks. */
export interface OngridVerifyResult {
  ok: boolean;
  individualId?: string;
  requested?: string[];
  reason?: string;
}

async function ongridVerify(
  candidateId: string,
  services: string[],
  details?: ClaimDetails,
): Promise<OngridVerifyResult> {
  const res = await fetch(
    `${apiBase()}/api/bgv/${encodeURIComponent(candidateId)}/ongrid-verify`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services, details }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not reach OnGrid (${res.status})`);
  }
  return res.json();
}

/**
 * Request the background checks from OnGrid.
 *
 * Distinct from `useOngridOnboard`, which only records the person and uploads
 * their documents - that endpoint silently ignores the checks, so onboarding
 * alone never asked OnGrid to verify anything.
 */
export function useOngridVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      services,
      details,
    }: {
      candidateId: string;
      services: string[];
      /** What HR filled in for the claim-backed checks; wins over whatever the
       *  candidate saved, since HR has just reviewed it. */
      details?: ClaimDetails;
    }) => ongridVerify(candidateId, services, details),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bgvs.all }),
  });
}
