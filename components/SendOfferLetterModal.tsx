'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Upload, FileText, Link2 } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import type { Candidate, OfferLetterData } from '@/types';
import { useOnboardingEmails } from '@/features/onboarding/hooks';
import { createSignOfferRequest, signOfferPath, SIGN_OFFER_TTL_HOURS } from '@/lib/sign-offer';
import { pagesToPdfBlob, blobToBase64 } from '@/lib/offer-letter-pdf';
import { offerLetterFileBaseName } from '@/lib/offer-letter';
import { DatePicker } from '@/components/ui/date-picker';
import { OfferLetterPaged } from './OfferLetterPaged';
import { useToast } from './Toaster';

interface Props {
  candidate?: Candidate;
  candidateId: string;
  candidateName: string;
  email: string;
  offerLetter?: OfferLetterData;
  onClose: () => void;
}

function offerFileName(d?: OfferLetterData): string {
  return `${offerLetterFileBaseName(d?.candidateName)}.pdf`;
}

/** Format the offer letter's joining date (yyyy-MM-dd) as "23rd July 2026". */
function formatJoin(value?: string): string {
  if (!value) return '[Date of Joining]';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const dt = parse(m[1], 'yyyy-MM-dd', new Date());
    if (isValid(dt)) return format(dt, 'do MMMM yyyy');
  }
  return value;
}

