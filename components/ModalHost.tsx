'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUiStore } from '@/store/ui-store';

/**
 * Candidate drawer was retired — opening a candidate from anywhere now routes to
 * their full page at `/candidates/[id]`. This host watches the shared
 * `selectedCandidateId` (still set by existing call sites / `openCandidate`),
 * navigates to the page, then clears the id so the redirect fires once.
 */
export function ModalHost() {
  const router = useRouter();
  const { selectedCandidateId, setSelectedCandidateId } = useUiStore();

  useEffect(() => {
    if (!selectedCandidateId) return;
    const id = selectedCandidateId;
    setSelectedCandidateId(null);
    router.push(`/candidates/${id}`);
  }, [selectedCandidateId, setSelectedCandidateId, router]);

  return null;
}

export default ModalHost;
