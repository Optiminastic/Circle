'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClaimDetails } from '@/lib/bgv-claim-fields';
import { isCheckRunning } from '@/lib/bgv-services';
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
  /** The candidate already had an OnGrid individual, so this re-sent their
   *  documents to it rather than creating a second record of the same person. */
  reused?: boolean;
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

/** One check OnGrid is actually running, with OnGrid's own state for it. */
export interface OngridCheckStatus {
  code: string;
  status: string;
}

export interface OngridStatusResult {
  ok: boolean;
  individualId?: string;
  overallStatus?: string;
  checks?: OngridCheckStatus[];
  reportUrl?: string;
  reason?: string;
}

async function ongridStatus(candidateId: string): Promise<OngridStatusResult> {
  const res = await fetch(
    `${apiBase()}/api/bgv/${encodeURIComponent(candidateId)}/ongrid-status`,
    { credentials: 'include' },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Could not read the verification status (${res.status})`);
  }
  return res.json();
}

/**
 * What OnGrid is actually running for this candidate.
 *
 * Read from OnGrid rather than from our own record, because the two disagree:
 * `bgv.services` is what HR asked for, and checks chosen before the
 * per-offering endpoints existed were saved there without ever being started.
 * This is what decides whether verification is under way, so it has to be the
 * side that is true.
 */
/** Slow on purpose: a background check takes days, and every poll is a call to
 *  OnGrid. This is only to spare HR a manual reload, not to catch a result the
 *  second it lands. */
const ONGRID_STATUS_POLL_MS = 120_000;

export function useOngridStatus(candidateId?: string, enabled = true) {
  return useQuery({
    queryKey: ['ongrid-status', candidateId] as const,
    queryFn: () => ongridStatus(candidateId as string),
    enabled: Boolean(candidateId) && enabled,
    // Checks take days; polling hard would spend OnGrid calls for nothing. So
    // poll only while something is actually with them, and stop the moment the
    // last one finishes - otherwise a result sits unseen until someone happens
    // to reload the page.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: query => {
      const data = query.state.data;
      const running = data?.ok ? (data.checks ?? []).some(c => isCheckRunning(c.status)) : false;
      return running ? ONGRID_STATUS_POLL_MS : false;
    },
  });
}
