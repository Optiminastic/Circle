'use client';

import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { FileDropzone, PickedFile, pickedName } from '@/components/ui/file-dropzone';

interface ReplaceAssignmentFileModalProps {
  jobTitle: string;
  currentFileName: string;
  pending?: boolean;
  onSubmit: (file: PickedFile) => void;
  onClose: () => void;
}

/** Swap an existing assignment-bank file for a new one, same role. */
export function ReplaceAssignmentFileModal({
  jobTitle,
  currentFileName,
  pending,
  onSubmit,
  onClose,
}: ReplaceAssignmentFileModalProps) {
  const [file, setFile] = useState<PickedFile | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <RefreshCw size={16} className="text-accent-600" /> Replace assignment file
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[11px] text-gray-500">
          {jobTitle} · currently <span className="font-medium text-gray-700">{currentFileName}</span>
        </p>

        <FileDropzone
          value={file}
          onChange={setFile}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
          hint="PDF, Word, Excel, PowerPoint or ZIP up to 15 MB"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => file && onSubmit(file)}
            disabled={!file || pending}
            className="rounded-md bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Replacing…' : file ? `Replace with “${pickedName(file)}”` : 'Replace'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReplaceAssignmentFileModal;
