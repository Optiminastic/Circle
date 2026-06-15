'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, UserPlus } from 'lucide-react';
import { Candidate, TestInvite } from '../types';
import { pipelineColumn, PipelineContext } from '@/lib/pipeline';
import { useSchedules } from '@/features/schedule/hooks';
import { useInterviews } from '@/features/interviews/hooks';
import { useIqTests } from '@/features/assessments/hooks';
import { useCandidateMutations } from '@/features/candidates/hooks';
import { useScheduler } from '@/store/schedule-store';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { CandidateListView } from '@/components/CandidateListView';

interface NewCandidatesPanelProps {
  candidates: Candidate[];
}

/** Newest applications first. */
function sortByRecency(list: Candidate[]) {
  return [...list].sort(
    (a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime(),
  );
}

/**
 * Dashboard panel showing only candidates still in the "New" stage — fresh
 * applications that haven't been actioned yet. Reuses the full ATS candidate
 * table (header-less, filter-less) so the dashboard matches the Candidates page.
 */
export function NewCandidatesPanel({ candidates }: NewCandidatesPanelProps) {
  const router = useRouter();
  const { openSchedule } = useScheduler();
  const { create, remove, setFit } = useCandidateMutations();

  const { data: schedules = [] } = useSchedules();
  const { data: interviews = [] } = useInterviews();
  const { data: iqTests = [] } = useIqTests();
  const { data: invites = [] } = useQuery({
    queryKey: qk.testInvites.all,
    queryFn: () => repositories.testInvites.list(),
  });

  const ctx: PipelineContext = useMemo(
    () => ({ schedules, interviews, iqTests, invites: invites as TestInvite[] }),
    [schedules, interviews, iqTests, invites],
  );

  const newCandidates = useMemo(
    () => sortByRecency(candidates.filter(c => pipelineColumn(c, ctx) === 'New')),
    [candidates, ctx],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">
            New Candidates ({newCandidates.length})
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Fresh applications waiting to be reviewed.
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
