'use client';

import React, { useState } from 'react';
import { X, Loader2, Fingerprint } from 'lucide-react';
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
  /** Receives the selected check shortforms, e.g. ["PANV", "LAV", "EDUV"]. */
  onStart: (services: string[]) => void;
  onClose: () => void;
}

/**
 * "Start verification" — HR picks which checks to run. Grouped checks render as
 * accordions; only each check's shortform (`code`) is stored on the BGV record.
 */
export function StartBgvModal({ candidateName, pending, onStart, onClose }: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (code: string) =>
    setSelected(prev => (prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]));

  const CheckRow = ({ check }: { check: BgvCheck }) => {
    const on = selected.includes(check.code);
    return (
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition ${
          on ? 'border-accent-300 bg-accent-50' : 'border-[#E4E6EA] bg-white hover:bg-[#F7F8FA]'
        }`}
      >
        <Checkbox checked={on} onCheckedChange={() => toggle(check.code)} />
        <span className="truncate text-[11.5px] leading-tight text-gray-800" title={bgvCheckLabel(check)}>
          {check.name} <span className="font-mono text-[10px] text-gray-400">({check.code})</span>
        </span>
      </label>
    );
  };

  const start = () => {
    if (selected.length === 0) {
      toast.error('Select at least one verification check.');
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
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Fingerprint size={15} className="text-accent-600" /> Start background verification
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11.5px] text-gray-500">
          Select the checks to run for <span className="font-semibold text-gray-700">{candidateName}</span>.
        </p>

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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECEDF0] pt-3">
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
              className="rounded-lg border border-[#E4E6EA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 hover:bg-[#F1F3F5] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={start}
              disabled={pending || selected.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
            >
              {pending && <Loader2 size={13} className="animate-spin" />}
              {pending ? 'Sending…' : 'Send for verification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartBgvModal;
