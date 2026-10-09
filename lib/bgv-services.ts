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
    // Aadhaar is deliberately absent. OnGrid has no Aadhaar verification
    // offering - their ID checks are PAN, Driving Licence, Passport and Voter
    // ID. An 'AV' entry here once read "Aadhaar Card", but AV is OnGrid's
    // *address* verification family (beside LAV, PAV, BAV, XAV), and
    // `/v1/individual/{id}/av` answers 404 because no such route exists.
    checks: [{ code: 'PANV', name: 'PAN Card' }],
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
 * Checks Circle can start over the API. Every check in the catalogue is now on
 * this list, so the dialog offers all of them.
 *
 * It is kept rather than deleted because it is the one place that says what
 * Circle can start, and the answer has changed several times. The backend is
 * authoritative either way: it re-checks, and it is what reports a check that
 * cannot run for want of data (no UAN, no qualification details, no configured
 * reference schema).
 */
export const RUNNABLE_BGV_CODES: readonly string[] = [
  'PANV',
  'CCRV',
  'LAV',
  'EHC',
  'EDUV',
  'EMPV',
  'PAV',
  'PRC',
];

export const isBgvCheckRunnable = (code: string): boolean =>
  RUNNABLE_BGV_CODES.includes(code);

/** Option label as shown to HR: "PAN Card (PANV)". */
export const bgvCheckLabel = (c: BgvCheck): string => `${c.name} (${c.code})`;

/** Every check, flattened — used to resolve stored codes back to names. */
export const ALL_BGV_CHECKS: BgvCheck[] = BGV_CATALOG.flatMap(n =>
  n.kind === 'group' ? n.checks : [n.check],
);

/** Look a check up by its stored shortform. */
export const bgvCheckByCode = (code: string): BgvCheck | undefined =>
  ALL_BGV_CHECKS.find(c => c.code === code);

/**
 * The one status word we have actually seen OnGrid return for a check that has
 * not finished.
 *
 * Everything else is passed through untranslated, here as everywhere else: a
 * finished check's word is OnGrid's to define, and mapping an unseen value
 * onto "passed" or "failed" would be inventing a verdict. Until a real check
 * completes against the production community, "running" and "finished" is the
 * most this can honestly say.
 */
export const ONGRID_IN_PROGRESS = 'INPROGRESS';

/** Is this check still with OnGrid? Spelling is normalised because the same
 *  state has arrived as "INPROGRESS" and "IN_PROGRESS" from their side. */
export const isCheckRunning = (status: string | undefined): boolean =>
  (status ?? '').trim().toUpperCase().replace(/[\s_-]/g, '') === ONGRID_IN_PROGRESS;
