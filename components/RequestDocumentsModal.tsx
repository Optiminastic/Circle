'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Link2, Mail, FileText } from 'lucide-react';
import type { DocRequest } from '@/types';
import { useDocRequestMutations } from '@/features/doc-requests/hooks';
import { sendCustomEmail } from '@/lib/api/notifications';
import {
  REQUIRED_DOCS,
  DEFAULT_REQUIRED_DOC_TYPES,
  docDefsFor,
  DOC_REQUEST_TTL_HOURS,
} from '@/lib/onboarding-docs';
import { emailTemplateById } from '@/lib/email-templates-catalog';
import {
  useEmailTemplateOverrides,
  resolveTemplate,
  renderTemplate,
} from '@/features/email-templates/hooks';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from './Toaster';

interface Props {
  candidateId: string;
  candidateName: string;
  email: string;
  role?: string;
  prior?: DocRequest;
  onClose: () => void;
}

export function RequestDocumentsModal({ candidateId, candidateName, email, role, prior, onClose }: Props) {
  const toast = useToast();
  const { create } = useDocRequestMutations();

  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preparing, setPreparing] = useState(true);
  const [sending, setSending] = useState(false);
  // Re-requesting keeps whatever HR asked for last time; a fresh request starts
  // from the standard set.
  const [docs, setDocs] = useState<string[]>(
    prior?.requiredDocs?.length ? prior.requiredDocs : DEFAULT_REQUIRED_DOC_TYPES,
  );

  const toggleDoc = (type: string) =>
    setDocs(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));

  // Last body we generated. Lets us refresh the checklist as HR ticks items,
  // while backing off the moment they type their own message.
  const generatedRef = useRef('');

  // The draft comes from Settings → Email templates ("Joining documents"), so
  // HR's saved copy is what they see here. {{upload_url}} is left intact — the
  // link doesn't exist until send.
  const { data: overrides } = useEmailTemplateOverrides();
  const templateDef = emailTemplateById('doc_request');

  const templateVars = (types: string[]) => ({
    candidate_name: candidateName || 'Candidate',
    role: role || 'the role',
    document_list: docDefsFor(types)
      .map(d => `- ${d.label}`)
      .join('\n'),
  });

  const composeBody = (types: string[]) => {
    if (!templateDef) return '';
    const { body: tpl } = resolveTemplate(templateDef, overrides);
    return renderTemplate(tpl, templateVars(types), { keepUnknown: true });
  };

  // Seed an editable draft. The upload link itself is only minted on send, so
  // the candidate's portal reflects the final tick-list rather than the
  // defaults that happened to be showing when the modal opened.
  useEffect(() => {
    if (!templateDef) return;
    const { subject: tplSubject } = resolveTemplate(templateDef, overrides);
    setSubject(renderTemplate(tplSubject, templateVars(docs)));
    const seeded = composeBody(docs);
    generatedRef.current = seeded;
    setBody(seeded);
    setPreparing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, overrides]);

  // Keep the checklist in sync with the ticked items — but only while the draft
  // is still ours. Once HR edits the message, their text wins.
  useEffect(() => {
    if (preparing) return;
    if (body !== generatedRef.current) return;
    const next = composeBody(docs);
    generatedRef.current = next;
    setBody(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  const send = async () => {
    const recipient = to.trim();
    if (!recipient) {
      toast.error('Enter the candidate’s email address.');
      return;
    }
    if (docs.length === 0) {
      toast.error('Select at least one document to request.');
      return;
    }
    setSending(true);
    try {
      // Create the link now, with the final selection attached.
      const res = await create.mutateAsync({
        candidateId,
        candidateName,
        email: recipient,
        role,
        prior,
        requiredDocs: docs,
        skipEmail: true,
      });

      // The checklist is already part of the message body; the portal renders a
      // card for each ticked item. {{upload_url}} can only be filled now that the
      // link exists — any token still unresolved is cleared here.
      const mail = await sendCustomEmail({
        to: recipient,
        subject,
        body: renderTemplate(body, { upload_url: res.link }),
        links: [{ label: 'Upload your documents here', url: res.link }],
      });

      if (mail.sent) toast.success(`Upload link sent to ${recipient}.`);
      else if (mail.reason === 'not_configured')
        toast.info('Link created — email not sent (SMTP not configured).');
      else toast.info('Link created, but the email could not be sent.');
      onClose();
    } catch {
      toast.error('Could not send the email — try again.');
    } finally {
      setSending(false);
    }
  };

  const DocRow = ({ type, label }: { type: string; label: string }) => {
    const on = docs.includes(type);
    return (
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 transition ${
          on ? 'border-accent-300 bg-accent-50' : 'border-[#E4E6EA] bg-white hover:bg-[#F7F8FA]'
        }`}
      >
        <Checkbox checked={on} onCheckedChange={() => toggleDoc(type)} />
        <span className="text-[12px] font-medium leading-tight text-gray-800" title={label}>
          {label}
        </span>
      </label>
    );
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
            <Loader2 size={16} className="animate-spin" /> Preparing…
          </div>
        ) : (
          // Documents open by default; the email draft starts collapsed.
          <Accordion type="multiple" defaultValue={['docs']} className="space-y-2">
            {/* Email — collapsible, open by default */}
            <AccordionItem value="email">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Mail size={13} className="text-accent-600" /> Email
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="doc-to">To</Label>
                  <Input
                    id="doc-to"
                    type="email"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder="candidate@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-subject">Subject</Label>
                  <Input id="doc-subject" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-body">Message</Label>
                  <Textarea
                    id="doc-body"
                    className="min-h-[170px] font-mono text-[12px]"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                  />
                  <p className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Link2 size={11} /> The secure upload link (valid {DOC_REQUEST_TTL_HOURS}h) is attached as an
                    “Upload your documents here” button. The list updates as you tick items, until you edit the
                    message yourself.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Documents to request — drives the candidate's upload cards */}
            <AccordionItem value="docs">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <FileText size={13} className="text-accent-600" /> Documents to request
                  <span className="rounded-full bg-accent-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent-700">
                    {docs.length} selected
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {REQUIRED_DOCS.map(d => (
                    <DocRow key={d.type} type={d.type} label={d.label} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {!preparing && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#ECEDF0] pt-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-[13px] font-semibold text-gray-600 hover:bg-[#F1F3F5] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={sending || docs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
            >
              {sending && <Loader2 size={14} className="animate-spin" />}
              {sending ? 'Sending…' : 'Send upload link'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestDocumentsModal;
