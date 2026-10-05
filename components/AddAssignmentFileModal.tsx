'use client';

import React, { useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { Job } from '@/types';
import { Select } from './Select';
import { FileDropzone, PickedFile, pickedName } from '@/components/ui/file-dropzone';

interface AddAssignmentFileModalProps {
  jobs: Job[];
  pending?: boolean;
  onSubmit: (job: Job, file: PickedFile) => void;
  onClose: () => void;
}

/**
 * Upload a reusable take-home assignment file (brief/spec) and map it to a
 * role. Shown from the "Assignment File Upload" Question Library category.
 * Multiple files per role are allowed — HR picks from these later when
 * sending a take-home invite (see SendTestModal's library picker).
 */
export function AddAssignmentFileModal({ jobs, pending, onSubmit, onClose }: AddAssignmentFileModalProps) {
  const [jobId, setJobId] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);

  const job = jobs.find(j => j.id === jobId);
  const canSubmit = Boolean(job) && Boolean(file) && !pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <FileUp size={17} className="text-accent-600" /> Add assignment file
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">Role</label>
            <Select
              value={jobId}
              onChange={e => setJobId(e.target.value)}
              className="h-9 w-full rounded-sm border border-line bg-surface px-2 text-xs"
            >
              <option value="">— Select a role —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title} · {j.department}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
              Assignment file
            </label>
            <FileDropzone
              value={file}
              onChange={setFile}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
              hint="PDF, Word, Excel, PowerPoint or ZIP up to 15 MB"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => job && file && onSubmit(job, file)}
            disabled={!canSubmit}
            className="rounded-md bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Uploading…' : file ? `Upload “${pickedName(file)}”` : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddAssignmentFileModal;
