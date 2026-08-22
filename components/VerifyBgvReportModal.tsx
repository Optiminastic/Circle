'use client';

import React, { useState } from 'react';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { FileDropzone, PickedFile } from '@/components/ui/file-dropzone';

interface Props {
  candidateName: string;
  pending?: boolean;
  onSubmit: (file: PickedFile) => void;
  onClose: () => void;
}

/**
 * "Mark BGV verified" — HR must attach the OnGrid PDF report as evidence
 * before the status can flip to Verified (no more single-click confirm).
 */
export function VerifyBgvReportModal({ candidateName, pending, onSubmit, onClose }: Props) {
  const [picked, setPicked] = useState<PickedFile | null>(null);

  const submit = () => {
    if (!picked) return;
    onSubmit(picked);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <ShieldCheck size={15} className="text-accent-600" /> Mark BGV verified
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11.5px] text-gray-500">
          Attach the OnGrid verification report for{' '}
          <span className="font-semibold text-gray-700">{candidateName}</span> to confirm they're cleared.
        </p>

        <FileDropzone
          value={picked}
          onChange={setPicked}
          accept="application/pdf,.pdf"
          hint="OnGrid verification report (PDF)"
          disabled={pending}
        />

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#ECEDF0] pt-3">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-[#E4E6EA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 hover:bg-[#F1F3F5] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={pending || !picked}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending && <Loader2 size={13} className="animate-spin" />}
            {pending ? 'Marking verified…' : 'Mark verified'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyBgvReportModal;
