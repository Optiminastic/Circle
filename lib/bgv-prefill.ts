/**
 * Pre-fill the background-check claims from the candidate's own documents.
 *
 * The claim form asks for things that are printed on paper the candidate has
 * already uploaded, so asking them to type it again is asking twice. What OCR
 * read off each document (`DocSubmission.extraction.fields`) is mapped onto the
 * matching claim field here, and the candidate checks and corrects it.
 *
 * Two deliberate limits:
 *
 *  - **A suggestion never beats an answer.** Anything the candidate typed, or
 *    anything already saved on the record, wins over a read. `withPrefill` only
 *    fills gaps.
 *  - **Only what OCR actually yields.** `app/services/doc_fields.py` extracts a
 *    handful of fields per document and is honest about which are a best-effort
 *    read. Mapping a field it does not produce would show the candidate a
 *    confident blank; inventing one it produces badly is worse, because a wrong
 *    value in a required field is likelier to be accepted than an empty one.
 *
 * Which is why employment and UAN get nothing: there is no document in the
 * joining set that carries them.
 */
import type { DocSubmission } from '@/types';
import type { ClaimSection, ClaimValue } from '@/lib/bgv-claim-fields';

/** One extracted value, and the claim field it belongs in. */
interface Mapping {
  /** `docType` as the portal stores it; matched case-insensitively, because it
   *  is a free-form form field and "Aadhaar Card" must still match. */
  docType: string;
  /** Key in `extraction.fields` (see `doc_fields.py`). */
  from: string;
  section: ClaimSection;
  /** Key in `CLAIM_SECTIONS[section].fields`. */
  to: string;
}

const MAPPINGS: Mapping[] = [
  { docType: 'Education certificates', from: 'institution', section: 'education', to: 'institute' },
  { docType: 'Education certificates', from: 'degree', section: 'education', to: 'degree' },
  { docType: 'Education certificates', from: 'year', section: 'education', to: 'yearOfPassing' },
  { docType: 'Address proof', from: 'pincode', section: 'permanentAddress', to: 'pincode' },
  // The extractor takes the lines around the pincode rather than parsing a
  // layout it cannot predict, so this arrives as one run of text. It goes in
  // the only free-text line of the address and the candidate splits it up -
  // still less work than copying it off the image by hand.
  { docType: 'Address proof', from: 'address', section: 'permanentAddress', to: 'line1' },
];

export type ClaimSources = Record<string, string>;

export interface ClaimPrefill {
  /** Suggested values, per section. */
  values: Partial<Record<ClaimSection, ClaimValue>>;
  /** Which document each suggested value came from, so the form can say so. */
  sources: Partial<Record<ClaimSection, ClaimSources>>;
}

const EMPTY: ClaimPrefill = { values: {}, sources: {} };

/** Read values keyed by document type, the way HR's `bgv.extractedFields` is. */
export type ExtractedByDocType = Record<string, Record<string, string>>;

/**
 * The core mapping, over whatever has been read off the documents.
 *
 * Both screens that ask for these claims go through here - the candidate's
 * portal and HR's dialog - so neither can end up asking for something the
 * other already knows.
 */
export function claimPrefillFrom(extracted: ExtractedByDocType | undefined): ClaimPrefill {
  const byType = new Map<string, { label: string; fields: Record<string, string> }>();
  Object.entries(extracted ?? {}).forEach(([docType, fields]) => {
    if (fields && Object.keys(fields).length) {
      byType.set((docType || '').trim().toLowerCase(), { label: docType, fields });
    }
  });
  if (byType.size === 0) return EMPTY;

  const prefill: ClaimPrefill = { values: {}, sources: {} };
  MAPPINGS.forEach(({ docType, from, section, to }) => {
    const document = byType.get(docType.toLowerCase());
    const value = document?.fields[from];
    if (!document || !String(value ?? '').trim()) return;

    prefill.values[section] = { ...(prefill.values[section] ?? {}), [to]: value };
    prefill.sources[section] = { ...(prefill.sources[section] ?? {}), [to]: document.label };
  });
  return prefill;
}

/** What the uploaded documents can answer on the candidate's behalf. */
export function claimPrefill(submissions: DocSubmission[] | undefined): ClaimPrefill {
  if (!submissions?.length) return EMPTY;
  return claimPrefillFrom(extractedByDocType(submissions));
}

/**
 * Flatten submissions to the keyed shape, optionally letting values HR has
 * already reviewed override the raw read of the same document.
 *
 * A reviewed value is a person's correction of OCR, so it wins; the raw read
 * still matters because extraction runs as soon as a document is opened, while
 * `bgv.extractedFields` is only written once HR verifies one.
 */
export function extractedByDocType(
  submissions: DocSubmission[] | undefined,
  reviewed?: ExtractedByDocType,
): ExtractedByDocType {
  const byType: ExtractedByDocType = {};
  (submissions ?? []).forEach(submission => {
    const fields = submission.extraction?.fields;
    if (fields && Object.keys(fields).length) byType[submission.docType] = { ...fields };
  });
  Object.entries(reviewed ?? {}).forEach(([docType, fields]) => {
    if (fields && Object.keys(fields).length) {
      byType[docType] = { ...(byType[docType] ?? {}), ...fields };
    }
  });
  return byType;
}

/**
 * Merge a section's saved values over its suggestions.
 *
 * A saved blank is not an answer - the record carries a key for every field,
 * set or not - so an empty saved value leaves the suggestion in place.
 */
export function withPrefill(prefilled: ClaimValue | undefined, saved: ClaimValue): ClaimValue {
  const merged: ClaimValue = { ...saved };
  Object.entries(prefilled ?? {}).forEach(([key, value]) => {
    if (!String(merged[key] ?? '').trim()) merged[key] = value;
  });
  return merged;
}

/** The sources still worth showing: a field the candidate has since changed is
 *  their answer now, not a reading, and should stop claiming otherwise. */
export function visibleSources(
  sources: ClaimSources | undefined,
  prefilled: ClaimValue | undefined,
  current: ClaimValue | undefined,
): ClaimSources {
  if (!sources || !prefilled) return {};
  return Object.fromEntries(
    Object.entries(sources).filter(([key]) => {
      const suggested = String(prefilled[key] ?? '');
      return suggested !== '' && String(current?.[key] ?? '') === suggested;
    }),
  );
}
