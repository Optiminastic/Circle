'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserPlus } from 'lucide-react';
import { Candidate } from '../types';
import { useCandidateMutations } from '@/features/candidates/hooks';
import { useScheduler } from '@/store/schedule-store';
import { CandidateListView } from '@/components/CandidateListView';

interface NewCandidatesPanelProps {
  candidates: Candidate[];
}

const TOP_N = 10;

/** Newest applications first — falls back to appliedDate when appliedAt (the
 *  finer-grained timestamp) isn't set. */
function sortByRecency(list: Candidate[]) {
  return [...list].sort(
    (a, b) =>
      new Date(b.appliedAt || b.appliedDate).getTime() - new Date(a.appliedAt || a.appliedDate).getTime(),
  );
}

/**
 * Dashboard panel showing the most recently applied candidates overall (not
 * filtered by pipeline stage), so it always reflects who just applied. Reuses
 * the full ATS candidate table (header-less, filter-less) so the dashboard
 * matches the Candidates page. `candidates` is refetched on an interval (see
 * `useCandidates`), so this panel picks up new applicants without a reload.
 */
export function NewCandidatesPanel({ candidates }: NewCandidatesPanelProps) {
  const router = useRouter();
  const { openSchedule } = useScheduler();
  const { create, remove, setFit } = useCandidateMutations();

  const newCandidates = useMemo(
    () => sortByRecency(candidates).slice(0, TOP_N),
    [candidates],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">
            New Candidates ({newCandidates.length})
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            The {TOP_N} most recently applied candidates.
          </p>
        </div>
        <Link
          href="/candidates"
          className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] font-semibold text-accent-600 hover:text-accent-700"
        >
          All candidates <ArrowRight size={11} />
        </Link>
      </div>

      {newCandidates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#E4E6EA] bg-[#FFFFFF] py-10 text-center">
          <UserPlus size={20} className="text-gray-400" />
          <p className="text-xs text-gray-500">No new applications right now.</p>
        </div>
      ) : (
        <CandidateListView
          candidates={newCandidates}
          showHeader={false}
          showFilters={false}
          onSelectCandidate={id => router.push(`/candidates/${id}`)}
          onAddCandidate={candidate => create.mutate(candidate)}
          onDeleteCandidate={id => remove.mutate(id)}
          onShortlistCandidate={(id, name) => openSchedule(id, name, 'HR Call')}
          onSetFit={(id, rating) => setFit.mutate({ id, rating })}
        />
      )}
    </section>
  );
}

export default NewCandidatesPanel;
