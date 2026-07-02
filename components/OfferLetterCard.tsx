'use client';

import React, { useState } from 'react';
import { FileText, Eye, Pencil, Plus, X, Printer, Loader2 } from 'lucide-react';
import type { Candidate, OfferLetterData } from '@/types';
import { blankOfferLetter, computeBreakup, formatINRNumber } from '@/lib/offer-letter';
import { useCandidates } from '@/features/candidates/hooks';
import { useOnboardingEmails } from '@/features/onboarding/hooks';
import { nowISO } from '@/lib/utils';
import { useToast } from './Toaster';
import { OfferLetterDocument } from './OfferLetterDocument';

interface OfferLetterCardProps {
  candidateId: string;
  candidateName: string;
  offerLetter?: OfferLetterData;
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const inputCls =
  'w-full rounded-md border border-[#E4E6EA] bg-white px-2.5 py-1.5 text-[12px] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function OfferLetterCard({ candidateId, candidateName, offerLetter }: OfferLetterCardProps) {
  const toast = useToast();
  const { data: candidates = [] } = useCandidates();
  const candidate = candidates.find((c: Candidate) => c.id === candidateId);
  const { saveOfferLetter } = useOnboardingEmails();

  const [mode, setMode] = useState<'form' | 'preview' | null>(null);
  const [draft, setDraft] = useState<OfferLetterData | null>(null);

  const openCreate = () => {
    setDraft(offerLetter ?? blankOfferLetter(candidate, candidateName, nowISO()));
    setMode('form');
  };
  const openPreview = () => {
    setDraft(offerLetter ?? blankOfferLetter(candidate, candidateName, nowISO()));
    setMode('preview');
  };

  const set = <K extends keyof OfferLetterData>(key: K, value: OfferLetterData[K]) =>
    setDraft(d => (d ? { ...d, [key]: value } : d));
  const setNum = (key: keyof OfferLetterData, v: string) => set(key, (Number(v) || 0) as never);

  const save = () => {
    if (!draft) return;
    saveOfferLetter.mutate(
      { candidateId, offerLetter: { ...draft, updatedAt: nowISO() } },
      {
        onSuccess: () => {
          toast.success('Offer letter saved.');
          setMode('preview');
        },
        onError: () => toast.error('Could not save the offer letter — try again.'),
      },
    );
  };

  const close = () => {
    setMode(null);
    setDraft(null);
  };

