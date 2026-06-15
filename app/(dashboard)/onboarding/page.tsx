'use client';

import { OnboardingChecklistView } from '@/components/SubViews';
import { PageLoading } from '@/components/PageLoading';
import { useOnboarding } from '@/features/onboarding/hooks';

export default function OnboardingPage() {
  const { data: onboarding = [], isLoading } = useOnboarding();

  if (isLoading) return <PageLoading />;

  return <OnboardingChecklistView onboarding={onboarding} />;
}
