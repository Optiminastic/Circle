'use client';

/**
 * Confirm before the AI interview rings a candidate.
 *
 * One route, deliberately asked about every time: this dials a real person's
 * phone, costs money, and records them. A single-action confirm could not show
 * the number it is about to call, which is the whole point of the step - a
 * wrong number is caught here or not at all.
 *
 * There is no browser option. Sarvam's Instant Outbound places telephone calls
 * and has no browser equivalent, so offering one would be offering a button
 * that cannot work.
 */

import React from 'react';
import { Loader2, PhoneCall, X } from 'lucide-react';
import { ModalShell } from '@/components/ui/modal-shell';
import { useToast } from '@/components/Toaster';
import { ApiError } from '@/lib/http/client';
import { useStartScreeningCall } from '@/features/screening-calls/hooks';
import type { ScreeningCall } from '@/lib/api/screening-calls';

export interface StartScreeningCallDialogProps {
  candidate: { id: string; fullName: string; phone?: string };
  onClose: () => void;
  /** Fired once the call exists, so the caller can open a browser call. */
  onStarted?: (call: ScreeningCall) => void;
}

export function StartScreeningCallDialog({
  candidate,
  onClose,
  onStarted,
}: StartScreeningCallDialogProps) {
  const toast = useToast();
  const start = useStartScreeningCall();

  const run = () =>
    start.mutate(
      { candidateId: candidate.id, mode: 'phone' },
      {
        onSuccess: call => {
          toast.success(`Calling ${candidate.fullName}…`);
          onStarted?.(call);
          onClose();
        },
        // The server already phrases these for HR ("A screening call is
        // already in progress", "Phone calls are not set up yet"), so pass its
        // words through rather than inventing worse ones.
        onError: (error: unknown) =>
          toast.error(
            error instanceof ApiError ? error.detail : 'Could not start the call — try again.',
          ),
      },
    );

  const busy = start.isPending;

  return (
    <ModalShell onClose={onClose} size="sm" labelledBy="ai-interview-title" className="p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3
          id="ai-interview-title"
          className="flex items-center gap-2 text-sm font-bold text-gray-900"
        >
          <PhoneCall size={15} className="text-accent-600" /> AI interview
        </h3>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="rounded p-1 text-gray-400 transition hover:bg-gray-100 disabled:opacity-50"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mb-4 text-[12px] leading-relaxed text-gray-600">
        The agent calls {candidate.fullName.split(' ')[0]}, asks this role&apos;s own
        screening questions and reports back whether they are a fit. The call is
        recorded, and the candidate is told so.
      </p>

      <div className="space-y-2">
        <button
          onClick={run}
          disabled={busy || !candidate.phone}
          title={candidate.phone ? undefined : 'No phone number on this candidate'}
          className="flex w-full items-start gap-3 rounded-md border border-line bg-surface p-3 text-left transition hover:border-accent-400 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PhoneCall size={15} className="mt-0.5 shrink-0 text-accent-600" />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-gray-900">
              Call their phone
            </span>
            {/* Shown verbatim so a wrong number is caught before it is dialled. */}
            <span className="block font-mono text-[11px] text-gray-500">
              {candidate.phone || 'No number on file'}
            </span>
          </span>
        </button>

      </div>

      {busy && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
          <Loader2 size={12} className="animate-spin" /> Setting the call up…
        </p>
      )}
    </ModalShell>
  );
}

export default StartScreeningCallDialog;
