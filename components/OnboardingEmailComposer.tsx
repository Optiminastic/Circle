'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Send, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ComposerSeed {
  title: string;
  to: string;
  subject: string;
  body: string;
}

interface OnboardingEmailComposerProps {
  open: boolean;
  seed: ComposerSeed | null;
  sending?: boolean;
  onClose: () => void;
  onSend: (subject: string, body: string) => void;
}

/** Edit-before-send composer for onboarding emails (offer letter, job offer, etc.). */
export function OnboardingEmailComposer({
  open,
  seed,
  sending,
  onClose,
  onSend,
}: OnboardingEmailComposerProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Re-seed whenever a new email is opened.
  useEffect(() => {
    if (open && seed) {
      setSubject(seed.subject);
      setBody(seed.body);
    }
  }, [open, seed]);

  if (!seed) return null;

  return (
    <Dialog open={open} onOpenChange={o => !o && !sending && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,44rem)] max-w-[44rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[44rem]">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span className="grid size-7 place-items-center rounded-lg bg-accent-50 text-accent-600">
              <Mail size={15} />
            </span>
            {seed.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review and edit before it goes out. Sends to{' '}
            <span className="font-semibold text-gray-700">{seed.to || 'the candidate'}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-600">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-600">Message</Label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={18}
              className="w-full rounded-md border border-input bg-secondary/40 px-3 py-2 font-mono text-[12px] leading-relaxed text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
            <p className="text-[10px] text-gray-400">
              Plain text — line breaks are preserved and the company header/footer is added
              automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSend(subject.trim(), body.trim())}
            disabled={sending || !subject.trim() || !body.trim() || !seed.to}
          >
            {sending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send size={14} /> Send email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingEmailComposer;
