'use client';

/**
 * Renders one claim's fields from `lib/bgv-claim-fields`.
 *
 * Shared by the candidate's documents portal and HR's verification dialog so
 * the two always ask for the same things - a field OnGrid requires cannot be
 * mandatory on one screen and missing from the other.
 */

import React from 'react';
import { ScanLine } from 'lucide-react';
import {
  CLAIM_SECTIONS,
  digitsOnly,
  missingFields,
  type ClaimField,
  type ClaimSection,
  type ClaimValue,
} from '@/lib/bgv-claim-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-line bg-surface px-2.5 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

function FieldInput({
  field,
  id,
  value,
  onChange,
}: {
  field: ClaimField;
  id: string;
  value: string;
  onChange: (next: string) => void;
}) {
  if (field.kind === 'select') {
    return (
      <select id={id} value={value} onChange={e => onChange(e.target.value)} className={SELECT_CLASS}>
        <option value="">Select…</option>
        {(field.options ?? []).map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      id={id}
      type={field.kind === 'date' ? 'date' : field.kind === 'email' ? 'email' : 'text'}
      inputMode={field.kind === 'digits' ? 'numeric' : undefined}
      value={value}
      placeholder={field.placeholder}
      onChange={e =>
        onChange(
          field.kind === 'digits' && field.digits
            ? digitsOnly(e.target.value, field.digits)
            : e.target.value,
        )
      }
    />
  );
}

export interface ClaimFieldsProps {
  section: ClaimSection;
  value: ClaimValue;
  onChange: (next: ClaimValue) => void;
  /** Prefix for input ids, so two screens can render the same section. */
  idPrefix?: string;
  /** One column reads better inside a narrow dialog. */
  columns?: 1 | 2;
  /**
   * Fields still holding a value read off a document, mapped to the document
   * it came from. Shown as a note under the input: a read is a suggestion, and
   * the candidate can only check it against the certificate if they are told
   * it is one. See `lib/bgv-prefill`.
   */
  sources?: Record<string, string>;
}

export function ClaimFields({
  section,
  value,
  onChange,
  idPrefix = 'claim',
  columns = 2,
  sources,
}: ClaimFieldsProps) {
  const { fields } = CLAIM_SECTIONS[section];
  return (
    <div
      className={`grid grid-cols-1 gap-3 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}
    >
      {fields.map(field => {
        const id = `${idPrefix}-${section}-${field.key}`;
        return (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={id}>
              {field.label}
              {field.required && <span className="ml-0.5 text-red-500">*</span>}
            </Label>
            <FieldInput
              field={field}
              id={id}
              value={String(value[field.key] ?? '')}
              onChange={next => onChange({ ...value, [field.key]: next })}
            />
            {sources?.[field.key] && (
              <p className="flex items-center gap-1 text-[10.5px] text-accent-700">
                <ScanLine size={10} className="shrink-0" />
                Read from your {sources[field.key].toLowerCase()} - check it against the document.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "Institute, degree and 2 more still needed." - or nothing when complete. */
export function MissingNote({
  section,
  value,
}: {
  section: ClaimSection;
  value: ClaimValue | undefined;
}) {
  const missing = missingFields(section, value);
  if (missing.length === 0) return null;
  const names = missing.map(f => f.label.replace(/ \(\d+ digits\)$/, '').toLowerCase());
  const shown = names.slice(0, 3).join(', ');
  const rest = names.length > 3 ? ` and ${names.length - 3} more` : '';
  return (
    <p className="text-[11px] text-amber-700">
      Still needed: {shown}
      {rest}.
    </p>
  );
}
