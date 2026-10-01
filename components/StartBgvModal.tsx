'use client';

import React, { useState } from 'react';
import { X, Loader2, Fingerprint, AlertTriangle, ArrowLeft, ScanLine, Send } from 'lucide-react';
import {
  BGV_CATALOG,
  bgvCheckLabel,
  isBgvCheckRunnable,
  type BgvCheck,
} from '@/lib/bgv-services';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CLAIM_SECTIONS,
  checksNeeding,
  describeNeed,
  isSectionComplete,
  missingDocuments,
  sectionsFor,
  toClaimValue,
  type ClaimDetails,
  type ClaimSection,
  type ClaimValue,
} from '@/lib/bgv-claim-fields';
import { ClaimFields, MissingNote } from '@/components/bgv/ClaimFields';
import { useToast } from './Toaster';
import { ModalShell } from '@/components/ui/modal-shell';

interface Props {
  candidateName: string;
  pending?: boolean;
  /**
   * What OCR read off the candidate's documents, keyed by document type. HR
   * confirms these before anything is sent: OnGrid runs the checks against
   * these values, and a wrong digit means a failed check against a real person.
   */
  extracted?: Record<string, Record<string, string>>;
  /**
   * What the candidate already filled in on their documents portal. It
   * pre-fills the claim step, so HR types only what is still missing rather
   * than re-entering everything - and can correct anything that looks wrong.
   */
  claims?: ClaimDetails;
  /**
   * Document types the candidate has actually uploaded. Some checks cannot run
   * without one, and HR cannot supply it by typing - so the dialog blocks
   * rather than spending a billed check that is going to fail.
   */
  uploadedDocTypes?: string[];
  /**
   * Checks OnGrid is already running. Offering them again does not restart
   * anything useful - it requests a second, separately billed check - so they
   * are shown as running and cannot be selected.
   */
  alreadyStarted?: string[];
  /** Opens the "request documents" flow, when something is missing. */
  onRequestDocuments?: () => void;
  /** The selected shortforms plus the claim values the chosen checks need. */
  onStart: (services: string[], claims: ClaimDetails) => void;
  onClose: () => void;
}

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

/**
 * "Start verification" — HR picks which checks to run. Grouped checks render as
 * accordions; only each check's shortform (`code`) is stored on the BGV record.
 */
