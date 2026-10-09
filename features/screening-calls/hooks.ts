'use client';

/**
 * AI screening calls.
 *
 * The result does not arrive in the response that starts the call — the voice
 * provider reports it minutes later over a webhook. Nothing in this session
 * can know when that lands, so the only way to see it is to poll.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query/keys';
import {
  isCallActive,
  listScreeningCalls,
  startScreeningCall,
  type ScreeningCall,
  type ScreeningCallMode,
} from '@/lib/api/screening-calls';

/** Fast enough that HR sees the verdict land while still looking at the page.
 *  It only runs while a call is actually in flight. */
const ACTIVE_POLL_MS = 5_000;

export function useScreeningCalls(candidateId?: string) {
  return useQuery({
    queryKey: qk.screeningCalls.forCandidate(candidateId ?? ''),
    queryFn: () => listScreeningCalls(candidateId as string),
    enabled: Boolean(candidateId),
    // Only while something is with the provider, then stop. A completed call
    // carries up to 50k characters of transcript, and polling that on every
    // open candidate tab forever would be a lot of nothing.
    refetchInterval: query =>
      (query.state.data ?? []).some(call => isCallActive(call.status)) ? ACTIVE_POLL_MS : false,
  });
}

export function useStartScreeningCall() {
  const qc = useQueryClient();
  return useMutation({
    // Takes the id as an argument rather than closing over it, so the same
    // hook serves the candidate list and the candidate page.
    mutationFn: ({ candidateId, mode }: { candidateId: string; mode: ScreeningCallMode }) =>
      startScreeningCall(candidateId, mode),
    onSuccess: (call, { candidateId }) => {
      // Show it immediately — the server mints the id, the join URL and the
      // timestamps, so there was nothing to predict optimistically.
      qc.setQueryData<ScreeningCall[]>(qk.screeningCalls.forCandidate(candidateId), prev => [
        call,
        ...(prev ?? []),
      ]);
      qc.invalidateQueries({ queryKey: qk.screeningCalls.forCandidate(candidateId) });
    },
  });
}
