'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Link2, Mail, FileText } from 'lucide-react';
import { useDocRequestMutations, useDocRequests } from '@/features/doc-requests/hooks';
import { sendCustomEmail } from '@/lib/api/notifications';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { randomId, nowISO } from '@/lib/utils';
import { EMPLOYEE_DOC_TYPES, docDefByType, DOC_REQUEST_TTL_HOURS } from '@/lib/onboarding-docs';
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
  employeeId: string;
  employeeName: string;
  email: string;
  role?: string;
  onClose: () => void;
}

/** Employee-directory "Request docs" action — a public upload link, same
 *  mechanics as the candidate joining-documents request (RequestDocumentsModal)
 *  but for an already-hired employee: a fixed, all-unchecked doc picker
 *  (offer/appointment letter, cancelled cheque, bank details, Aadhaar, PAN,
 *  education certs) and a short generic ask instead of the onboarding
 *  template/BGV-consent flow. */
export function RequestEmployeeDocsModal({ employeeId, employeeName, email, role, onClose }: Props) {
  const toast = useToast();
  const qc = useQueryClient();
  const { create } = useDocRequestMutations();
  const { data: docRequests = [] } = useDocRequests();
  // The employee flow always reuses one link per person (see create.mutate's
  // employeeReuseTarget) — show what's already on it so ticking new items
  // here reads as "add to", not "replace".
  const existingRequest = docRequests
    .filter(r => r.candidateId === employeeId && r.entityType === 'employee')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const alreadyRequestedLabels = (existingRequest?.requiredDocs ?? [])
    .map(t => docDefByType(t)?.label ?? t)
    .join(', ');

  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState('Action needed — please upload your requested documents');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  // All unchecked by default — HR picks exactly what's needed this time.
  const [docs, setDocs] = useState<string[]>([]);

  const toggleDoc = (type: string) =>
    setDocs(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));

  // Last body we generated. Lets the doc list stay in sync as HR ticks items,
  // while backing off the moment they type their own message (mirrors
  // RequestDocumentsModal's draft-vs-edited convention).
  const generatedRef = useRef('');

  const composeBody = (types: string[]) => {
    const list = types.length
      ? types.map(t => `- ${docDefByType(t)?.label ?? t}`).join('\n')
      : '(select documents below)';
    return [
      `Hi ${employeeName || 'there'},`,
      '',
      'Could you please upload the following documents using the secure link below? The link stays valid for ' +
        `${DOC_REQUEST_TTL_HOURS} hours.`,
      '',
      list,
      '',
      'Thanks,',
      'The HR Team',
    ].join('\n');
  };

  // Seed the initial draft once.
  useEffect(() => {
    const seeded = composeBody(docs);
    generatedRef.current = seeded;
    setBody(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the doc list in the message in sync with ticked items — only while
  // the draft is still ours (untouched by hand).
  useEffect(() => {
    if (body !== generatedRef.current) return;
    const next = composeBody(docs);
    generatedRef.current = next;
    setBody(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  const send = async () => {
    const recipient = to.trim();
    if (!recipient) {
      toast.error('Enter the employee’s email address.');
      return;
    }
    if (docs.length === 0) {
      toast.error('Select at least one document to request.');
      return;
    }
    setSending(true);
    try {
      const res = await create.mutateAsync({
        candidateId: employeeId,
        candidateName: employeeName,
        email: recipient,
        role,
        requiredDocs: docs,
        skipEmail: true,
        entityType: 'employee',
      });

      const mail = await sendCustomEmail({
        to: recipient,
        subject,
        body,
        links: [{ label: 'Upload your documents here', url: res.link }],
      });

      if (mail.sent) {
        toast.success(`Upload link sent to ${recipient}.`);
        repositories.sentEmails
          .create({
            id: randomId('EML'),
            recipientName: employeeName,
            recipientEmail: recipient,
            templateTitle: 'Documents requested',
            subject,
            dateSent: nowISO(),
            status: 'Sent',
            relatedEntity: employeeName,
          })
          .then(() => qc.invalidateQueries({ queryKey: qk.sentEmails.all }))
          .catch(() => {});
      } else if (mail.reason === 'not_configured')
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
          <h3 className="text-base font-bold text-gray-900">Request docs</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {existingRequest && (
          <p className="mb-3 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-[11.5px] text-accent-700">
            {employeeName} already has an active upload link requesting: {alreadyRequestedLabels || 'nothing yet'}.
            Anything you tick below is <strong>added</strong> to that same link — nothing already requested is
            removed.
          </p>
        )}

        <Accordion type="multiple" defaultValue={['docs']} className="space-y-2">
          <AccordionItem value="email">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Mail size={13} className="text-accent-600" /> Email
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="emp-doc-to">To</Label>
                <Input
                  id="emp-doc-to"
                  type="email"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="employee@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emp-doc-subject">Subject</Label>
                <Input id="emp-doc-subject" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emp-doc-body">Message</Label>
                <Textarea
                  id="emp-doc-body"
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
                {EMPLOYEE_DOC_TYPES.map(type => {
                  const def = docDefByType(type);
                  return <DocRow key={type} type={type} label={def?.label ?? type} />;
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
      </div>
    </div>
  );
}

export default RequestEmployeeDocsModal;
