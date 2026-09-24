'use client';

import React, { useState } from 'react';
import { Ban, UserCheck, X } from 'lucide-react';

interface OnboardingCandidateActionsModalProps {
  candidateName: string;
  /** Resolves once the underlying mutation settles (success or error). */
  onConvertToCandidate: () => Promise<void>;
  onBlacklist: (reason: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Opened from the "⋮" on an Onboarding row. Two destination actions for a
 * candidate currently mid-onboarding:
 *  - Convert to candidate: drops them out of onboarding, back into the plain
 *    Candidates pipeline for their role.
 *  - Blacklist: asks HR for a reason first, then drops them out of onboarding
 *    and hides them everywhere except the "Blacklisted candidates" view.
 * Both only ever touch the onboarding record + candidate status — uploaded
 * onboarding documents stay exactly where they are in S3.
 */
export function OnboardingCandidateActionsModal({
  candidateName,
  onConvertToCandidate,
  onBlacklist,
  onClose,
}: OnboardingCandidateActionsModalProps) {
  const [pending, setPending] = useState<'convert' | 'blacklist' | null>(null);
  // Two-step Blacklist flow: picking the option reveals a reason textarea
  // before anything actually happens.
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState('');

  const busy = pending !== null;

  const runConvert = async () => {
    setPending('convert');
    try {
      await onConvertToCandidate();
      onClose();
    } finally {
      setPending(null);
    }
  };

  const confirmBlacklist = async () => {
    if (!reason.trim()) return;
    setPending('blacklist');
    try {
      await onBlacklist(reason.trim());
      onClose();
    } finally {
      setPending(null);
    }
  };

  if (askingReason) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={busy ? undefined : onClose}
      >
        <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-red-700">
              <Ban size={17} /> Blacklist candidate
            </h3>
            <button
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">{candidateName}</p>

          <label htmlFor="blacklist-reason" className="mb-1.5 block text-[11px] font-semibold text-gray-700">
            Reason for blacklisting <span className="text-red-500">*</span>
          </label>
          <textarea
            id="blacklist-reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={busy}
            rows={4}
            autoFocus
            placeholder="e.g. Failed background verification, offer rescinded for misconduct…"
            className="w-full resize-none rounded-md border border-line bg-surface p-2.5 text-xs text-gray-800 focus:border-red-400 focus:outline-none disabled:opacity-60"
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setAskingReason(false)}
              disabled={busy}
              className="rounded-md border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-surface-hover disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={confirmBlacklist}
              disabled={busy || !reason.trim()}
              className="rounded-md bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === 'blacklist' ? 'Blacklisting…' : 'Confirm blacklist'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Manage candidate</h3>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[11px] text-gray-500">{candidateName}</p>

        <div className="space-y-2.5">
          <button
            onClick={runConvert}
            disabled={busy}
            className="flex w-full items-center gap-3 rounded-md border border-line p-3.5 text-left transition hover:border-accent-400 hover:bg-accent-50 disabled:pointer-events-none disabled:opacity-60"
          >
            <UserCheck size={18} className="shrink-0 text-accent-600" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-gray-900">
                {pending === 'convert' ? 'Converting…' : 'Convert to candidate'}
              </p>
              <p className="text-[11px] text-gray-500">
                Move back to the regular candidate pipeline for this role. Onboarding progress is
                cleared — uploaded documents stay safely in storage.
              </p>
            </div>
          </button>

          <button
            onClick={() => setAskingReason(true)}
            disabled={busy}
            className="flex w-full items-center gap-3 rounded-md border border-red-200 p-3.5 text-left transition hover:border-red-400 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-60"
          >
            <Ban size={18} className="shrink-0 text-red-600" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-red-700">Blacklist</p>
              <p className="text-[11px] text-gray-500">
                Remove from onboarding and hide from the candidates list. Uploaded documents stay
                safely in storage — nothing is deleted.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingCandidateActionsModal;
