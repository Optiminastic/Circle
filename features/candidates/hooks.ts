'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BGVRequirement, Candidate, CandidateStatus, FitRating, OnboardingChecklist } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { PageParams } from '@/lib/api/resource-repository';
import { CandidateSearchParams, searchCandidates } from '@/lib/api/candidates-search';
import { qk } from '@/lib/query/keys';
import { jobForCandidate } from '@/features/jobs/hooks';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';
import { buildBgvForCandidate, buildOnboardingForCandidate } from '@/services/candidate.service';

/** Database-side paginated candidates (search/sort pushed to the backend —
 *  see docs/PERFORMANCE_AUDIT.md P0-2). Use this for the candidates list
 *  view; `useCandidates()` above stays for consumers that need the whole
 *  set (dashboard bootstrap gate, cross-referencing by id, etc.).
 *
 *  `keepPreviousData` shows the OLD page's rows (greyed by the caller via
 *  `isFetching`) while the next page loads, instead of a blank/loading
 *  flash — but never the previous SEARCH/FILTER's rows under a new one;
 *  since page/search/sortBy/sortOrder are all part of the query key
 *  (see qk.candidates.page), changing any of them is a different cache
 *  entry, not a mutation of this one, so "previous data" can only ever be
 *  a different PAGE of the SAME filter, never a stale filter's results. */
export function useCandidatesPage(params: PageParams) {
  return useQuery({
    queryKey: qk.candidates.page(params),
    queryFn: ({ signal }) => repositories.candidates.listPaginated(params, signal),
    placeholderData: keepPreviousData,
  });
}

/** CandidateListView.tsx's full search/filter/pagination (stage, CTC band,
 *  keyword band, resume search, etc.) — all computed server-side. `enabled`
 *  lets a caller that already has a `candidates` array (e.g.
 *  NewCandidatesPanel's small, pre-fetched top-N list) opt out of this
 *  fetch entirely rather than running it unused. */
export function useCandidatesSearch(params: CandidateSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.candidates.search(params as Record<string, unknown>),
    queryFn: ({ signal }) => searchCandidates(params, signal),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useCandidates() {
  return useQuery({
    queryKey: qk.candidates.all,
    queryFn: () => repositories.candidates.list(),
    // Public applications land outside this session's own mutations (a
    // candidate applying doesn't invalidate anyone's cache), so this can't
    // rely on invalidation alone to ever pick up a new applicant. But this
    // hook is mounted globally (ScheduleProvider wraps every dashboard
    // route — see store/schedule-store.tsx), and the full candidates table
    // (including each candidate's extracted resume text) was being
    // re-downloaded in full every 30s on EVERY page, not just the one or
    // two screens that show new applicants — see docs/PERFORMANCE_AUDIT.md
    // P0-3. refetchOnWindowFocus already covers "I tabbed away and came
    // back"; this interval is just a background safety net for a tab left
    // open for a while, at a frequency that no longer dominates network
    // traffic. (This session's own create/update/move/remove/setFit
    // mutations already invalidate qk.candidates.all directly — see
    // useCandidateMutations below — so this interval only exists for
    // OTHER sessions' writes, not this one's own.)
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });
}

export function useBgvs() {
  return useQuery({ queryKey: qk.bgvs.all, queryFn: () => repositories.bgvs.list() });
}

export function useJoiningConfirmations() {
  return useQuery({
    queryKey: qk.joiningConfirmations.all,
    queryFn: () => repositories.joiningConfirmations.list(),
  });
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
      // A new candidate with a jobId is one more applicant on that job.
      [qk.candidates.all, qk.jobs.all],
    ),
  });

  const update = useMutation({
    mutationFn: async (candidate: Candidate) => {
      await repositories.candidates.update(candidate.id, candidate);
      if (candidate.status === 'Shortlisted') {
        const existing = qc.getQueryData<OnboardingChecklist[]>(qk.onboarding.all) ?? [];
        if (!existing.some(o => o.candidateId === candidate.id)) {
          await repositories.onboarding.create(buildOnboardingForCandidate(candidate, jobForCandidate(qc, candidate)));
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
        // A deleted candidate's jobId is one less applicant on that job's
        // count (JobListView's "applicants" sort + summary card).
        qk.jobs.all,
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

/** Restore a Blacklisted candidate back to the active pipeline (used from the
 *  "Blacklisted candidates" view). They already have no onboarding record —
 *  blacklisting removed it — so this only patches the candidate itself. */
export function useRestoreFromBlacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) =>
      repositories.candidates.patch(candidateId, {
        status: 'Shortlisted',
        blacklistedAt: null,
        blacklistReason: null,
      } as unknown as Partial<Candidate>),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.candidates.all }),
  });
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
    // `services` are the rate-card shortforms HR picked in the Start BGV modal.
    mutationFn: ({ candidate, services = [] }: { candidate: Candidate; services?: string[] }) =>
      repositories.bgvs.create(buildBgvForCandidate(candidate, services)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bgvs.all }),
  });
}
