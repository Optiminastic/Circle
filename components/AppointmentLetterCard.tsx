'use client';

import React, { useRef, useState } from 'react';
import { FileText, Eye, Pencil, Plus, X, Printer, Loader2, Trash2 } from 'lucide-react';
import type { AppointmentLetterData, Candidate, OfferLetterData } from '@/types';
import { appointmentLetterFileBaseName, blankAppointmentLetter } from '@/lib/appointment-letter';
import { formatINRNumber } from '@/lib/offer-letter';
import { useCandidates } from '@/features/candidates/hooks';
import { useOnboardingEmails } from '@/features/onboarding/hooks';
import { nowISO } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from './Toaster';
import { AppointmentLetterPaged } from './AppointmentLetterPaged';

/** Upper bound for the annual CTC input: ₹1 crore. */
const MAX_ANNUAL_CTC = 10_000_000;

interface AppointmentLetterCardProps {
  candidateId: string;
  candidateName: string;
  appointmentLetter?: AppointmentLetterData;
  /** The candidate's offer letter, if any — CTC and date of joining are
   *  auto-filled from it when creating a fresh appointment letter (still editable). */
  offerLetter?: OfferLetterData;
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const inputCls =
  'w-full rounded-md border border-[#E4E6EA] bg-white px-2.5 py-1.5 text-[12px] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function AppointmentLetterCard({
  candidateId,
  candidateName,
  appointmentLetter,
  offerLetter,
}: AppointmentLetterCardProps) {
  const toast = useToast();
  const { data: candidates = [] } = useCandidates();
  const candidate = candidates.find((c: Candidate) => c.id === candidateId);
  const { saveAppointmentLetter, deleteAppointmentLetter } = useOnboardingEmails();

  const [mode, setMode] = useState<'form' | 'preview' | null>(null);
  const [draft, setDraft] = useState<AppointmentLetterData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pagesRootRef = useRef<HTMLDivElement>(null);

  const openCreate = () => {
    setDraft(appointmentLetter ?? blankAppointmentLetter(candidate, candidateName, nowISO(), offerLetter));
    setMode('form');
  };
  const openPreview = () => {
    setDraft(appointmentLetter ?? blankAppointmentLetter(candidate, candidateName, nowISO(), offerLetter));
    setMode('preview');
  };

  const set = <K extends keyof AppointmentLetterData>(key: K, value: AppointmentLetterData[K]) =>
    setDraft(d => (d ? { ...d, [key]: value } : d));
  const setNum = (key: keyof AppointmentLetterData, v: string) => set(key, (Number(v) || 0) as never);

  // Every field is required — a letter with a gap (e.g. no CTC, no joining date)
  // must not be savable.
  const missingField = (d: AppointmentLetterData | null): boolean =>
    !d ||
    !d.candidateName.trim() ||
    !d.address.trim() ||
    !d.role.trim() ||
    !d.location.trim() ||
    !d.ctcAnnual ||
    !d.joiningDate;

  const save = () => {
    if (!draft) return;
    if (missingField(draft)) {
      toast.error('Fill in every field before saving — nothing can be left blank.');
      return;
    }
    saveAppointmentLetter.mutate(
      { candidateId, appointmentLetter: { ...draft, updatedAt: nowISO() } },
      {
        onSuccess: () => {
          toast.success('Appointment letter saved.');
          setMode('preview');
        },
        onError: () => toast.error('Could not save the appointment letter — try again.'),
      },
    );
  };

  const del = () => {
    if (!appointmentLetter || deleting) return;
    toast.confirm({
      title: 'Delete this appointment letter?',
      description: 'The saved appointment letter and its details are cleared. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteAppointmentLetter.mutateAsync(candidateId);
          toast.success('Appointment letter deleted.');
        } catch {
          toast.error('Could not delete the appointment letter — try again.');
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const close = () => {
    setMode(null);
    setDraft(null);
  };

  // Print the exact self-paginated A4 pages shown in the preview — same technique
  // as the offer letter's printLetter().
  const printLetter = () => {
    const root = pagesRootRef.current;
    const pages = root?.querySelectorAll('.ol-page');
    if (!root || !pages || pages.length === 0) {
      toast.error('Preview is still rendering — try again in a moment.');
      return;
    }
    const w = window.open('', 'APPOINTMENT_LETTER_PRINT', 'width=900,height=1200');
    if (!w) {
      toast.error('Allow pop-ups to print the appointment letter.');
      return;
    }
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(n =>
        n.tagName === 'LINK'
          ? `<link rel="stylesheet" href="${(n as HTMLLinkElement).href}">`
          : n.outerHTML,
      )
      .join('\n');
    const pagesHtml = Array.from(pages)
      .map(p => (p as HTMLElement).outerHTML)
      .join('');
    const fileTitle = appointmentLetterFileBaseName(draft?.candidateName);
    w.document.write(
      `<!doctype html><html><head><title>${fileTitle}</title>${styles}<style>` +
        `@page { size: A4; margin: 0; }` +
        `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }` +
        `html, body { margin: 0 !important; padding: 0 !important; background: #fff; }` +
        `.ol-page { width: 794px !important; height: 1123px !important; position: relative; overflow: hidden; page-break-after: always; break-after: page; }` +
        `.ol-page:last-child { page-break-after: auto; break-after: auto; }` +
        `</style></head><body>${pagesHtml}</body></html>`,
    );
    w.document.close();
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      w.focus();
      w.print();
    };
    w.onload = () => setTimeout(fire, 350);
    setTimeout(fire, 2500);
  };

  return (
    <div className="rounded-2xl border border-[#E4E6EA] bg-white p-4 shadow-2xs">
      <div className="mb-1.5 flex items-center gap-1.5">
        <FileText size={13} className="text-accent-600" />
        <h4 className="text-xs font-bold text-gray-900">Appointment letter</h4>
      </div>

      {appointmentLetter ? (
        <>
          <p className="mb-3 text-[11px] text-gray-500">
            Saved {fmtDate(appointmentLetter.updatedAt || appointmentLetter.createdAt)}
            {appointmentLetter.ctcAnnual ? ` · CTC ₹${formatINRNumber(appointmentLetter.ctcAnnual)}` : ''}.
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
            <button
              onClick={del}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
            Build the candidate&apos;s letter of appointment in the Optiminastic format — fill the
            details, then preview and edit anytime.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-accent-700"
          >
            <Plus size={12} /> Create appointment letter
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
                {appointmentLetter ? 'Edit' : 'Create'} appointment letter
              </h3>
              <button onClick={close} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Candidate name *">
                  <input className={inputCls} value={draft.candidateName} onChange={e => set('candidateName', e.target.value)} />
                </Field>
                <Field label="Address *">
                  <input className={inputCls} value={draft.address} onChange={e => set('address', e.target.value)} placeholder="Candidate's postal address" />
                </Field>
                <Field label="Role *">
                  <input className={inputCls} value={draft.role} onChange={e => set('role', e.target.value)} />
                </Field>
                <Field label="Location *">
                  <input className={inputCls} value={draft.location} onChange={e => set('location', e.target.value)} />
                </Field>
                <Field label="Annual CTC (INR) *">
                  {/* Capped at ₹1 crore — a higher value is clamped, not accepted. */}
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={MAX_ANNUAL_CTC}
                    value={draft.ctcAnnual || ''}
                    onChange={e => setNum('ctcAnnual', String(Math.min(Number(e.target.value) || 0, MAX_ANNUAL_CTC)))}
                    placeholder="e.g. 180000"
                  />
                </Field>
                <Field label="Date of joining *">
                  <DatePicker value={draft.joiningDate} onChange={v => set('joiningDate', v)} />
                </Field>
              </div>
              <p className="text-[11px] text-gray-400">* All fields are required.</p>
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
                disabled={saveAppointmentLetter.isPending || missingField(draft)}
                title={missingField(draft) ? 'Fill in every field before saving' : undefined}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {saveAppointmentLetter.isPending && <Loader2 size={14} className="animate-spin" />}
                Save appointment letter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal — self-paginated A4 pages */}
      {mode === 'preview' && draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={close}>
          <div className="my-4 w-full max-w-[860px] rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E4E6EA] px-4 py-2.5">
              <h3 className="text-sm font-bold text-gray-900">Appointment letter preview</h3>
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
            <div className="max-h-[80vh] overflow-auto bg-[#F1F3F5] p-4">
              <div className="[&_.ol-page]:mx-auto [&_.ol-page]:mb-4 [&_.ol-page]:shadow-md">
                <AppointmentLetterPaged data={draft} rootRef={pagesRootRef} />
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

export default AppointmentLetterCard;
