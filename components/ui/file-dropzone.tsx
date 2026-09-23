'use client';

/**
 * FileDropzone — central drag-and-drop file field for the design system.
 * Customize the look here once; never per-instance (see styles.ts).
 *
 * Supports two sources, surfaced as a single picked value:
 *   - a local File (drag-drop or browse)
 *   - a Google Drive file reference (via the Picker), when Drive is configured
 *
 * The parent owns the value and decides what to do with it on submit.
 */

import React, { useCallback, useRef, useState } from 'react';
import { File as FileIcon, Loader2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useToast } from '@/components/Toaster';
import { DriveFileRef, useGoogleDrivePicker } from '@/lib/google-drive';

export type PickedFile =
  | { kind: 'local'; file: File }
  | { kind: 'drive'; ref: DriveFileRef };

export function pickedName(p: PickedFile): string {
  return p.kind === 'local' ? p.file.name : p.ref.name;
}

export function pickedSize(p: PickedFile): number {
  return p.kind === 'local' ? p.file.size : p.ref.sizeBytes;
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Inline Google "G" so we don't pull another icon dependency.
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

interface FileDropzoneProps {
  value: PickedFile | null;
  onChange: (value: PickedFile | null) => void;
  /** input `accept` attribute, e.g. ".pdf,.doc,.docx". */
  accept?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function FileDropzone({
  value,
  onChange,
  accept,
  hint = 'PDF, DOC or DOCX up to 15 MB',
  disabled,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const toast = useToast();
  const drive = useGoogleDrivePicker();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onChange({ kind: 'local', file });
    },
    [onChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDrive = async () => {
    try {
      const ref = await drive.pick();
      if (ref) onChange({ kind: 'drive', ref });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open Google Drive.');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected-file chip. The drop zone below stays active so the file can
          always be replaced by dropping / browsing / re-importing — never a
          dead end that silently keeps a stale pick. */}
      {value && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-accent-50 text-accent-600">
            {value.kind === 'drive' ? <GoogleGlyph className="size-4" /> : <FileIcon size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{pickedName(value)}</p>
            <p className="text-xs text-muted-foreground">
              {value.kind === 'drive' ? 'Google Drive' : 'Local file'}
              {pickedSize(value) ? ` · ${formatSize(pickedSize(value))}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove file"
            className={cn(
              'rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground',
              ui.focusRing,
            )}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-center transition-colors',
          value ? 'px-4 py-3' : 'px-4 py-6',
          ui.focusRing,
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-accent-400 hover:bg-secondary/40',
          dragging ? 'border-accent-500 bg-accent-50' : 'border-input bg-secondary/20',
        )}
      >
        <UploadCloud size={20} className={cn('text-muted-foreground', dragging && 'text-accent-600')} />
        <p className="text-sm font-medium text-foreground">
          <span className="text-accent-600">{value ? 'Replace file' : 'Click to browse'}</span>
          {' or drag & drop'}
        </p>
        {!value && <p className="text-xs text-muted-foreground">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {drive.configured && (
        <button
          type="button"
          onClick={handleDrive}
          disabled={disabled || drive.loading}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground',
            ui.press,
            ui.focusRing,
            'hover:bg-secondary/50 disabled:opacity-60',
          )}
        >
          {drive.loading ? <Loader2 size={15} className="animate-spin" /> : <GoogleGlyph className="size-4" />}
          {value ? 'Replace from Google Drive' : 'Import from Google Drive'}
        </button>
      )}
    </div>
  );
}

export default FileDropzone;
