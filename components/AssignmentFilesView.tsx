'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileUp, Plus, RefreshCw, Trash2, Briefcase, Eye } from 'lucide-react';
import { useJobs } from '@/features/jobs/hooks';
import { useAssignmentBanks, useAssignmentBankMutations } from '@/features/question-banks/hooks';
import { useToast } from '@/components/Toaster';
import { findCategory } from '@/lib/question-library';
import { AssignmentFileBank } from '@/lib/question-banks';
import { AddAssignmentFileModal } from '@/components/AddAssignmentFileModal';
import { ReplaceAssignmentFileModal } from '@/components/ReplaceAssignmentFileModal';
import { uploadDocument, importDriveDocument, deleteDocument, documentPreviewUrl } from '@/lib/api/documents';
import { PickedFile } from '@/components/ui/file-dropzone';
import { randomId } from '@/lib/utils';

/** Upload a picked file (local or Drive) to the shared documents store. */
async function uploadPicked(file: PickedFile, entityId: string) {
  return file.kind === 'local'
    ? uploadDocument({
        entityType: 'assignment-bank',
        entityId,
        category: 'assignment-brief',
        file: file.file,
      })
    : importDriveDocument({
        entityType: 'assignment-bank',
        entityId,
        category: 'assignment-brief',
        fileId: file.ref.id,
        fileName: file.ref.name,
        mimeType: file.ref.mimeType,
        accessToken: file.ref.accessToken,
      });
}

/**
 * "Assignment File Upload" Question Library category — reusable take-home
 * assignment files, each mapped to a role. Multiple files per role are
 * allowed (e.g. variants). Picked from here (or uploaded fresh) when HR
 * sends a take-home invite from the candidate's Send Assessment modal.
 */
export function AssignmentFilesView() {
  const toast = useToast();
  const meta = findCategory('assignment-files');
  const { data: jobs = [] } = useJobs();
  const { data: banks = [] } = useAssignmentBanks();
  const { create, update, remove } = useAssignmentBankMutations();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState<AssignmentFileBank | null>(null);
  const [replacingBusy, setReplacingBusy] = useState(false);

  const addFile = async (
    job: (typeof jobs)[number],
    file: PickedFile,
    driveUploadUrl: string,
  ) => {
    setUploading(true);
    try {
      const doc = await uploadPicked(file, `ASGBANK-${Date.now()}`);
      const bank: AssignmentFileBank = {
        id: randomId('ASGBANK'),
        jobId: job.id,
        jobTitle: job.title,
        department: job.department,
        fileDocId: doc.id,
        fileName: doc.fileName,
        // Omitted rather than stored empty, so "has a folder" is a plain
        // truthiness check everywhere downstream.
        ...(driveUploadUrl ? { driveUploadUrl } : {}),
        uploadedAt: doc.uploadedAt,
      };
      create.mutate(bank);
      toast.success(`Assignment file added for ${job.title}.`);
      setOpen(false);
    } catch {
      toast.error('Could not upload the file — try again.');
    } finally {
      setUploading(false);
    }
  };

  const replaceFile = async (file: PickedFile) => {
    if (!replacing) return;
    setReplacingBusy(true);
    const oldFileDocId = replacing.fileDocId;
    try {
      const doc = await uploadPicked(file, replacing.id);
      update.mutate({ ...replacing, fileDocId: doc.id, fileName: doc.fileName, uploadedAt: doc.uploadedAt });
      // Best-effort — the swap already succeeded either way; an orphaned old
      // blob is a non-issue (just unreferenced storage), never worth blocking on.
      deleteDocument(oldFileDocId).catch(() => {});
      toast.success(`Replaced the file for ${replacing.jobTitle}.`);
      setReplacing(null);
    } catch {
      toast.error('Could not replace the file — try again.');
    } finally {
      setReplacingBusy(false);
    }
  };

  const deleteBank = (bank: AssignmentFileBank) => {
    toast.confirm({
      title: `Remove this assignment file?`,
      description: `"${bank.fileName}" for ${bank.jobTitle} will no longer be selectable when sending take-home invites.`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        remove.mutate(bank.id);
        toast.success('Assignment file removed.');
      },
    });
  };

  const Icon = meta?.Icon ?? FileUp;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/question-library"
            aria-label="Back to Question Library"
            title="Back to Question Library"
            className="shrink-0 text-gray-500 transition hover:text-accent-600"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600">
            <Icon size={18} />
          </span>
          <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
            {meta?.title ?? 'Assignment File Upload'}
          </h2>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent-600 px-3.5 text-xs font-semibold text-white transition hover:bg-accent-700"
        >
          <Plus size={14} /> Add file
        </button>
      </div>

      {banks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent-50 text-accent-500">
            <Icon size={26} />
          </span>
          <p className="text-sm font-bold text-gray-700">No assignment files yet</p>
          <p className="max-w-xs text-[11px] text-gray-500">
            Upload a brief/spec file for a role to reuse it when sending take-home assignments.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-accent-600 px-3.5 text-xs font-semibold text-white transition hover:bg-accent-700"
          >
            <Plus size={14} /> Add file
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-sunken font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">File</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-hover">
                {banks.map(bank => (
                  <tr key={bank.id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600">
                          <Briefcase size={15} />
                        </span>
                        <div>
                          <div className="text-[13px] font-bold text-gray-900">{bank.jobTitle}</div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                            {bank.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-700">{bank.fileName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={documentPreviewUrl(bank.fileDocId)}
                          target="_blank"
                          rel="noreferrer"
                          title="Preview this file"
                          aria-label="Preview file"
                          className="rounded-sm p-1.5 text-gray-500 transition hover:bg-surface-sunken hover:text-accent-600"
                        >
                          <Eye size={15} />
                        </a>
                        <button
                          type="button"
                          onClick={() => setReplacing(bank)}
                          title="Replace this file"
                          aria-label="Replace assignment file"
                          className="rounded-sm p-1.5 text-gray-500 transition hover:bg-surface-sunken hover:text-accent-600"
                        >
                          <RefreshCw size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBank(bank)}
                          title="Remove this assignment file"
                          aria-label="Remove assignment file"
                          className="rounded-sm p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <AddAssignmentFileModal
          jobs={jobs}
          pending={uploading}
          onSubmit={addFile}
          onClose={() => setOpen(false)}
        />
      )}
      {replacing && (
        <ReplaceAssignmentFileModal
          jobTitle={replacing.jobTitle}
          currentFileName={replacing.fileName}
          pending={replacingBusy}
          onSubmit={replaceFile}
          onClose={() => setReplacing(null)}
        />
      )}
    </div>
  );
}

export default AssignmentFilesView;