const inputCls =
  'w-full rounded-md border border-[#E4E6EA] bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function SendOfferLetterModal({
  candidate,
  candidateId,
  candidateName,
  email,
  offerLetter,
  onClose,
}: Props) {
  const toast = useToast();
  const { sendComposed } = useOnboardingEmails();

  // The actual position they were hired for (falls back to a placeholder only if
  // neither the offer letter nor the candidate record has a role).
  const draftName = offerLetter?.candidateName || candidateName || candidate?.fullName || 'Candidate';
  const draftRole = offerLetter?.role || candidate?.appliedRole || '(Position)';

  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachMode, setAttachMode] = useState<'created' | 'upload'>(offerLetter ? 'created' : 'upload');
  // Date of joining shown in the email. Auto-filled from the created offer letter;
  // empty when uploading a PDF (HR sets it). Editable via the picker.
  const [joiningDate, setJoiningDate] = useState(offerLetter ? offerLetter.joiningDate || '' : '');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);

  const buildBody = (joining: string) =>
    `Dear ${draftName},\n\n` +
    `Congratulations!\n\n` +
    `We are delighted to offer you the position of ${draftRole} at Optiminastic. It was a pleasure ` +
    `interacting with you during the selection process, and we are excited about the opportunity ` +
    `to have you join our team.\n\n` +
    `Please find your Offer Letter attached for your review. We request you to carefully go through ` +
    `the terms and conditions mentioned in the document.\n\n` +
    `Once you have reviewed and signed the Offer Letter, kindly upload the signed copy using the ` +
    `button below to complete the acceptance process. As per the offer, your proposed Date of ` +
    `Joining is ${formatJoin(joining)}.\n\n` +
    `If you have any questions or require any clarification regarding the offer, please feel free ` +
    `to reach out to us. We will be happy to assist you.\n\n` +
    `We look forward to welcoming you to the Optiminastic family and wish you a successful journey ` +
    `with us.\n\n` +
    `Warm regards,\n\n` +
    `HR Team\n` +
    `Optiminastic`;

  // Change the joining date + reflect it in the email body.
  const applyJoining = (v: string) => {
    setJoiningDate(v);
    setBody(buildBody(v));
  };

  // Switching attach mode resets the joining date: the created letter's date, or
  // empty for an uploaded PDF.
  const changeAttach = (mode: 'created' | 'upload') => {
    setAttachMode(mode);
    applyJoining(mode === 'created' ? offerLetter?.joiningDate || '' : '');
  };

  // On open: draft the email + mint the 48h signed-copy upload link. The link is
  // sent as a BUTTON (via `links`), not pasted into the body.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const req = await createSignOfferRequest({ candidateId, candidateName, email });
        if (!cancelled) setLink(`${window.location.origin}${signOfferPath(req.id)}`);
      } catch {
        if (!cancelled) toast.error('Could not create the signed-copy upload link — you can still send the email.');
      }
      if (cancelled) return;
      setSubject(`Offer of Employment – ${draftRole} | Optiminastic`);
      setBody(buildBody(joiningDate));
      setPreparing(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const buildAttachment = async (): Promise<{ name: string; base64: string; type: string } | undefined> => {
    if (attachMode === 'upload') {
      if (!uploadFile) return undefined;
      return { name: uploadFile.name, base64: await blobToBase64(uploadFile), type: uploadFile.type || 'application/pdf' };
    }
    const root = pagesRef.current;
    const pages = root ? Array.from(root.querySelectorAll<HTMLElement>('.ol-page')) : [];
    if (pages.length === 0) throw new Error('Offer letter is still rendering');
    const blob = await pagesToPdfBlob(pages);
    return { name: offerFileName(offerLetter), base64: await blobToBase64(blob), type: 'application/pdf' };
  };

  const send = async () => {
    const recipient = to.trim();
    if (!recipient) {
      toast.error('Enter the candidate’s email address.');
      return;
    }
    if (attachMode === 'upload' && !uploadFile) {
      toast.error('Choose a PDF to attach, or switch to the created offer letter.');
      return;
    }
    if (attachMode === 'created' && !offerLetter) {
      toast.error('No created offer letter — upload a PDF instead.');
      return;
    }
    setSending(true);
    try {
      const attachment = await buildAttachment();
      const res = await sendComposed.mutateAsync({
        candidateId,
        kind: 'offer_letter',
        to: recipient,
        subject,
        body,
        attachment,
        links: link ? [{ label: 'Upload signed offer letter', url: link }] : undefined,
      });
      if (res.emailed) toast.success(`Offer letter sent to ${recipient}.`);
      else if (res.emailReason === 'not_configured') toast.info('Recorded — email not sent (SMTP not configured).');
      else toast.info('Recorded, but the email could not be sent.');
      onClose();
    } catch {
      toast.error('Could not send the offer letter — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Send offer letter</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {preparing ? (
          <div className="flex items-center gap-2 py-10 text-[13px] text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Preparing the email + signed-copy upload link…
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">To</label>
              <input
                className={inputCls}
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="candidate@email.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Subject</label>
              <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Date of joining</label>
              <DatePicker value={joiningDate} onChange={applyJoining} />
              <p className="mt-1 text-[11px] text-gray-400">
                {attachMode === 'created'
                  ? 'Auto-filled from the created offer letter — edit if needed. Shown in the email.'
                  : 'Set the joining date to include in the email.'}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Message</label>
              <textarea className={`${inputCls} min-h-[220px] font-mono text-[12px]`} value={body} onChange={e => setBody(e.target.value)} />
              {link && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                  <Link2 size={11} /> An “Upload signed offer letter” button (valid {SIGN_OFFER_TTL_HOURS}h) is
                  added to the email automatically.
                </p>
              )}
            </div>

            {/* Attachment choice */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-gray-500">Attach the offer letter</p>
              <div className="space-y-2">
                <label className={`flex items-center gap-2 rounded-lg border p-2.5 text-[12px] ${attachMode === 'created' ? 'border-accent-300 bg-accent-50' : 'border-[#E4E6EA]'} ${offerLetter ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  <input type="radio" name="attach" checked={attachMode === 'created'} disabled={!offerLetter} onChange={() => changeAttach('created')} />
                  <FileText size={14} className="text-accent-600" />
                  <span>Use the created offer letter{!offerLetter && ' (none created yet)'}</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-[12px] ${attachMode === 'upload' ? 'border-accent-300 bg-accent-50' : 'border-[#E4E6EA]'}`}>
                  <input type="radio" name="attach" checked={attachMode === 'upload'} onChange={() => changeAttach('upload')} />
                  <Upload size={14} className="text-accent-600" />
                  <span>Upload a PDF from my computer</span>
                </label>
                {attachMode === 'upload' && (
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-[12px] text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-accent-600 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={onClose} disabled={sending} className="rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-[#F1F3F5] disabled:opacity-60">
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {sending && <Loader2 size={14} className="animate-spin" />}
                {sending ? 'Sending…' : 'Send offer letter'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Off-screen render of the created letter — captured to a PDF for the attachment. */}
      {offerLetter && (
        <div aria-hidden style={{ position: 'absolute', left: -99999, top: 0 }}>
          <OfferLetterPaged data={offerLetter} rootRef={pagesRef} />
        </div>
      )}
    </div>
  );
}

export default SendOfferLetterModal;