  // Print in a clean popup: no app chrome, no fixed modal, no browser date/title
  // (via @page margin:0). The <thead>/<tfoot> banners repeat on every page and the
  // body paginates between them.
  const printLetter = () => {
    const el = document.getElementById('offer-letter-print');
    if (!el) return;
    const w = window.open('', 'OFFER_LETTER_PRINT', 'width=900,height=1200');
    if (!w) {
      toast.error('Allow pop-ups to print the offer letter.');
      return;
    }
    // Carry over the app's stylesheets so Tailwind classes render in the popup.
    // <link> hrefs MUST be absolutised — root-relative "/_next/..." URLs don't
    // resolve against the popup's about:blank origin, which would leave the table
    // completely unstyled (no borders/shading).
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(n =>
        n.tagName === 'LINK'
          ? `<link rel="stylesheet" href="${(n as HTMLLinkElement).href}">`
          : n.outerHTML,
      )
      .join('\n');
    w.document.write(
      `<!doctype html><html><head><title></title>${styles}<style>` +
        `@page { size: A4; margin: 0; }` +
        // Force the grey/pink table shading to actually print.
        `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }` +
        `html, body { margin: 0 !important; padding: 0 !important; background: #fff; }` +
        `#offer-letter-print { width: 100% !important; max-width: none !important; margin: 0 !important; }` +
        `table.ol-table { width: 100%; border-collapse: collapse; }` +
        `thead.ol-band { display: table-header-group; }` +
        // tfoot stays in flow as an invisible SPACER (reserves the footer's exact
        // height on every page) while #ol-fixed-footer draws the real footer pinned
        // to the physical page bottom — so it's flush even on a short last page.
        `tfoot.ol-band { display: table-footer-group; }` +
        `tfoot.ol-band img { visibility: hidden !important; }` +
        `#ol-fixed-footer { display: block !important; position: fixed; left: 0; right: 0; bottom: 0; width: 100% !important; margin: 0 !important; }` +
        `.ol-band td { padding: 0 !important; }` +
        `.ol-content { padding: 10mm 16mm !important; }` +
        `</style></head><body>${el.outerHTML}</body></html>`,
    );
    w.document.close();
    // Print once the popup has loaded its stylesheets + images (with a fallback).
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      w.focus();
      w.print();
    };
    w.onload = () => setTimeout(fire, 250);
    setTimeout(fire, 2500); // fallback if a resource stalls
  };

  return (
    <div className="rounded-2xl border border-[#E4E6EA] bg-white p-4 shadow-2xs">
      <div className="mb-1.5 flex items-center gap-1.5">
        <FileText size={13} className="text-accent-600" />
        <h4 className="text-xs font-bold text-gray-900">Offer letter</h4>
      </div>

      {offerLetter ? (
        <>
          <p className="mb-3 text-[11px] text-gray-500">
            Created {fmtDate(offerLetter.createdAt)}
            {offerLetter.ctcAnnual ? ` · CTC ₹${formatINRNumber(offerLetter.ctcAnnual)}` : ''}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openPreview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
            >
              <Eye size={12} /> Preview
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
            Build the candidate&apos;s offer letter in the Optiminastic format — fill the details and CTC
            breakup, then preview and edit anytime.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-accent-700"
          >
            <Plus size={12} /> Create offer letter
          </button>
        </>
      )}

      {/* Form modal */}
      {mode === 'form' && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {offerLetter ? 'Edit' : 'Create'} offer letter
              </h3>
              <button onClick={close} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Salutation">
                  <select
                    className={inputCls}
                    value={draft.salutation}
                    onChange={e => set('salutation', e.target.value)}
                  >
                    <option>Mr.</option>
                    <option>Ms.</option>
                    <option>Mx.</option>
                  </select>
                </Field>
                <Field label="Candidate name">
                  <input className={inputCls} value={draft.candidateName} onChange={e => set('candidateName', e.target.value)} />
                </Field>
                <Field label="Role">
                  <input className={inputCls} value={draft.role} onChange={e => set('role', e.target.value)} />
                </Field>
                <Field label="Location">
                  <input className={inputCls} value={draft.location} onChange={e => set('location', e.target.value)} />
                </Field>
                <Field label="Annual CTC (INR)">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={draft.ctcAnnual || ''}
                    onChange={e => setNum('ctcAnnual', e.target.value)}
                    placeholder="e.g. 180000"
                  />
                </Field>
                <Field label="Medical insurance (INR)">
                  <input className={inputCls} type="number" min={0} value={draft.medicalInsurance || ''} onChange={e => setNum('medicalInsurance', e.target.value)} />
                </Field>
                <Field label="Joining / start date">
                  <input className={inputCls} value={draft.joiningDate} onChange={e => set('joiningDate', e.target.value)} placeholder="e.g. 12th March 2026" />
                </Field>
                <Field label="Probation period">
                  <input className={inputCls} value={draft.probationPeriod} onChange={e => set('probationPeriod', e.target.value)} placeholder="e.g. six months" />
                </Field>
              </div>

              {/* CTC breakup (monthly inputs; annual = ×12; totals auto) */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  CTC breakup — monthly amounts (₹)
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="Basic"><input className={inputCls} type="number" min={0} value={draft.basic || ''} onChange={e => setNum('basic', e.target.value)} /></Field>
                  <Field label="HRA"><input className={inputCls} type="number" min={0} value={draft.hra || ''} onChange={e => setNum('hra', e.target.value)} /></Field>
                  <Field label="Special allowance"><input className={inputCls} type="number" min={0} value={draft.specialAllowance || ''} onChange={e => setNum('specialAllowance', e.target.value)} /></Field>
                  <Field label="PF (employer)"><input className={inputCls} type="number" min={0} value={draft.pfEmployer || ''} onChange={e => setNum('pfEmployer', e.target.value)} /></Field>
                  <Field label="PF (deduction)"><input className={inputCls} type="number" min={0} value={draft.pfEmployee || ''} onChange={e => setNum('pfEmployee', e.target.value)} /></Field>
                  <Field label="Professional tax"><input className={inputCls} type="number" min={0} value={draft.professionalTax || ''} onChange={e => setNum('professionalTax', e.target.value)} /></Field>
                </div>
                {/* Live computed summary */}
                <div className="mt-2 space-y-0.5 rounded-lg bg-[#F7F8FA] p-2.5 text-[11px] text-gray-600">
                  {computeBreakup(draft)
                    .filter(r => r.strong || r.highlight)
                    .map((r, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="font-medium">{r.label}</span>
                        <span>
                          ₹{formatINRNumber(r.monthly)}/mo · ₹{formatINRNumber(r.annual)}/yr
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={close} className="rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-[#F1F3F5]">
                Cancel
              </button>
              <button onClick={() => setMode('preview')} className="rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-[#F1F3F5]">
                Preview
              </button>
              <button
                onClick={save}
                disabled={saveOfferLetter.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {saveOfferLetter.isPending && <Loader2 size={14} className="animate-spin" />}
                Save offer letter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {mode === 'preview' && draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={close}>
          <div className="my-4 w-full max-w-[860px] rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E4E6EA] px-4 py-2.5">
              <h3 className="text-sm font-bold text-gray-900">Offer letter preview</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setMode('form')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-[#F1F3F5]">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={printLetter} className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-accent-700">
                  <Printer size={12} /> Print / Save PDF
                </button>
                <button onClick={close} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-y-auto bg-[#F1F3F5] p-4">
              <div className="rounded-lg bg-white shadow-sm">
                <OfferLetterDocument data={draft} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-[11px] font-semibold text-gray-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default OfferLetterCard;