export function StartBgvModal({
  candidateName,
  pending,
  extracted,
  claims,
  uploadedDocTypes,
  alreadyStarted,
  onRequestDocuments,
  onStart,
  onClose,
}: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  // Three steps: pick the checks, fill in what they need, confirm and send.
  // The middle one is skipped when nothing the candidate can state is required.
  const [step, setStep] = useState<'pick' | 'details' | 'confirm'>('pick');
  const [dataConfirmed, setDataConfirmed] = useState(false);
  // Seeded from the candidate's portal answers; HR edits from there.
  const [values, setValues] = useState<Record<ClaimSection, ClaimValue>>(() => ({
    uan: claims?.uan ? { uan: claims.uan } : {},
    education: toClaimValue(claims?.education),
    employment: toClaimValue(claims?.employment),
    permanentAddress: toClaimValue(claims?.permanentAddress),
  }));

  // Only the claims the chosen checks actually need are asked for.
  const neededSections = sectionsFor(selected);
  const missingDocs = missingDocuments(selected, uploadedDocTypes ?? []);
  const running = new Set(alreadyStarted ?? []);
  const incomplete = neededSections.filter(s => !isSectionComplete(s, values[s]));

  const claimDetails = (): ClaimDetails => ({
    ...(neededSections.includes('uan') ? { uan: String(values.uan.uan ?? '').trim() } : {}),
    ...(neededSections.includes('education') ? { education: values.education } : {}),
    ...(neededSections.includes('employment') ? { employment: values.employment } : {}),
    ...(neededSections.includes('permanentAddress')
      ? { permanentAddress: values.permanentAddress }
      : {}),
  });

  const documents = Object.entries(extracted ?? {}).filter(
    ([, fields]) => Object.keys(fields ?? {}).length > 0,
  );

  const toggle = (code: string) =>
    setSelected(prev => (prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]));

  const CheckRow = ({ check }: { check: BgvCheck }) => {
    const on = selected.includes(check.code);
    // Offering a check Circle cannot start just produces a failure row after
    // the fact, so say so here instead.
    const isRunning = running.has(check.code);
    const runnable = isBgvCheckRunnable(check.code) && !isRunning;
    return (
      <label
        title={
          isRunning
            ? `${bgvCheckLabel(check)} - already running at OnGrid`
            : runnable
              ? bgvCheckLabel(check)
              : `${bgvCheckLabel(check)} - not available from Circle`
        }
        className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 transition ${
          !runnable
            ? 'cursor-not-allowed border-line bg-surface-sunken opacity-60'
            : on
              ? 'cursor-pointer border-accent-300 bg-accent-50'
              : 'cursor-pointer border-line bg-surface hover:bg-surface-muted'
        }`}
      >
        <Checkbox checked={on} disabled={!runnable} onCheckedChange={() => runnable && toggle(check.code)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] leading-tight text-gray-800">
            {check.name} <span className="font-mono text-[10px] text-gray-400">({check.code})</span>
          </span>
          {!runnable && (
            <span className="block truncate text-[10px] leading-tight text-gray-500">
              {isRunning ? 'Already running' : 'Portal only'}
            </span>
          )}
        </span>
      </label>
    );
  };

  const next = () => {
    if (selected.length === 0) {
      toast.error('Select at least one verification check.');
      return;
    }
    setStep(neededSections.length > 0 ? 'details' : 'confirm');
  };

  const toConfirm = () => {
    if (incomplete.length > 0) {
      toast.error(
        `Fill in the ${CLAIM_SECTIONS[incomplete[0]].title.toLowerCase()} — the check cannot run without it.`,
      );
      return;
    }
    setStep('confirm');
  };

  const start = () => {
    if (missingDocs.length > 0) {
      toast.error(
        `${missingDocs[0].code} needs ${describeNeed(missingDocs[0].need)} uploaded first.`,
      );
      return;
    }
    if (!dataConfirmed) {
      toast.error('Confirm the extracted details are accurate before sending.');
      return;
    }
    onStart(selected, claimDetails());
  };

  const CheckGrid = ({ checks }: { checks: BgvCheck[] }) => (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {checks.map(c => (
        <CheckRow key={c.code} check={c} />
      ))}
    </div>
  );

  // All grouped checks render as accordions first, then the standalone checks.
  // Each keeps its relative order from the catalogue.
  const groups = BGV_CATALOG.flatMap(n => (n.kind === 'group' ? [n] : []));
  const singles = BGV_CATALOG.flatMap(n => (n.kind === 'check' ? [n.check] : []));

  return (
    <ModalShell onClose={onClose} size="lg" label="Execute background verification" className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Fingerprint size={15} className="text-accent-600" />
            {step === 'pick'
              ? 'Execute background verification'
              : step === 'details'
                ? 'Details these checks need'
                : 'Confirm the details to send'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11.5px] text-gray-500">
          {step === 'pick'
            ? 'Select the checks to run for '
            : step === 'details'
              ? 'Anything already filled in came from the documents portal. Correct or complete it for '
              : 'These values will be sent to OnGrid for '}
          <span className="font-semibold text-gray-700">{candidateName}</span>.
        </p>

        {step === 'pick' && (
        <>
        {/* Grouped checks — one accordion each */}
        <Accordion type="multiple" className="space-y-1.5">
          {groups.map(node => {
            const count = node.checks.filter(c => selected.includes(c.code)).length;
            return (
              <AccordionItem key={node.label} value={node.label}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    {node.label}
                    <span className="font-normal text-gray-400">({node.checks.length})</span>
                    {count > 0 && (
                      <span className="rounded-full bg-accent-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent-700">
                        {count} selected
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <CheckGrid checks={node.checks} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Standalone checks */}
        <p className="mb-1.5 mt-3 font-mono text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
          Other checks
        </p>
        <CheckGrid checks={singles} />

        {/* Said here as well as on the last step, so a long form isn't filled
            in for a check that cannot run yet. */}
        {missingDocs.length > 0 && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11.5px] text-red-800">
              {missingDocs.map(({ code, need }) => (
                <span key={code} className="block">
                  <span className="font-mono text-[10.5px] font-bold">{code}</span> needs{' '}
                  {describeNeed(need)} uploaded first.
                </span>
              ))}
            </p>
          </div>
        )}
        </>
        )}

        {step === 'details' && (
          <div className="space-y-3">
            <p className="rounded-md border border-line-soft bg-surface-muted px-3 py-2 text-[11px] leading-relaxed text-gray-600">
              These checks verify what the candidate states, not what is printed on their
              documents, so OnGrid needs the values themselves. Fields marked{' '}
              <span className="text-red-500">*</span> are required — without them the check is
              refused rather than run.
            </p>

            {neededSections.map(section => {
              const def = CLAIM_SECTIONS[section];
              const asked = checksNeeding(section, selected);
              const done = isSectionComplete(section, values[section]);
              return (
                <section key={section} className="space-y-2.5 rounded-md border border-line bg-surface p-3">
                  <header className="space-y-0.5">
                    <h4 className="flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-gray-900">
                      {def.title}
                      <span className="font-mono text-[9.5px] font-bold text-accent-700">
                        {asked.join(' · ')}
                      </span>
                      {done && (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700">
                          complete
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-gray-500">{def.explains}</p>
                  </header>
                  <ClaimFields
                    section={section}
                    value={values[section]}
                    onChange={nextValue =>
                      setValues(prev => ({ ...prev, [section]: nextValue }))
                    }
                    idPrefix="hr"
                  />
                  <MissingNote section={section} value={values[section]} />
                </section>
              );
            })}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-900">
                <AlertTriangle size={13} /> Check these details before sending
              </p>
              <p className="mt-1 text-[11.5px] text-amber-800">
                A wrong value means a failed check on a real person, and the check is still billed.
              </p>
            </div>

            {/* Documents only the candidate can supply. HR cannot type their way
                past this, so the way out is to send the link, not to continue. */}
            {missingDocs.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-red-900">
                  <AlertTriangle size={13} /> Waiting on the candidate
                </p>
                <ul className="mt-1.5 space-y-1">
                  {missingDocs.map(({ code, need }) => (
                    <li key={code} className="text-[11.5px] text-red-800">
                      <span className="font-mono text-[10.5px] font-bold">{code}</span> needs{' '}
                      {describeNeed(need)}, which has not been uploaded.
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] text-red-700">
                  Only the candidate can upload these. Send them the documents link and run these
                  checks once the files are in — sending now just buys a failed check.
                </p>
                {onRequestDocuments && (
                  <button
                    type="button"
                    onClick={onRequestDocuments}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-surface px-3 py-1.5 text-[12px] font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <Send size={12} /> Send documents link
                  </button>
                )}
              </div>
            )}

            {documents.length === 0 ? (
              <p className="rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-[11.5px] text-gray-600">
                Nothing was read off this candidate&apos;s documents by Circle. That does not stop
                these checks: OnGrid reads identity documents itself, and the rest run against the
                details above.
              </p>
            ) : (
              documents.map(([docType, fields]) => (
                <div key={docType} className="rounded-md border border-line bg-surface px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-800">
                    <ScanLine size={12} className="text-accent-600" /> {docType}
                  </p>
                  <dl className="mt-1.5 space-y-1">
                    {Object.entries(fields).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-[11.5px]">
                        <dt className="w-28 shrink-0 text-gray-500">{FIELD_LABELS[key] ?? key}</dt>
                        <dd className="min-w-0 break-words font-medium text-gray-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))
            )}

            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-line bg-surface px-3 py-2.5">
              <Checkbox
                checked={dataConfirmed}
                onCheckedChange={() => setDataConfirmed(v => !v)}
                className="mt-0.5"
              />
              <span className="text-[11.5px] leading-snug text-gray-800">
                I have checked these details against the candidate&apos;s documents and they are
                accurate.
              </span>
            </label>

            <p className="text-[11px] text-gray-500">
              Sending <span className="font-semibold text-gray-700">{selected.length}</span> check
              {selected.length === 1 ? '' : 's'}:{' '}
              <span className="font-mono text-[10.5px] text-gray-500">{selected.join(', ')}</span>
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
          <p className="min-w-0 text-[11.5px] text-gray-600">
            <span className="font-semibold text-gray-900">{selected.length}</span> selected
            {selected.length > 0 && (
              <span className="ml-1 font-mono text-[10.5px] text-gray-400">({selected.join(', ')})</span>
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onClose}
              disabled={pending}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 hover:bg-surface-sunken disabled:opacity-60"
            >
              Cancel
            </button>
            {step !== 'pick' && (
              <button
                onClick={() =>
                  setStep(
                    step === 'confirm' && neededSections.length > 0 ? 'details' : 'pick',
                  )
                }
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 hover:bg-surface-sunken disabled:opacity-60"
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}
            {step === 'pick' ? (
              <button
                onClick={next}
                disabled={selected.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {neededSections.length > 0 ? 'Add details' : 'Review details'}
              </button>
            ) : step === 'details' ? (
              <button
                onClick={toConfirm}
                disabled={incomplete.length > 0}
                title={
                  incomplete.length > 0
                    ? `Still needed: ${incomplete.map(s => CLAIM_SECTIONS[s].title.toLowerCase()).join(', ')}`
                    : undefined
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                Review details
              </button>
            ) : (
              <button
                onClick={start}
                disabled={pending || !dataConfirmed || missingDocs.length > 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {pending && <Loader2 size={13} className="animate-spin" />}
                {pending ? 'Sending…' : 'Execute BGV'}
              </button>
            )}
          </div>
        </div>
    </ModalShell>
  );
}

export default StartBgvModal;
