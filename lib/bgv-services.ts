/**
 * Background-verification check catalogue. HR picks which checks to run when
 * starting a BGV; only the `code` (the service shortform) is stored on the BGV
 * record — see BGVRequirement.services.
 *
 * Nodes render in the order declared below: a `group` becomes one accordion, a
 * `check` becomes a standalone checkbox.
 *
 * Every `code` here is a member of OnGrid's real `OfferingCode` enum (their API
 * rejects anything else). Note their published OpenAPI spec lists only 13 codes
 * and is stale — the live enum has 41. The law-firm criminal check is `PVLF`;
 * there is no `CRCLF`.
 *
 * `name` is our display label only and is never sent to OnGrid.
 */

export interface BgvCheck {
  /** Shortform stored on the BGV record, e.g. "PANV". Must be an OnGrid OfferingCode. */
  code: string;
  /** Human name shown next to the code. */
  name: string;
}

export type BgvCatalogNode =
  | { kind: 'group'; label: string; checks: BgvCheck[] }
  | { kind: 'check'; check: BgvCheck };

export const BGV_CATALOG: BgvCatalogNode[] = [
  {
    kind: 'group',
    label: 'ID Verification',
    checks: [
      { code: 'PANV', name: 'PAN Card' },
      { code: 'AV', name: 'Aadhaar Card' },
    ],
  },
  {
    kind: 'group',
    label: 'Address Verification',
    checks: [
      { code: 'LAV', name: 'Local Address Verification' },
      { code: 'PAV', name: 'Permanent Address Verification' },
    ],
  },
  { kind: 'check', check: { code: 'CCRV', name: 'Criminal Court Record Verification' } },
  { kind: 'check', check: { code: 'EDUV', name: 'Education Verification' } },
  { kind: 'check', check: { code: 'EMPV', name: 'Employment Verification' } },
  { kind: 'check', check: { code: 'PRC', name: 'Professional Reference Check' } },
  { kind: 'check', check: { code: 'EHC', name: 'Employment History Check' } },
];

/**
 * Checks Circle can start over the API today. Everything else in the catalogue
 * is agreed with OnGrid but has to be started in their portal - either it has
 * no API endpoint (AV), needs a record Circle does not collect (EDUV, EMPV),
 * needs configuration on OnGrid's side (PRC, PAV), or is erroring there (EHC).
 *
 * The backend is authoritative and re-checks this; the list exists so the
 * dialog doesn't offer HR a check that cannot run.
 */
export const RUNNABLE_BGV_CODES: readonly string[] = [
  'PANV',
  'CCRV',
  'LAV',
  'EHC',
  'EDUV',
  'EMPV',
  'PAV',
];

export const isBgvCheckRunnable = (code: string): boolean =>
  RUNNABLE_BGV_CODES.includes(code);

/** Why a check can't be started from Circle, for the ones that can't. */
export const BGV_UNAVAILABLE_REASON: Record<string, string> = {
  AV: 'No API endpoint - UIDAI needs the candidate’s OTP consent, so run this from the OnGrid portal.',
  PRC: 'Needs a reference schema selected in OnGrid, and the schema ids are not exposed by the API.',
};

/** Option label as shown to HR: "PAN Card (PANV)". */
export const bgvCheckLabel = (c: BgvCheck): string => `${c.name} (${c.code})`;

/** Every check, flattened — used to resolve stored codes back to names. */
export const ALL_BGV_CHECKS: BgvCheck[] = BGV_CATALOG.flatMap(n =>
  n.kind === 'group' ? n.checks : [n.check],
);

/** Look a check up by its stored shortform. */
export const bgvCheckByCode = (code: string): BgvCheck | undefined =>
  ALL_BGV_CHECKS.find(c => c.code === code);
