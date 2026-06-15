'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { OnboardingDetail } from '@/components/OnboardingDetail';
import { PageLoading } from '@/components/PageLoading';
import { useOnboarding, usePromoteFromOnboarding } from '@/features/onboarding/hooks';

export default function OnboardingDetailPage() {
  const params = useParams<{ candidateId: string }>();
  const candidateId = params?.candidateId ?? '';

  const { data: onboarding = [], isLoading } = useOnboarding();
  const promote = usePromoteFromOnboarding();

  if (isLoading) return <PageLoading />;

  const checklist = onboarding.find(o => o.candidateId === candidateId);

  if (!checklist) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D7DAE0] bg-[#FFFFFF] px-6 py-16 text-center text-xs">
        <p className="text-sm font-bold text-gray-700">Onboarding record not found</p>
        <p className="mt-1 text-[11px] text-gray-500">It may have been concluded already.</p>
        <Link
          href="/onboarding"
          className="mt-3 inline-block text-xs font-semibold text-accent-600 hover:underline"
        >
          ← Back to onboarding
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
          {checklist.candidateName}
        </h2>
        <p className="text-[11px] text-gray-500">Onboarding workspace · {checklist.onboardingStatus}</p>
      </div>
      <OnboardingDetail checklist={checklist} onAddEmployeeTrigger={c => promote.mutate(c)} />
    </div>
  );
}
