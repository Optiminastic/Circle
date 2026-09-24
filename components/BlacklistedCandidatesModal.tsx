'use client';

import React, { useState } from 'react';
import { Ban, RotateCcw, X } from 'lucide-react';
import { Candidate } from '@/types';

interface BlacklistedCandidatesModalProps {
  /** Pre-filtered to status === 'Blacklisted'. */
  candidates: Candidate[];
  onRestore: (candidateId: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Opened via the "Blacklisted candidates" button next to "Add to onboarding".
 * Read-only roster + a "Restore" action per row, which reverts the candidate
 * to 'Shortlisted' and un-hides them from the regular Candidates list. Their
 * uploaded documents were never touched by blacklisting, so there's nothing
 * to restore on the storage side.
 */
export function BlacklistedCandidatesModal({ candidates, onRestore, onClose }: BlacklistedCandidatesModalProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await onRestore(id);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-surface p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Ban size={16} className="text-red-600" /> Blacklisted candidates
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[11px] text-gray-500">
          Removed from onboarding and hidden from the candidates list. Their uploaded documents
          remain untouched in storage.
        </p>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {candidates.length === 0 ? (
            <div className="rounded-md border border-line bg-surface-hover p-6 text-center text-xs text-gray-500">
              No blacklisted candidates.
            </div>
          ) : (
            candidates.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-900">{c.fullName}</p>
                  <p className="truncate text-[11px] text-gray-500">
                    {c.appliedRole || 'No role'}
                    {c.blacklistedAt ? ` · Blacklisted ${new Date(c.blacklistedAt).toLocaleDateString()}` : ''}
                  </p>
                  {c.blacklistReason && (
                    <p className="mt-1 text-[11px] italic text-gray-600">“{c.blacklistReason}”</p>
                  )}
                </div>
                <button
                  onClick={() => handleRestore(c.id)}
                  disabled={restoringId === c.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-700 disabled:opacity-50"
                >
                  <RotateCcw size={12} /> {restoringId === c.id ? 'Restoring…' : 'Restore'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BlacklistedCandidatesModal;
