'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Upload, FileText, Link2, Copy } from 'lucide-react';
import type { AppointmentLetterData, Candidate } from '@/types';
import { useOnboardingEmails } from '@/features/onboarding/hooks';
import { pagesToPdfBlob, blobToBase64 } from '@/lib/offer-letter-pdf';
import { appointmentLetterFileBaseName } from '@/lib/appointment-letter';
import {
  createSignAppointmentRequest,
  signAppointmentPath,
  SIGN_APPOINTMENT_TTL_HOURS,
} from '@/lib/sign-appointment';
import { AppointmentLetterPaged } from './AppointmentLetterPaged';
import { useToast } from './Toaster';

interface Props {
  candidate?: Candidate;
  candidateId: string;
  candidateName: string;
  email: string;
  appointmentLetter?: AppointmentLetterData;
  onClose: () => void;
}

function appointmentFileName(d?: AppointmentLetterData): string {
  return `${appointmentLetterFileBaseName(d?.candidateName)}.pdf`;
}

const inputCls =
  'w-full rounded-md border border-[#E4E6EA] bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function SendAppointmentLetterModal({
  candidate,
  candidateId,
  candidateName,
  email,
  appointmentLetter,
  onClose,
}: Props) {
  const toast = useToast();
  const { sendComposed } = useOnboardingEmails();

  const draftName = appointmentLetter?.candidateName || candidateName || candidate?.fullName || 'Candidate';
  const draftRole = appointmentLetter?.role || candidate?.appliedRole || '(Position)';

  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState(`Letter of Appointment – ${draftRole} | Optiminastic`);
  const [body, setBody] = useState(
    `Dear ${draftName},\n\n` +
      `Welcome to Optiminastic!\n\n` +
      `Please find attached your Letter of Appointment confirming the full terms of your employment ` +
      `as ${draftRole}. Kindly go through it carefully, sign the duplicate copy and return it to us at ` +
      `your earliest convenience.\n\n` +
      `If you have any questions, please feel free to reach out to us.\n\n` +
      `Warm regards,\n\n` +
      `HR Team\n` +
      `Optiminastic`,
  );
  const [attachMode, setAttachMode] = useState<'created' | 'upload'>(appointmentLetter ? 'created' : 'upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);

  // Re-seed the "To" field if the candidate's email changes underneath us.
  useEffect(() => {
    setTo(email);
  }, [email]);

  // On open: mint the 72h signed-copy upload link. Sent as a BUTTON (via
  // `links`), not pasted into the body — mirrors the offer letter's flow.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const req = await createSignAppointmentRequest({ candidateId, candidateName, email });
        if (!cancelled) setLink(`${window.location.origin}${signAppointmentPath(req.id)}`);
      } catch {
        if (!cancelled)
          toast.error('Could not create the signed-copy upload link — you can still send the email.');
      }
      if (!cancelled) setPreparing(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => toast.success('Upload link copied.'),
      () => toast.error('Could not copy the link.'),
    );
  };

  const buildAttachment = async (): Promise<{ name: string; base64: string; type: string } | undefined> => {
    if (attachMode === 'upload') {
      if (!uploadFile) return undefined;
      return { name: uploadFile.name, base64: await blobToBase64(uploadFile), type: uploadFile.type || 'application/pdf' };
    }
    const root = pagesRef.current;
    const pages = root ? Array.from(root.querySelectorAll<HTMLElement>('.ol-page')) : [];
    if (pages.length === 0) throw new Error('Appointment letter is still rendering');
    const blob = await pagesToPdfBlob(pages);
    return { name: appointmentFileName(appointmentLetter), base64: await blobToBase64(blob), type: 'application/pdf' };
  };

  const send = async () => {
    const recipient = to.trim();
    if (!recipient) {
      toast.error('Enter the candidate’s email address.');
      return;
    }
    if (attachMode === 'upload' && !uploadFile) {
      toast.error('Choose a PDF to attach, or switch to the created appointment letter.');
      return;
    }
    if (attachMode === 'created' && !appointmentLetter) {
      toast.error('No created appointment letter — upload a PDF instead.');
      return;
    }
    setSending(true);
    try {
      const attachment = await buildAttachment();
      const res = await sendComposed.mutateAsync({
        candidateId,
        kind: 'appointment_letter',
        to: recipient,
        subject,
        body,
        attachment,
        links: link ? [{ label: 'Upload signed appointment letter', url: link }] : undefined,
      });
      if (res.emailed) toast.success(`Appointment letter sent to ${recipient}.`);
      else if (res.emailReason === 'not_configured') toast.info('Recorded — email not sent (SMTP not configured).');
      else toast.info('Recorded, but the email could not be sent.');
      onClose();
    } catch {
      toast.error('Could not send the appointment letter — try again.');
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
          <h3 className="text-base font-bold text-gray-900">Send appointment letter</h3>
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
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Message</label>
              <textarea
                className={`${inputCls} min-h-[220px] font-mono text-[12px]`}
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>

            {link && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                  Signed-copy upload link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={e => e.target.select()}
                    className={`${inputCls} cursor-default bg-[#F7F8FA] text-gray-600`}
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-md border border-[#E4E6EA] bg-white px-3 text-[12px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                  <Link2 size={11} /> An “Upload signed appointment letter” button (valid{' '}
                  {SIGN_APPOINTMENT_TTL_HOURS}h) is also added to the email automatically.
                </p>
              </div>
            )}

            {/* Attachment choice */}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-gray-500">Attach the appointment letter</p>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-[12px] ${attachMode === 'created' ? 'border-accent-300 bg-accent-50' : 'border-[#E4E6EA]'} ${appointmentLetter ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                >
                  <input
                    type="radio"
                    name="attach"
                    checked={attachMode === 'created'}
                    disabled={!appointmentLetter}
                    onChange={() => setAttachMode('created')}
                  />
                  <FileText size={14} className="text-accent-600" />
                  <span>Use the created appointment letter{!appointmentLetter && ' (none created yet)'}</span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-[12px] ${attachMode === 'upload' ? 'border-accent-300 bg-accent-50' : 'border-[#E4E6EA]'}`}
                >
                  <input type="radio" name="attach" checked={attachMode === 'upload'} onChange={() => setAttachMode('upload')} />
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
              <button
                onClick={onClose}
                disabled={sending}
                className="rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-[#F1F3F5] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {sending && <Loader2 size={14} className="animate-spin" />}
                {sending ? 'Sending…' : 'Send appointment letter'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Off-screen render of the created letter — captured to a PDF for the attachment. */}
      {appointmentLetter && (
        <div aria-hidden style={{ position: 'absolute', left: -99999, top: 0 }}>
          <AppointmentLetterPaged data={appointmentLetter} rootRef={pagesRef} />
        </div>
      )}
    </div>
  );
}

export default SendAppointmentLetterModal;
