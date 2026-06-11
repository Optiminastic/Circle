'use client';

import React, { useRef } from 'react';
import { Download, Eye, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { openDocument, useDocumentMutations, useDocuments } from '@/features/documents/hooks';
import { Tip } from '@/components/ui/tooltip';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface DocumentsPanelProps {
  entityType: string;
  entityId: string;
  category?: string;
  title?: string;
  /** Read-only view: replace Upload with a Preview action and open files in a new tab on click. */
  previewOnly?: boolean;
}

export function DocumentsPanel({
  entityType,
  entityId,
  category = 'document',
  title = 'Documents',
  previewOnly = false,
}: DocumentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: docs = [], isLoading, isError } = useDocuments(entityType, entityId);
  const { upload, remove } = useDocumentMutations(entityType, entityId);

  // The primary document to preview (the résumé), falling back to the first one.
  const previewDoc = docs.find(d => d.category === category) ?? docs[0];

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate({ file, category });
    e.target.value = '';
  };

  return (
    <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
          <FileText size={13} className="text-accent-600" /> {title}
        </h4>
        {previewOnly ? (
          previewDoc && (
            <Tip label="Open in new tab">
              <button
                onClick={() => openDocument(previewDoc.id)}
                aria-label="Preview"
                className="text-[11px] flex items-center gap-1 bg-accent-600 hover:bg-accent-700 text-white px-2.5 py-1 rounded-md font-medium cursor-pointer transition"
              >
                <Eye size={12} /> Preview
              </button>
            </Tip>
          )
        ) : (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
              className="text-[11px] flex items-center gap-1 bg-accent-600 hover:bg-accent-700 text-white px-2.5 py-1 rounded-md font-medium cursor-pointer transition disabled:opacity-60"
            >
              {upload.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Upload
            </button>
            <input ref={inputRef} type="file" hidden onChange={handlePick} />
          </>
        )}
      </div>

      {!previewOnly && upload.isError && (
        <p className="text-[10px] text-red-500">Upload failed — check the file size (max 15 MB) and try again.</p>
      )}

      {isError ? (
        <p className="text-[11px] text-red-500 py-2">Could not load documents.</p>
      ) : isLoading ? (
        <p className="text-[11px] text-gray-500 py-2">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-[11px] text-gray-500 py-2">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <div
              key={doc.id}
              onClick={previewOnly ? () => openDocument(doc.id) : undefined}
              title={previewOnly ? 'Open in new tab' : undefined}
              className={`flex items-center gap-2 p-2 border border-[#DAD4C8] rounded-lg text-[11px] hover:bg-[#E6E1D8] transition ${
                previewOnly ? 'cursor-pointer' : ''
              }`}
            >
              <FileText size={14} className="text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{doc.fileName}</p>
                <span className="text-[9px] text-gray-500 font-mono">
                  {doc.category} · {formatSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>
              {previewOnly ? (
                <Eye size={13} className="text-gray-500 shrink-0" aria-hidden />
              ) : (
                <>
                  <Tip label="Download">
                    <button
                      onClick={() => openDocument(doc.id)}
                      aria-label="Download"
                      className="p-1 text-gray-500 hover:text-accent-600 cursor-pointer"
                    >
                      <Download size={13} />
                    </button>
                  </Tip>
                  <Tip label="Delete">
                    <button
                      onClick={() => remove.mutate(doc.id)}
                      aria-label="Delete"
                      className="p-1 text-gray-500 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tip>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentsPanel;
