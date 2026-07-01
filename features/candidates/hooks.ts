'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BGVRequirement, Candidate, CandidateStatus, FitRating, OnboardingChecklist } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';
import { buildBgvForCandidate, buildOnboardingForCandidate } from '@/services/candidate.service';

export function useCandidates() {
  return useQuery({ queryKey: qk.candidates.all, queryFn: () => repositories.candidates.list() });
}

export function useBgvs() {
  return useQuery({ queryKey: qk.bgvs.all, queryFn: () => repositories.bgvs.list() });
}

export function useCandidateMutations() {
  const qc = useQueryClient();

  // NOTE: BGV is intentionally NOT auto-created here — background verification
  // only starts after the candidate clears the interview, triggered by HR
  // (see useStartBgv + the gate in CandidateProfileModal's BGV tab).
  const create = useMutation({
    mutationFn: async (candidate: Candidate) => {
      await repositories.candidates.create(candidate);
      return candidate;
    },
    ...optimisticOptions<Candidate, Candidate>(
      qc,
      qk.candidates.all,
      candidate => listOps.prepend(candidate),
      [qk.candidates.all],
    ),
  });

  const update = useMutation({
    mutationFn: async (candidate: Candidate) => {
      await repositories.candidates.update(candidate.id, candidate);
      if (candidate.status === 'Shortlisted') {
        const existing = qc.getQueryData<OnboardingChecklist[]>(qk.onboarding.all) ?? [];
        if (!existing.some(o => o.candidateId === candidate.id)) {
          await repositories.onboarding.create(buildOnboardingForCandidate(candidate));
        }
      }
      return candidate;
    },
    ...optimisticOptions<Candidate, Candidate>(
      qc,
      qk.candidates.all,
      candidate => listOps.replaceBy(c => c.id === candidate.id, candidate),
      [qk.candidates.all, qk.onboarding.all],
    ),
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CandidateStatus }) =>
      repositories.candidates.patch(id, { status }),
    ...optimisticOptions<{ id: string; status: CandidateStatus }, Candidate>(
      qc,
      qk.candidates.all,
      ({ id, status }) => listOps.mergeBy<Candidate>(c => c.id === id, { status }),
    ),
  });

  // Deleting a candidate cascades on the backend (interviews, schedules, tests,
  // doc-requests, BGV, onboarding, handoff, documents). Invalidate those queries
  // too so dependent views (e.g. the dashboard's Upcoming Interviews) refresh and
  // don't keep showing the removed candidate.
  const remove = useMutation({
    mutationFn: (id: string) => repositories.candidates.remove(id),
    ...optimisticOptions<string, Candidate>(
      qc,
      qk.candidates.all,
      id => listOps.removeBy(c => c.id === id),
      [
        qk.candidates.all,
        qk.interviews.all,
        qk.schedules.all,
        qk.iqTests.all,
        qk.testInvites.all,
        qk.assignments.all,
        qk.docRequests.all,
        qk.onboarding.all,
        qk.bgvs.all,
      ],
    ),
  });

  // HR override of the auto-computed screening fit rating.
  const setFit = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: FitRating }) =>
      repositories.candidates.patch(id, { fitRatingOverride: rating }),
    ...optimisticOptions<{ id: string; rating: FitRating }, Candidate>(
      qc,
      qk.candidates.all,
      ({ id, rating }) => listOps.mergeBy<Candidate>(c => c.id === id, { fitRatingOverride: rating }),
    ),
  });

  return { create, update, move, remove, setFit };
}

export function useUpdateBgv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bgv: BGVRequirement) => repositories.bgvs.update(bgv.candidateId, bgv),
    ...optimisticOptions<BGVRequirement, BGVRequirement>(qc, qk.bgvs.all, bgv =>
      listOps.replaceBy(b => b.candidateId === bgv.candidateId, bgv),
    ),
  });
}

/** Kick off background verification for a candidate who has no BGV record yet
 *  (e.g. one who applied through a public job link). */
export function useStartBgv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidate: Candidate) =>
      repositories.bgvs.create(buildBgvForCandidate(candidate)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bgvs.all }),
  });
}
