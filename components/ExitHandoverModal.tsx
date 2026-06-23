'use client';

import React, { useMemo, useState } from 'react';
import { X, Loader2, Send, Copy, Check } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { repositories } from '@/lib/api/repositories';
import { sendCustomEmail } from '@/lib/api/notifications';
import { EXIT_HANDOVER_TTL_HOURS, exitHandoverPath, newHandoverToken } from '@/lib/exit-handover';
import { useToast } from './Toaster';

interface ExitHandoverModalProps {
  employeeId: string;
  employeeName: string;
  /** Pre-filled recipient (the employee's work email). */
  workEmail?: string;
  lastWorkingDay?: string;
  onClose: () => void;
  /** Called after the link record is created + emailed. */
  onSent?: () => void;
}

/**
 * HR composes + sends the exit-handover link to a departing employee. Generates
 * an expiring public link, creates the handover record, and emails a short
 * (editable) message with the link.
 */
export function ExitHandoverModal({
  employeeId,
  employeeName,
  workEmail = '',
  lastWorkingDay,
  onClose,
  onSent,
}: ExitHandoverModalProps) {
  const toast = useToast();

  // One stable token per modal open → the link is known upfront for the body.
  const token = useMemo(newHandoverToken, []);
  const link = useMemo(
    () =>
      typeof window !== 'undefined'
        ? `${window.location.origin}${exitHandoverPath(token)}`
        : exitHandoverPath(token),
    [token],
  );

  const [to, setTo] = useState(workEmail);
  const [subject, setSubject] = useState(`Exit handover — ${employeeName} — ${BRAND.company}`);
  const [body, setBody] = useState(() =>
    [
      `Dear ${employeeName},`,
      '',
      'As part of your exit formalities, please use the secure link below to hand over your',
      'work-account access and any pending files. The link is private to you and expires in',
      `${EXIT_HANDOVER_TTL_HOURS} hours.`,
      '',
      link,
      '',
      'Kindly complete this before your last working day. Reach out to HR with any questions.',
      '',
      'Best Regards,',
      'The HR Team',
      BRAND.company,
    ].join('\n'),
  );

  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — copy it from the field.');
    }
  };

  const send = async () => {
    if (!to.trim()) {
      toast.error("Enter the employee's work email.");
      return;
    }
    setSending(true);
    try {
      // 1) Create the handover record so the public link resolves.
      await repositories.exitHandovers.create({
        employeeId,
        employeeName,
        lastWorkingDay,
        token,
        status: 'Sent',
        expiresAt: new Date(Date.now() + EXIT_HANDOVER_TTL_HOURS * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        submissions: [],
      });
      // 2) Email the link (also rendered as a button via the links array).
      await sendCustomEmail({
        to: to.trim(),
        subject: subject.trim() || `Exit handover — ${employeeName}`,
        body,
        links: [{ label: 'Open your handover page', url: link }],
      });
      toast.success(`Handover link sent to ${to.trim()}.`);
      onSent?.();
      onClose();
    } catch {
      toast.error('Could not send the handover link. The link was prepared — you can copy it.');
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full rounded-md border border-[#E4E6EA] bg-white px-2.5 py-2 text-[13px] text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Send exit-handover link</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1 text-[12px] font-semibold text-gray-600">
            <span>To (work email)</span>
            <input
              type="email"
              className={inputCls}
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="employee@company.com"
            />
          </label>

          <label className="block space-y-1 text-[12px] font-semibold text-gray-600">
            <span>Subject</span>
            <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />
          </label>

          <div className="space-y-1">
            <span className="text-[12px] font-semibold text-gray-600">Handover link</span>
            <div className="flex items-stretch gap-2">
              <input className={`${inputCls} flex-1`} value={link} readOnly />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E4E6EA] px-3 text-[12px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5]"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <label className="block space-y-1 text-[12px] font-semibold text-gray-600">
            <span>Message</span>
            <textarea
              rows={9}
              className={`${inputCls} font-sans leading-relaxed`}
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 transition hover:bg-[#F1F3F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send link
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExitHandoverModal;
