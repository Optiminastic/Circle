'use client';

import { OffboardingChecklistView } from '@/components/SubViews';
import { PageLoading } from '@/components/PageLoading';
import { useOffboarding } from '@/features/offboarding/hooks';

export default function OffboardingPage() {
  const { data: offboarding = [], isLoading } = useOffboarding();

  if (isLoading) return <PageLoading />;

  return <OffboardingChecklistView offboarding={offboarding} />;
}
