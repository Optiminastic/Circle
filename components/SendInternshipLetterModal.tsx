'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Link2, Copy } from 'lucide-react';
import type { Candidate } from '@/types';
import { useOnboardingEmails } from '@/features/onboarding/hooks';
import {
  createSignInternshipRequest,
  signInternshipPath,
  SIGN_INTERNSHIP_TTL_HOURS,
} from '@/lib/sign-internship';
import { buildOnboardingEmailDraft } from '@/lib/onboarding-email-templates';
import { blobToBase64 } from '@/lib/offer-letter-pdf';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from './Toaster';
import { ModalShell } from '@/components/ui/modal-shell';

interface Props {
  candidate?: Candidate;
  candidateId: string;
  candidateName: string;
  email: string;
  onClose: () => void;
}

const inputCls =
  'w-full rounded-sm border border-line bg-surface px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

/**
 * The intern track's single letter, mirroring SendOfferLetterModal.
 *
 * One deliberate difference: there is no "use the created letter" option. Circle
 * composes offer and appointment letters from stored values, but has no intern
 * template, so the letter is attached as a PDF. Nothing here pretends otherwise.
 */
export function SendInternshipLetterModal({
  candidate,
  candidateId,
  candidateName,
  email,
  onClose,
}: Props) {
  const toast = useToast();
  const { sendComposed, setJoiningDate: saveJoiningDate } = useOnboardingEmails();

  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);

  // On open: draft the email + mint the 72h signed-copy upload link. The link is
  // sent as a BUTTON (via `links`), not pasted into the body.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const req = await createSignInternshipRequest({ candidateId, candidateName, email });
        if (!cancelled) setLink(`${window.location.origin}${signInternshipPath(req.id)}`);
      } catch {
        if (!cancelled)
          toast.error(
            'Could not create the signed-copy upload link — you can still send the email.',
          );
      }
      if (cancelled) return;
      const draft = buildOnboardingEmailDraft('internship_letter', candidate, { track: 'intern' });
      setSubject(draft.subject);
      setBody(draft.body);
      setPreparing(false);
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

  const send = async () => {
    const recipient = to.trim();
    if (!recipient) {
      toast.error('Enter the intern’s email address.');
      return;
    }
    if (!uploadFile) {
      toast.error('Attach the internship letter PDF before sending.');
      return;
    }
    setSending(true);
    try {
      // Stamped before the send, the same order the joining-date step uses, so
      // a failed email still leaves the date HR picked on the record.
      if (joiningDate) {
        await saveJoiningDate.mutateAsync({ candidateId, date: joiningDate });
      }
      const res = await sendComposed.mutateAsync({
        candidateId,
        kind: 'internship_letter',
        to: recipient,
        subject,
        body,
        attachment: {
          name: uploadFile.name,
          base64: await blobToBase64(uploadFile),
          type: uploadFile.type || 'application/pdf',
        },
        links: link ? [{ label: 'Upload signed internship letter', url: link }] : undefined,
      });
      if (res.emailed) toast.success(`Internship letter sent to ${recipient}.`);
      else if (res.emailReason === 'not_configured')
        toast.info('Recorded — email not sent (SMTP not configured).');
      else toast.info('Recorded, but the email could not be sent.');
      onClose();
    } catch {
      toast.error('Could not send the internship letter — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalShell onClose={onClose} size="lg" label="Send internship letter" className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Send internship letter</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-gray-400 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>

      {preparing ? (
        <div className="flex items-center gap-2 py-10 text-[13px] text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Preparing the email + signed-copy upload
          link…
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
              placeholder="intern@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">Subject</label>
            <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-500">
              Start date <span className="text-gray-400">(optional)</span>
            </label>
            <DatePicker value={joiningDate} onChange={setJoiningDate} />
            <p className="mt-1 text-[11px] text-gray-400">
              Pre-fills the joining-date email later. The internship letter itself carries the
              agreed dates, so this is not required to send.
            </p>
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
                  className={`${inputCls} cursor-default bg-surface-muted text-gray-600`}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-sm border border-line bg-surface px-3 text-[12px] font-semibold text-gray-700 transition hover:bg-surface-sunken"
                >
                  <Copy size={13} /> Copy
                </button>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                <Link2 size={11} /> An “Upload signed internship letter” button (valid{' '}
                {SIGN_INTERNSHIP_TTL_HOURS}h) is also added to the email automatically.
              </p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-500">
              Attach the internship letter <span className="text-accent-600">*</span>
            </p>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[12px] text-gray-600 file:mr-3 file:rounded-sm file:border-0 file:bg-accent-600 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={sending}
              className="rounded-md border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-surface-sunken disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={sending || !uploadFile}
              title={!uploadFile ? 'Attach the internship letter PDF first' : undefined}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
            >
              {sending && <Loader2 size={14} className="animate-spin" />}
              {sending ? 'Sending…' : 'Send internship letter'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

export default SendInternshipLetterModal;
