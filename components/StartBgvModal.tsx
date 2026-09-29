'use client';

import React, { useState } from 'react';
import { X, Loader2, Fingerprint, AlertTriangle, ArrowLeft, ScanLine } from 'lucide-react';
import { BGV_CATALOG, bgvCheckLabel, type BgvCheck } from '@/lib/bgv-services';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from './Toaster';

interface Props {
  candidateName: string;
  pending?: boolean;
  /**
   * What OCR read off the candidate's documents, keyed by document type. HR
   * confirms these before anything is sent: OnGrid runs the checks against
   * these values, and a wrong digit means a failed check against a real person.
   */
  extracted?: Record<string, Record<string, string>>;
  /** Receives the selected check shortforms, e.g. ["PANV", "LAV", "EDUV"]. */
  onStart: (services: string[]) => void;
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
export function StartBgvModal({ candidateName, pending, extracted, onStart, onClose }: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  // Two steps: pick the checks, then confirm the data they will run against.
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  const [dataConfirmed, setDataConfirmed] = useState(false);

  const documents = Object.entries(extracted ?? {}).filter(
    ([, fields]) => Object.keys(fields ?? {}).length > 0,
  );

  const toggle = (code: string) =>
    setSelected(prev => (prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]));

  const CheckRow = ({ check }: { check: BgvCheck }) => {
    const on = selected.includes(check.code);
    return (
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-sm border px-2 py-1.5 transition ${
          on ? 'border-accent-300 bg-accent-50' : 'border-line bg-surface hover:bg-surface-muted'
        }`}
      >
        <Checkbox checked={on} onCheckedChange={() => toggle(check.code)} />
        <span className="truncate text-[11.5px] leading-tight text-gray-800" title={bgvCheckLabel(check)}>
          {check.name} <span className="font-mono text-[10px] text-gray-400">({check.code})</span>
        </span>
      </label>
    );
  };

  const next = () => {
    if (selected.length === 0) {
      toast.error('Select at least one verification check.');
      return;
    }
    setStep('confirm');
  };

  const start = () => {
    if (!dataConfirmed) {
      toast.error('Confirm the extracted details are accurate before sending.');
      return;
    }
    onStart(selected);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-surface p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Fingerprint size={15} className="text-accent-600" />
            {step === 'pick' ? 'Execute background verification' : 'Confirm the details to send'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11.5px] text-gray-500">
          {step === 'pick' ? 'Select the checks to run for ' : 'These values will be sent to OnGrid for '}
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
        </>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-900">
                <AlertTriangle size={13} /> Check these details before sending
              </p>
              <p className="mt-1 text-[11.5px] text-amber-800">
                OnGrid runs the checks against these values, not against the document images.
                A wrong digit means a failed check on a real person, and the check is still billed.
              </p>
            </div>

            {documents.length === 0 ? (
              <p className="rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-[11.5px] text-gray-600">
                No details were read from this candidate&apos;s documents. OnGrid needs the identity
                numbers to run these checks, so it will likely reject them.
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
            {step === 'confirm' && (
              <button
                onClick={() => setStep('pick')}
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
                Review details
              </button>
            ) : (
              <button
                onClick={start}
                disabled={pending || !dataConfirmed}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {pending && <Loader2 size={13} className="animate-spin" />}
                {pending ? 'Sending…' : 'Execute BGV'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartBgvModal;
