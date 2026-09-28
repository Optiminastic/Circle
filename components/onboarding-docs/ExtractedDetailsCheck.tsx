'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Lock, Pencil, RotateCcw } from 'lucide-react';
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
  /** HR has verified this document, so nothing here is actionable any more. */
  locked?: boolean;
  /** Ask the candidate to pick a new file for this document. */
  onReplace: () => void;
  onConfirmed: () => void;
}

export function ExtractedDetailsCheck({
  token,
  docType,
  docLabel,
  extraction,
  locked = false,
  onReplace,
  onConfirmed,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...extraction.fields }));
  // Re-opened after confirming, to correct something spotted later.
  const [editing, setEditing] = useState(false);

  const confirmed = Boolean(extraction.candidateConfirmedAt);
  const unreadable = extraction.quality === 'unreadable';
  const entries = FIELD_ORDER.filter(key => extraction.fields[key]).map(
    key => [FIELD_LABELS[key], extraction.fields[key]] as const,
  );
  const validated = new Set(extraction.validatedFields ?? []);
  // Every key we could show: what OCR read, plus anything it should have found
  // for this document type but did not, so the candidate can fill the gap.
  const fieldKeys = FIELD_ORDER.filter(
    key => key in extraction.fields || key in values,
  );

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await confirmSubmission(token, docType, values);
      setEditing(false);
      onConfirmed();
    } catch {
      setError('Could not save your confirmation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // HR has verified: genuinely final, and the file can no longer be replaced.
  if (locked) {
    return (
      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
          <CheckCircle2 size={14} /> Details recorded from this document.
        </p>
        <DetailList entries={entries} className="mt-2 text-emerald-900" />
        <p className="mt-2 text-[10.5px] text-emerald-800/80">
          Verified by our team, so this can no longer be changed here. If something is wrong,
          contact HR.
        </p>
      </div>
    );
  }

  // Confirmed, but HR hasn't verified yet - so the candidate can still change
  // their mind. Only HR verification is final; confirming too quickly should
  // not trap someone with a value they later spot is wrong.
  if (confirmed && !editing) {
    return (
      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
          <CheckCircle2 size={14} /> You confirmed these details. HR will check them too.
        </p>
        <DetailList entries={entries} className="mt-2 text-emerald-900" />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Pencil size={12} /> Edit details
          </button>
          <button
            type="button"
            onClick={onReplace}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <RotateCcw size={12} /> Upload a clearer photo
          </button>
        </div>
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
        We read them automatically. Correct anything that is wrong - the locked
        fields were checked against the document itself.
      </p>

      {/* A confident read needs no extra nudge; an uncertain one does, because
          the candidate is the only person who can tell at a glance that a digit
          or a spelling is wrong - and a sharper photo fixes it at the source. */}
      {extraction.quality === 'needs_review' && (
        <p className="mt-2 flex items-start gap-1.5 rounded-sm border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>
            Parts of this were hard to read. Correct anything wrong below, or upload a
            sharper photo if most of it is unreadable.
          </span>
        </p>
      )}

      <div className="mt-2 space-y-2">
        {fieldKeys.map(key => {
          const confirmedByMachine = validated.has(key);
          return (
            <label key={key} className="block">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-600">
                {FIELD_LABELS[key] ?? key}
                {confirmedByMachine && (
                  <span
                    title="Read directly off the document and automatically checked"
                    className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-emerald-700"
                  >
                    <Lock size={7} /> checked
                  </span>
                )}
              </span>
              {confirmedByMachine ? (
                <p className="mt-0.5 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] font-medium text-emerald-900">
                  {values[key]}
                </p>
              ) : key === 'address' ? (
                <textarea
                  rows={3}
                  value={values[key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                  placeholder="Type this exactly as it appears on your document"
                  className="mt-0.5 w-full rounded-sm border border-line bg-surface px-2 py-1 text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              ) : (
                <input
                  value={values[key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                  placeholder="Type this exactly as it appears on your document"
                  className="mt-0.5 w-full rounded-sm border border-line bg-surface px-2 py-1 text-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                />
              )}
            </label>
          );
        })}
      </div>

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={confirm}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          {confirmed ? 'Save changes' : 'Yes, these are correct'}
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

/** The read values, as a plain label/value list. */
function DetailList({
  entries,
  className = '',
}: {
  entries: readonly (readonly [string, string])[];
  className?: string;
}) {
  if (entries.length === 0) return null;
  return (
    <dl className={`space-y-1 ${className}`}>
      {entries.map(([label, value]) => (
        <div key={label} className="flex gap-2 text-[12px]">
          <dt className="w-28 shrink-0 opacity-70">{label}</dt>
          <dd className="min-w-0 break-words font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default ExtractedDetailsCheck;
