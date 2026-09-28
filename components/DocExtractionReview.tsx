'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ScanLine, UserCheck } from 'lucide-react';
import { DocExtraction, DocExtractionQuality, DocSubmission } from '@/types';
import { documentPreviewUrl } from '@/lib/api/documents';
import { useDocRequestMutations } from '@/features/doc-requests/hooks';

/**
 * Side-by-side review of one uploaded document: the image on the left, the
 * values OCR read out of it on the right, editable.
 *
 * HR always confirms - the extraction is a starting point, never a decision.
 * The quality banner says how much to trust it, but every field stays editable
 * in all cases, including when OCR could read nothing at all.
 */

/** Field keys the backend can return, in the order they should be shown. */
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

const QUALITY_META: Record<
  DocExtractionQuality,
  { label: string; hint: string; className: string }
> = {
  clear: {
    label: 'Looks clear',
    hint: 'Values were read confidently. Please confirm them against the image.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  needs_review: {
    label: 'Check these',
    hint: 'Some values may be misread. Correct anything wrong before verifying.',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  unreadable: {
    label: 'Could not read',
    hint: 'The image was too unclear to read. Type the values in from the document.',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
};

/** Multi-line values get a textarea; everything else a single input. */
const MULTILINE_FIELDS = new Set(['address']);

interface Props {
  requestId: string;
  docType: string;
  submission: DocSubmission;
  locked: boolean;
  onVerify: (fields: Record<string, string>) => void;
  verifying: boolean;
}

export function DocExtractionReview({
  requestId,
  docType,
  submission,
  locked,
  onVerify,
  verifying,
}: Props) {
  const { extract } = useDocRequestMutations();
  const [values, setValues] = useState<Record<string, string>>({});
  const [unavailable, setUnavailable] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const extraction = submission.extraction;

  // Read the document the first time HR opens this, then reuse the cached
  // result. Re-uploads land as a new submission, so a stale read can't persist.
  useEffect(() => {
    if (extraction || extract.isPending) return;
    extract.mutate(
      { requestId, docType },
      {
        onSuccess: res => {
          if (!res.ok && res.reason === 'ocr_not_configured') setUnavailable(true);
        },
        onError: () => setFailed('Could not read this document automatically.'),
      },
    );
    // Intentionally keyed on the document, not the mutation object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, docType, submission.documentId, extraction]);

  // Seed the editable values once extraction lands, keeping any HR edits.
  useEffect(() => {
    if (extraction) setValues({ ...extraction.fields });
  }, [extraction]);

  const shownKeys = useMemo(() => {
    const keys = new Set([...Object.keys(values), ...Object.keys(extraction?.fields ?? {})]);
    return FIELD_ORDER.filter(k => keys.has(k));
  }, [values, extraction]);

  const setField = (key: string, value: string) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const rerun = () =>
    extract.mutate(
      { requestId, docType },
      { onSuccess: res => setUnavailable(!res.ok && res.reason === 'ocr_not_configured') },
    );

  return (
    <div className="mt-2 rounded-md border border-line bg-surface p-2.5">
      <div className="grid gap-3 md:grid-cols-2">
        <DocumentPreview documentId={submission.documentId} fileName={submission.fileName} />

        <div className="min-w-0 space-y-2">
          <Banner
            extraction={extraction}
            pending={extract.isPending}
            unavailable={unavailable}
            failed={failed}
          />

          {shownKeys.length === 0 && !extract.isPending && (
            <p className="text-[11px] text-gray-500">
              No values could be read. Type them in from the document, or reject it and ask for a
              clearer photo.
            </p>
          )}

          {shownKeys.map(key => (
            <Field
              key={key}
              fieldKey={key}
              value={values[key] ?? ''}
              disabled={locked}
              onChange={v => setField(key, v)}
            />
          ))}

          {extraction?.warnings?.map(warning => (
            <p key={warning} className="flex items-start gap-1 text-[10px] text-amber-700">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {warning}
            </p>
          ))}

          {!locked && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={verifying}
                onClick={() => onVerify(values)}
                className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 size={12} /> Save &amp; verify
              </button>
              <button
                type="button"
                disabled={extract.isPending}
                onClick={rerun}
                className="inline-flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCw size={12} /> Read again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ documentId, fileName }: { documentId: string; fileName: string }) {
  const url = documentPreviewUrl(documentId);
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  return (
    <div className="min-w-0">
      {isPdf ? (
        <iframe src={url} title={fileName} className="h-64 w-full rounded-sm border border-line" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={fileName}
          className="max-h-64 w-full rounded-sm border border-line object-contain"
        />
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-[10px] font-semibold text-accent-600 hover:underline"
      >
        Open full size
      </a>
    </div>
  );
}

function Banner({
  extraction,
  pending,
  unavailable,
  failed,
}: {
  extraction?: DocExtraction;
  pending: boolean;
  unavailable: boolean;
  failed: string | null;
}) {
  if (pending) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <Loader2 size={12} className="animate-spin" /> Reading the document…
      </p>
    );
  }
  if (unavailable) {
    return (
      <p className="rounded-sm border border-line bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
        Automatic reading isn&apos;t set up on this server. Enter the values manually.
      </p>
    );
  }
  if (failed) {
    return (
      <p className="rounded-sm border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
        {failed}
      </p>
    );
  }
  if (!extraction) return null;

  const meta = QUALITY_META[extraction.quality];
  return (
    <div className="space-y-1.5">
      <div className={`rounded-sm border px-2 py-1.5 ${meta.className}`}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold">
          <ScanLine size={12} /> {meta.label}
          <span className="font-mono text-[9px] font-bold opacity-70">
            {Math.round(extraction.meanConfidence)}%
          </span>
        </p>
        <p className="mt-0.5 text-[10px] opacity-90">{meta.hint}</p>
      </div>
      {/* Whether HR is the first or the second pair of eyes on these values. */}
      {extraction.candidateConfirmedAt ? (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <UserCheck size={11} /> Candidate confirmed these details
        </p>
      ) : (
        <p className="text-[10px] text-gray-500">Not yet confirmed by the candidate.</p>
      )}
    </div>
  );
}

function Field({
  fieldKey,
  value,
  disabled,
  onChange,
}: {
  fieldKey: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const label = FIELD_LABELS[fieldKey] ?? fieldKey;
  const shared =
    'w-full rounded-sm border border-line bg-surface px-2 py-1 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:bg-gray-50 disabled:text-gray-500';
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-gray-600">{label}</span>
      {MULTILINE_FIELDS.has(fieldKey) ? (
        <textarea
          rows={2}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          className={shared}
        />
      ) : (
        <input
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          className={shared}
        />
      )}
    </label>
  );
}

export default DocExtractionReview;
