'use client';

import { HiringFunnelChart } from '@/components/HiringFunnelChart';
import { PageLoading } from '@/components/PageLoading';
import { useCandidates } from '@/features/candidates/hooks';
import { useInterviews } from '@/features/interviews/hooks';

export default function ReportsPage() {
  const { data: candidates = [] } = useCandidates();
  const { data: interviews = [], isLoading } = useInterviews();

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display">
        Opti Circle Enterprise Reports Dashboard
      </h2>
      <p className="text-xs text-gray-400">
        Yield convert charts, time-to-hire averages, promotion trends, and offboarding completion scorecards.
      </p>
      <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-5">
        <HiringFunnelChart candidates={candidates} interviews={interviews} />
      </div>
    </div>
  );
}
