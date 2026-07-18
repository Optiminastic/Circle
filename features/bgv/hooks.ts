'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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

