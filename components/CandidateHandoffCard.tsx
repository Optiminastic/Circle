'use client';

import React, { useEffect, useState } from 'react';
import { Rss, Loader2, CheckCircle2 } from 'lucide-react';
import { repositories } from '@/lib/api/repositories';
import { markCandidateArrived } from '@/lib/api/handoff';
import { CandidateHandoff } from '@/types';
import { useToast } from './Toaster';

/**
 * Marks a hired candidate "arrived in office", which lists them in the public
 * candidate feed the external onboarding system fetches. Shown on the onboarding
 * screen.
 */
export function CandidateHandoffCard({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  const toast = useToast();
  const [record, setRecord] = useState<CandidateHandoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let active = true;
    repositories.candidateHandoffs
      .get(candidateId)
      .then(rec => active && setRecord(rec))
      .catch(() => active && setRecord(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [candidateId]);

  const markArrived = async () => {
    setMarking(true);
    try {
      const res = await markCandidateArrived(candidateId);
      setRecord(prev => ({
        candidateId,
        candidateName,
        arrivedAt: prev?.arrivedAt ?? res.arrivedAt,
        updatedAt: res.updatedAt,
      }));
      toast.success('Marked arrived — added to the onboarding feed.');
    } catch {
      toast.error('Could not mark arrived — please try again.');
    } finally {
      setMarking(false);
    }
  };

  const inFeed = !!record?.arrivedAt;

  return (
    <div className="rounded-xl border border-[#E4E6EA] bg-white p-4 shadow-2xs">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Rss size={13} className="text-accent-600" />
        <h4 className="text-xs font-bold text-gray-900">Onboarding feed</h4>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
        When {candidateName.split(' ')[0] || 'the candidate'} arrives for their first office day, mark
        them arrived to add them to the feed your external onboarding system pulls (profile + verified
        documents).
      </p>

      {loading ? (
        <p className="text-[11px] text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-2.5">
          {inFeed && (
            <div className="flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">
              <CheckCircle2 size={13} className="mt-px shrink-0" />
              <span>In the onboarding feed since {new Date(record!.arrivedAt!).toLocaleString()}</span>
            </div>
          )}
          <button
            type="button"
            onClick={markArrived}
            disabled={marking}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition disabled:opacity-60 ${
              inFeed
                ? 'border border-[#E4E6EA] bg-white text-gray-700 hover:bg-[#F1F3F5]'
                : 'bg-accent-600 text-white hover:bg-accent-700'
            }`}
          >
            {marking ? <Loader2 size={12} className="animate-spin" /> : <Rss size={12} />}
            {inFeed ? 'Re-mark arrived' : 'Mark arrived (add to feed)'}
          </button>
        </div>
      )}
    </div>
  );
}

export default CandidateHandoffCard;
