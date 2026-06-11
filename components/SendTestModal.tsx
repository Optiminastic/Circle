'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Send, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { Candidate } from '@/types';

export interface SendTestResult {
  to: string;
  subject: string;
  body: string;
}

interface SendTestModalProps {
  candidate: Candidate;
  kind: 'iq' | 'assignment';
  /** The candidate-facing link to the IQ / Assessment module (already generated). */
  testUrl: string;
  onClose: () => void;
  onConfirm: (result: SendTestResult) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendTestModal({ candidate, kind, testUrl, onClose, onConfirm }: SendTestModalProps) {
  const isIq = kind === 'iq';
  const what = isIq ? 'IQ Test' : 'Assessment';
  const position = candidate.appliedRole || candidate.department || 'the role';

  // Candidate's email is pre-filled but HR can change it before sending.
  const [to, setTo] = useState(candidate.email || '');
  const [subject, setSubject] = useState(`Your ${what} for ${position} — ${BRAND.name}`);

  const composed = useMemo(
    () =>
      [
        `Dear ${candidate.fullName},`,
        '',
        `As the next step in your application for ${position}, please complete our ${what.toLowerCase()}.`,
        '',
        `${what} link: ${testUrl}`,
        '',
        isIq
          ? 'The test is timed and runs in full screen — please ensure a stable internet connection before you begin.'
          : 'Open the link to read the brief and submit your work before the deadline.',
        '',
        'Best Regards,',
        `${BRAND.name} HR Team`,
      ].join('\n'),
    [candidate.fullName, position, what, testUrl, isIq],
  );

  const [body, setBody] = useState(composed);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) setBody(composed);
  }, [composed, edited]);

  const error = !to.trim()
    ? 'Candidate email is required.'
    : !EMAIL_RE.test(to.trim())
      ? 'Please enter a valid email address.'
      : null;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,42rem)] max-w-[42rem] sm:max-w-[42rem] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-gray-900">
            <Send size={15} className="text-accent-600" /> Send {what}
          </DialogTitle>
          <DialogDescription>
            {candidate.fullName} · {position}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 text-xs">
          <div>
            <Label htmlFor="st-to" className="text-[11px] font-medium text-gray-600">
              Candidate email <span className="text-accent-600">*</span>
            </Label>
            <Input
              id="st-to"
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="candidate@email.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
              <Link2 size={12} /> {what} link
            </Label>
            <a
              href={testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-accent-600 hover:underline"
            >
              {testUrl}
            </a>
          </div>

          <div>
            <Label htmlFor="st-subject" className="text-[11px] font-medium text-gray-600">
              Subject
            </Label>
            <Input
              id="st-subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="st-body" className="text-[11px] font-medium text-gray-600">
                Message
              </Label>
              {edited && (
                <button
                  type="button"
                  onClick={() => {
                    setEdited(false);
                    setBody(composed);
                  }}
                  className="text-[10px] font-semibold text-accent-600 hover:underline"
                >
                  Reset to template
                </button>
              )}
            </div>
            <Textarea
              id="st-body"
              value={body}
              onChange={e => {
                setEdited(true);
                setBody(e.target.value);
              }}
              rows={11}
              className="mt-1 font-mono text-[12px] leading-relaxed"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!!error}
            onClick={() => onConfirm({ to: to.trim(), subject: subject.trim(), body })}
          >
            <Send size={14} /> Send {what}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendTestModal;
