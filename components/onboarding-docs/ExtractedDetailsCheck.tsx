'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { DocExtraction } from '@/types';
import { confirmSubmission } from '@/lib/api/doc-requests';

/**
 * Shows the candidate what we read off the document they just uploaded, and
 * asks them to confirm it.
 *
 * Read-only by design. The document is the source of truth, so a candidate
 * confirms it or replaces it with a clearer photo - they never type values in.
 * That keeps HR verifying a document rather than someone's typing, and means
 * no identity number has to travel back to the server.
 */

const FIELD_LABELS: Record<string, string> = {
  number: 'Number',
  name: 'Name',
  fatherName: "Father's name",
  dob: 'Date of birth',
  gender: 'Gender',
  address: 'Address',
  pincode: 'PIN code',
  institution: 'Institution',
  degree: 'Degree',
  year: 'Year of passing',
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);

interface Props {
  token: string;
  docType: string;
  docLabel: string;
  extraction: DocExtraction;
  /** Ask the candidate to pick a new file for this document. */
  onReplace: () => void;
  onConfirmed: () => void;
}

export function ExtractedDetailsCheck({
  token,
  docType,
  docLabel,
  extraction,
  onReplace,
  onConfirmed,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = Boolean(extraction.candidateConfirmedAt);
  const unreadable = extraction.quality === 'unreadable';
  const entries = FIELD_ORDER.filter(key => extraction.fields[key]).map(
    key => [FIELD_LABELS[key], extraction.fields[key]] as const,
  );

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await confirmSubmission(token, docType);
      onConfirmed();
    } catch {
      setError('Could not save your confirmation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (confirmed) {
    return (
      <div className="mt-2 flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
        <CheckCircle2 size={14} /> You confirmed these details. HR will check them too.
      </div>
    );
  }

  if (unreadable || entries.length === 0) {
    return (
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
        <p className="flex items-center gap-1.5 font-semibold">
          <AlertTriangle size={14} /> We couldn&apos;t read this clearly
        </p>
        <p className="mt-1 text-amber-700">
          Please upload a sharper photo - all four corners visible, good light, no glare. HR can
          still read it manually if you&apos;d rather leave it.
        </p>
        <button
          type="button"
          onClick={onReplace}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 hover:bg-amber-100"
        >
          <RotateCcw size={13} /> Upload a clearer photo
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-line bg-surface px-3 py-2.5">
      <p className="text-[12px] font-semibold text-gray-800">
        Please check these details from your {docLabel.toLowerCase()}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500">
        We read them automatically, so they may not be perfect.
      </p>

      <dl className="mt-2 space-y-1">
        {entries.map(([label, value]) => (
          <div key={label} className="flex gap-2 text-[12px]">
            <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
            <dd className="min-w-0 break-words font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={confirm}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          Yes, these are correct
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onReplace}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          <RotateCcw size={13} /> Something&apos;s wrong - re-upload
        </button>
      </div>
    </div>
  );
}

export default ExtractedDetailsCheck;
