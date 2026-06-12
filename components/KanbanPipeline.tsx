'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ShieldCheck,
  Phone,
  BrainCircuit,
  ClipboardList,
  CalendarDays,
  Flag,
  PauseCircle,
  Briefcase,
  Bookmark,
  ChevronRight,
} from 'lucide-react';
import { Candidate, TestInvite } from '../types';
import { KanbanColumnKey, pipelineColumn, pipelineSummary, PipelineContext } from '@/lib/pipeline';
import { useSchedules } from '@/features/schedule/hooks';
import { useInterviews } from '@/features/interviews/hooks';
import { useIqTests } from '@/features/assessments/hooks';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from './ui/sheet';

interface KanbanPipelineProps {
  candidates: Candidate[];
}

type LucideIcon = typeof FileText;

const COLUMNS: {
  key: KanbanColumnKey;
  label: string;
  Icon: LucideIcon;
  countColor: string;
  bg: string;
}[] = [
  { key: 'New', label: 'New', Icon: FileText, countColor: 'text-accent-600 bg-accent-50', bg: 'bg-[#EDEEF1]/50' },
  { key: 'Screening', label: 'Screening', Icon: ShieldCheck, countColor: 'text-purple-600 bg-purple-50', bg: 'bg-[#EDEEF1]/50' },
  { key: 'HR Call', label: 'HR Call', Icon: Phone, countColor: 'text-teal-600 bg-teal-50', bg: 'bg-teal-50/10' },
  { key: 'IQ Test', label: 'IQ Test', Icon: BrainCircuit, countColor: 'text-indigo-600 bg-indigo-50', bg: 'bg-[#E6E1D8]/50' },
  { key: 'Assignment', label: 'Assessment', Icon: ClipboardList, countColor: 'text-amber-600 bg-amber-50', bg: 'bg-[#E6E1D8]/50' },
  { key: 'Interview', label: 'Interview', Icon: CalendarDays, countColor: 'text-blue-600 bg-blue-50', bg: 'bg-blue-50/10' },
  { key: 'Decision', label: 'Decision', Icon: Flag, countColor: 'text-emerald-600 bg-emerald-50', bg: 'bg-emerald-50/10' },
  { key: 'On Hold', label: 'On Hold', Icon: PauseCircle, countColor: 'text-yellow-600 bg-yellow-50', bg: 'bg-yellow-50/10' },
];

/** Newest applications first — proxy for "most recently added to the pipeline". */
function sortByRecency(list: Candidate[]) {
  return [...list].sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());
}

export function KanbanPipeline({ candidates }: KanbanPipelineProps) {
  const router = useRouter();

  // Same cross-entity signals the detail page reads, so columns match the real pipeline.
  const { data: schedules = [] } = useSchedules();
  const { data: interviews = [] } = useInterviews();
  const { data: iqTests = [] } = useIqTests();
  const { data: invites = [] } = useQuery({
    queryKey: qk.testInvites.all,
    queryFn: () => repositories.testInvites.list(),
  });

  // Which column's full candidate list is open in the drawer (null = closed).
  const [openColumn, setOpenColumn] = useState<KanbanColumnKey | null>(null);

  const ctx: PipelineContext = useMemo(
    () => ({ schedules, interviews, iqTests, invites: invites as TestInvite[] }),
    [schedules, interviews, iqTests, invites],
  );

  // Bucket every candidate into exactly one column by current pipeline stage.
  const byColumn = useMemo(() => {
    const map = new Map<KanbanColumnKey, Candidate[]>();
    COLUMNS.forEach(c => map.set(c.key, []));
    candidates.forEach(c => map.get(pipelineColumn(c, ctx))!.push(c));
    map.forEach((list, key) => map.set(key, sortByRecency(list)));
    return map;
  }, [candidates, ctx]);

  const goToCandidate = (id: string) => {
    setOpenColumn(null);
    router.push(`/candidates/${id}`);
  };

  const openMeta = COLUMNS.find(c => c.key === openColumn) ?? null;
  const openList = openColumn ? byColumn.get(openColumn) ?? [] : [];

  return (
    <div className="space-y-3 select-none">
      {/* Kanban Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
            Recruitment Pipeline (Live Kanban)
          </h3>
          <p className="text-xs text-gray-500">
            Each stage reflects where candidates actually are — open a stage to see everyone, click a candidate for the full profile.
          </p>
        </div>
      </div>

      {/* Stage tiles — click to open the per-stage drawer */}
      <div className="grid grid-cols-1 gap-3 overflow-x-auto pb-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {COLUMNS.map(col => {
          const list = byColumn.get(col.key) ?? [];
          const ColIcon = col.Icon;
          const latest = list[0];
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => setOpenColumn(col.key)}
              className={`text-left border border-[#E4E6EA] rounded-xl p-3 flex flex-col min-h-[160px] transition hover:border-accent-400 hover:shadow-xs cursor-pointer ${col.bg}`}
            >
              {/* Column header: icon + label + count */}
              <div className="flex items-center justify-between mb-3 border-b border-[#E4E6EA]/60 pb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                  <ColIcon size={13} className="text-gray-500" />
                  {col.label}
                </span>
                <span
                  className={`text-[10px] size-5 rounded-full flex items-center justify-center font-bold font-mono ${col.countColor}`}
                >
                  {list.length}
                </span>
              </div>

              {/* Latest candidate preview, or empty hint */}
              <div className="flex-1">
                {list.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#E4E6EA] rounded-lg text-[10px] text-gray-500 bg-[#FFFFFF]">
                    No candidates
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-gray-900 truncate">{latest.fullName}</p>
                    <p className="text-[10px] text-gray-500 font-mono truncate">{latest.appliedRole}</p>
                    {list.length > 1 && (
                      <p className="text-[10px] text-gray-400 font-mono">+{list.length - 1} more</p>
                    )}
                  </div>
                )}
              </div>

              {list.length > 0 && (
                <span className="mt-2.5 inline-flex items-center justify-center gap-0.5 text-[10px] font-mono font-semibold text-accent-600">
                  View stage <ChevronRight size={11} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Per-stage drawer with the full candidate list */}
      <Sheet open={openColumn !== null} onOpenChange={open => !open && setOpenColumn(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {openMeta && <openMeta.Icon size={16} className="text-accent-600" />}
              {openMeta?.label ?? 'Stage'}
            </SheetTitle>
            <SheetDescription>
              {openList.length} candidate{openList.length === 1 ? '' : 's'} at this stage — click one to open their full pipeline.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-2.5">
            {openList.length === 0 ? (
              <p className="text-xs text-gray-500">No candidates at this stage yet.</p>
            ) : (
              openList.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goToCandidate(c.id)}
                  className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] p-3 text-left transition hover:border-accent-400 hover:shadow-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900 group-hover:text-accent-600">
                      {c.fullName}
                    </p>
                    <p className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] text-gray-500">
                      <Briefcase size={10} className="shrink-0" />
                      {c.appliedRole}
                    </p>
                    <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-gray-500">
                      <Bookmark size={10} className="shrink-0" />
                      Exp: {c.totalExperienceYears} yrs · {pipelineSummary(c, ctx)}
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-400 group-hover:text-accent-600" />
                </button>
              ))
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
export default KanbanPipeline;
