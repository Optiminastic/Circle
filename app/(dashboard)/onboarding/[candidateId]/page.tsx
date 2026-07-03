'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { OnboardingDetail } from '@/components/OnboardingDetail';
import { PageLoading } from '@/components/PageLoading';
import { useOnboarding, usePromoteFromOnboarding } from '@/features/onboarding/hooks';
import { useCandidateMutations } from '@/features/candidates/hooks';
import { useToast } from '@/components/Toaster';

export default function OnboardingDetailPage() {
  const params = useParams<{ candidateId: string }>();
  const candidateId = params?.candidateId ?? '';
  const router = useRouter();
  const toast = useToast();

  const { data: onboarding = [], isLoading } = useOnboarding();
  const promote = usePromoteFromOnboarding();
  const { remove } = useCandidateMutations();

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

  const del = () => {
    toast.confirm({
      title: `Delete ${checklist.candidateName} from onboarding?`,
      description:
        'This permanently removes the candidate and ALL their data — offer letter, every uploaded document (from storage/S3 and the database), document requests, BGV and the onboarding record. This cannot be undone.',
      confirmLabel: 'Delete candidate',
      onConfirm: () =>
        remove.mutate(candidateId, {
          onSuccess: () => {
            toast.success(`${checklist.candidateName} deleted.`);
            router.push('/onboarding');
          },
          onError: () => toast.error('Could not delete the candidate — try again.'),
        }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
            {checklist.candidateName}
          </h2>
          <p className="text-[11px] text-gray-500">
            Onboarding workspace · {checklist.onboardingStatus}
          </p>
        </div>
        <button
          onClick={del}
          disabled={remove.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {remove.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Delete candidate
        </button>
      </div>
      <OnboardingDetail checklist={checklist} onAddEmployeeTrigger={c => promote.mutate(c)} />
    </div>
  );
}
