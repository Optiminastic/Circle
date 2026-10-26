'use client';

import { OnboardingChecklistView } from '@/components/SubViews';
import { PageLoading } from '@/components/PageLoading';
import { useOnboarding } from '@/features/onboarding/hooks';
import { useBgvs } from '@/features/candidates/hooks';

export default function OnboardingPage() {
  const { data: onboarding = [], isLoading: onboardingLoading } = useOnboarding();
  const { data: bgvs = [], isLoading: bgvLoading } = useBgvs();

  if (onboardingLoading || bgvLoading) return <PageLoading />;

  // Converting to employee alone doesn't drop them from this checklist —
  // BGV can still be outstanding (it runs independently and can take ~20
  // days), and HR needs to keep tracking it here until it's actually
  // cleared. Only once BGV is Verified AND has its final report attached
  // does onboarding count as fully done. The record itself isn't touched
  // either way, just hidden here once both are true.
  const inProgress = onboarding.filter(o => {
    const converted = Boolean(o.convertedToEmployeeAt) || Boolean(o.employeeId);
    if (!converted) return true;
    const bgv = bgvs.find(b => b.candidateId === o.candidateId);
    const bgvCleared = bgv?.overallStatus === 'Verified' && Boolean(bgv.reportDocId);
    return !bgvCleared;
  });

  return <OnboardingChecklistView onboarding={inProgress} />;
}
