'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Link2 } from 'lucide-react';
import type { DocRequest } from '@/types';
import { useDocRequestMutations } from '@/features/doc-requests/hooks';
import { sendCustomEmail } from '@/lib/api/notifications';
import { DOC_REQUEST_TTL_HOURS } from '@/lib/onboarding-docs';
import { useToast } from './Toaster';

interface Props {
  candidateId: string;
  candidateName: string;
  email: string;
  role?: string;
  prior?: DocRequest;
  onClose: () => void;
}

const inputCls =
  'w-full rounded-md border border-[#E4E6EA] bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function RequestDocumentsModal({ candidateId, candidateName, email, role, prior, onClose }: Props) {
  const toast = useToast();
  const { create } = useDocRequestMutations();

  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);

  // On open: create/reuse the upload link (no built-in email), then seed an
  // editable draft that already contains the link + validity.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await create.mutateAsync({
          candidateId,
          candidateName,
          email,
          role,
          prior,
          skipEmail: true,
        });
        if (cancelled) return;
        setLink(res.link);
        setSubject('Please upload your joining documents — Optiminastic');
        setBody(
          `Dear ${candidateName || 'Candidate'},\n\n` +
            `Welcome to Optiminastic! Please upload your joining documents and bank details using the secure link below. ` +
            `The link is valid for ${DOC_REQUEST_TTL_HOURS} hours.\n\n` +
            `${res.link}\n\n` +
            `If you have any questions, just reply to this email.\n\n` +
            `Warm regards,\nOptiminastic HR`,
        );
      } catch {
        if (!cancelled) toast.error('Could not create the upload link — try again.');
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const send = async () => {
    const recipient = to.trim();
    if (!recipient) {
      toast.error('Enter the candidate’s email address.');
      return;
    }
    setSending(true);
    try {
      const res = await sendCustomEmail({ to: recipient, subject, body });
      if (res.sent) toast.success(`Upload link sent to ${recipient}.`);
      else if (res.reason === 'not_configured') toast.info('Link created — email not sent (SMTP not configured).');
      else toast.info('Link created, but the email could not be sent.');
      onClose();
    } catch {
      toast.error('Could not send the email — try again.');
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
          <h3 className="text-base font-bold text-gray-900">Request joining documents</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {preparing ? (
          <div className="flex items-center gap-2 py-10 text-[13px] text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Preparing the secure upload link…
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
                className={`${inputCls} min-h-[200px] font-mono text-[12px]`}
                value={body}
                onChange={e => setBody(e.target.value)}
              />
              {link && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                  <Link2 size={11} /> Secure upload link (valid {DOC_REQUEST_TTL_HOURS}h) is included above.
                </p>
              )}
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
                {sending ? 'Sending…' : 'Send upload link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestDocumentsModal;
