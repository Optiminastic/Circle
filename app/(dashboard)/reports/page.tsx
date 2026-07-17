'use client';

import { HiringFunnelChart } from '@/components/HiringFunnelChart';
import { PageLoading } from '@/components/PageLoading';
import { BRAND } from '@/lib/brand';
import { Candidate } from '@/types';
import { useCandidates } from '@/features/candidates/hooks';
import { useInterviews } from '@/features/interviews/hooks';

export default function ReportsPage() {
  const { data: candidates = [], isLoading: candLoading } = useCandidates();
  const { data: interviews = [], isLoading: ivLoading } = useInterviews();

  if (candLoading || ivLoading) return <PageLoading />;

  // Only count interviews that belong to a CURRENT candidate — orphaned records
  // (from deleted/old candidates) must not inflate the numbers.
  const candidateIds = new Set(candidates.map(c => c.id));
  const scopedInterviews = interviews.filter(i => candidateIds.has(i.candidateId));

  // Headline metrics straight off the live candidate + interview data.
  const count = (pred: (c: Candidate) => boolean) => candidates.filter(pred).length;
  const terminal = ['Rejected', 'Selected', 'On Hold', 'Duplicate Profile'];
  const completedInterviews = scopedInterviews.filter(i => i.status === 'Completed').length;
  const upcomingInterviews = scopedInterviews.filter(i => i.status === 'Scheduled').length;

  const kpis = [
    { label: 'Total candidates', value: candidates.length },
    { label: 'Active in pipeline', value: count(c => !terminal.includes(c.status)) },
    { label: 'Offer shortlisted', value: count(c => c.status === 'Offer Shortlisted') },
    { label: 'Selected', value: count(c => c.status === 'Selected') },
    { label: 'Rejected', value: count(c => c.status === 'Rejected') },
    { label: 'Interviews (done / upcoming)', value: `${completedInterviews} / ${upcomingInterviews}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
          {BRAND.name} Enterprise Reports Dashboard
        </h2>
        <p className="text-xs text-gray-500">
          Live pipeline metrics, hiring yield &amp; conversion funnel, and monthly trends — computed
          from the current candidates and interviews.
        </p>
      </div>

      {/* Headline KPIs (real data) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-4">
            <p className="font-mono text-2xl font-bold leading-none text-gray-900">{k.value}</p>
            <p className="mt-2 text-[11px] font-medium leading-tight text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5">
        <HiringFunnelChart candidates={candidates} interviews={scopedInterviews} />
      </div>
    </div>
  );
}
