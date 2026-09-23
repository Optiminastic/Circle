'use client';

import React, { useEffect, useState } from 'react';
import { HrCcNotice } from '@/components/HrCcNotice';
import { X, Loader2, Link2, Copy } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { useOnboardingEmails } from '@/features/onboarding/hooks';
import {
  createJoiningConfirmationRequest,
  joiningConfirmationPath,
  JOINING_CONFIRMATION_TTL_DAYS,
} from '@/lib/joining-confirmation';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from './Toaster';

interface Props {
  candidateId: string;
  candidateName: string;
  email: string;
  /** Existing proposed date on the checklist, if any — pre-fills the picker. */
  proposedDate?: string;
  onClose: () => void;
}

/** Format yyyy-MM-dd as "23rd July 2026". */
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
  'w-full rounded-sm border border-line bg-surface px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

export function SendJoiningDateModal({ candidateId, candidateName, email, proposedDate, onClose }: Props) {
  const toast = useToast();
  const { sendComposed, setJoiningDate } = useOnboardingEmails();

  const draftName = candidateName || 'there';

  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState(`Welcome to Optiminastic Media, ${candidateName}! 🎉`);
  const [body, setBody] = useState('');
  const [joiningDate, setJoiningDateInput] = useState(proposedDate || '');
  const [link, setLink] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);

  const buildBody = (joining: string) =>
    `Hi ${draftName},\n\n` +
    `We’re excited to have you join the Optiminastic Media team! 🎉\n\n` +
    `Before anything else — we’ve pencilled you in to join on ${formatJoin(joining)}. Please confirm ` +
    `your joining date (or let us know if you need a different one), along with your meal and ` +
    `welcome-plant preferences, using the button below.\n\n` +
    `As we get ready to welcome you, we’d love to know a little more about you before your first day.\n\n` +
    `Could you share your picture and a short introduction about yourself, along with a few fun facts, ` +
    `hobbies, interests, or anything you’d like your new teammates to know about you?\n\n` +
    `You can keep it simple and fun - there are no rules! For example:\n\n` +
    `A little about yourself\n` +
    `Your hobbies or interests\n` +
    `A fun fact about you\n` +
    `Something you enjoy doing outside of work\n` +
    `A favourite movie, show, food, travel destination, or anything you’d love to share\n\n` +
    `We’ll use this as part of your welcome communication to help the team get to know you a little ` +
    `better before you join us.\n\n` +
    `🍕 Your First Meal Is On Us!\n` +
    `To celebrate your first day at Optiminastic, lunch is on us! 🎉\n` +
    `Pizza or Pasta? Your choice — we’ve got you covered.\n` +
    `Just let us know:\n` +
    `Vegetarian / Non-Vegetarian preference\n` +
    `Any dietary restrictions or allergies\n\n` +
    `🌱 Choose Your Welcome Plant!\n` +
    `As part of your Welcome Kit, we’d also love to gift you an indoor plant! You can choose to keep it ` +
    `at your desk or take it home - whichever you prefer. 😊\n` +
    `We have four plant options for you to choose from — pick your favourite using the button below. ` +
    `We’ll make sure to have your choice ready before your date of joining.\n\n` +
    `Looking forward to welcoming you to the Optiminastic Media team! 🎉\n\n` +
    `Welcome to the team! We’re looking forward to having you with us and hope you enjoy your first-day ` +
    `treat. 😊\n\n\n` +
    `Warm regards,\n` +
    `HR Team\n` +
    `Optiminastic Media`;

  const applyJoining = (v: string) => {
    setJoiningDateInput(v);
    setBody(buildBody(v));
  };

  // On open: mint the 30-day confirmation link + draft the email. The link is
  // sent as a BUTTON (via `links`), same pattern as the offer letter modal.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const req = await createJoiningConfirmationRequest({
          candidateId,
          candidateName,
          email,
          proposedDate: proposedDate || '',
        });
        if (!cancelled) setLink(`${window.location.origin}${joiningConfirmationPath(req.id)}`);
      } catch {
        if (!cancelled) toast.error('Could not create the confirmation link — you can still send the email.');
      }
      if (cancelled) return;
      setBody(buildBody(proposedDate || ''));
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
      () => toast.success('Confirmation link copied.'),
      () => toast.error('Could not copy the link.'),
    );
  };

  const send = async () => {
    const recipient = to.trim();
    if (!recipient) {
      toast.error('Enter the candidate’s email address.');
      return;
    }
    if (!joiningDate) {
      toast.error('Pick the joining date before sending.');
      return;
    }
    setSending(true);
    try {
      await setJoiningDate.mutateAsync({ candidateId, date: joiningDate });
      const res = await sendComposed.mutateAsync({
        candidateId,
        kind: 'joining_date',
        to: recipient,
        subject,
        body,
        links: link ? [{ label: 'Confirm your joining date & preferences', url: link }] : undefined,
      });
      if (res.emailed) toast.success(`Joining-date email sent to ${recipient}.`);
      else if (res.emailReason === 'not_configured') toast.info('Recorded — email not sent (SMTP not configured).');
      else toast.info('Recorded, but the email could not be sent.');
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
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-surface p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Send joining date</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {preparing ? (
          <div className="flex items-center gap-2 py-10 text-[13px] text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Preparing the email + confirmation link…
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
              <HrCcNotice className="mt-1.5" />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Subject</label>
              <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                Joining date <span className="text-accent-600">*</span>
              </label>
              <DatePicker value={joiningDate} onChange={applyJoining} />
              <p className={`mt-1 text-[11px] ${joiningDate ? 'text-gray-400' : 'text-accent-600'}`}>
                {joiningDate
                  ? 'Shown in the email as the proposed joining date.'
                  : 'Required — the email states the joining date, so pick one before sending.'}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-500">Message</label>
              <textarea
                className={`${inputCls} min-h-[260px] font-mono text-[12px]`}
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>

            {link && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Confirmation link</label>
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
                  <Link2 size={11} /> A "Confirm your joining date & preferences" button (valid{' '}
                  {JOINING_CONFIRMATION_TTL_DAYS} days) is also added to the email automatically.
                </p>
              </div>
            )}

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
                disabled={sending || !joiningDate}
                title={!joiningDate ? 'Pick the joining date first' : undefined}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
              >
                {sending && <Loader2 size={14} className="animate-spin" />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SendJoiningDateModal;
