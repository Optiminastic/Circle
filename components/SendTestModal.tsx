'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Send, Link2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select } from './Select';
import { BRAND } from '@/lib/brand';
import { Candidate, AssessmentQuestion } from '@/types';
import { useAssessmentBanks } from '@/features/question-banks/hooks';
import { useHrIdentity } from '@/features/employees/hooks';
import { emailTemplateById } from '@/lib/email-templates-catalog';
import {
  useEmailTemplateOverrides,
  resolveTemplate,
  renderTemplate,
} from '@/features/email-templates/hooks';

export interface SendTestResult {
  to: string;
  subject: string;
  body: string;
  /** The test link, rendered in the email as a labelled anchor button (never a
   *  raw URL in the body). */
  links: { label: string; url: string }[];
  /** Selected assessment questions (assessment only). */
  questions?: AssessmentQuestion[];
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
  const hr = useHrIdentity();

  // Candidate's email is pre-filled but HR can change it before sending.
  const [to, setTo] = useState(candidate.email || '');
  const [subject, setSubject] = useState('');

  // Assessment question sets from the Question Library (DB) — auto-select by role.
  const { data: assessmentBanks = [] } = useAssessmentBanks();
  const [bankId, setBankId] = useState('');
  useEffect(() => {
    if (isIq) return;
    const match = assessmentBanks.find(
      b => b.jobTitle.trim().toLowerCase() === position.trim().toLowerCase(),
    );
    if (match) setBankId(match.id);
  }, [isIq, position, assessmentBanks]);

  const selectedBank = assessmentBanks.find(b => b.id === bankId);
  const selectedQuestions: AssessmentQuestion[] = selectedBank
    ? selectedBank.questions
        .filter(q => q.q.trim())
        .map(q => ({ text: q.q.trim(), options: [...q.options], answer: q.answer }))
    : [];

  // The link itself is sent as a labelled button (see `linkLabel` below), so the
  // body only references it — no raw URL is ever pasted into the message.
  const linkLabel = isIq ? 'Start IQ Test' : 'Start Assessment';

  // Copy comes from Settings → Email templates, so HR's saved edits show here
  // and are what gets sent. The template embeds the link itself via
  // [[Start IQ Test|{{test_url}}]], so no separate link button is attached.
  const { data: overrides } = useEmailTemplateOverrides();
  const templateDef = emailTemplateById(isIq ? 'iq_invite' : 'assessment_invite');

  const composed = useMemo(() => {
    if (!templateDef) return '';
    const { body: tpl } = resolveTemplate(templateDef, overrides);
    return renderTemplate(tpl, {
      candidate_name: candidate.fullName,
      role: position,
      test_url: testUrl,
      hr_signoff: hr.signoff,
    });
  }, [templateDef, overrides, candidate.fullName, position, testUrl, hr.signoff]);

  const composedSubject = useMemo(() => {
    if (!templateDef) return '';
    const { subject: tpl } = resolveTemplate(templateDef, overrides);
    return renderTemplate(tpl, { candidate_name: candidate.fullName, role: position });
  }, [templateDef, overrides, candidate.fullName, position]);

  const [body, setBody] = useState(composed);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) {
      setSubject(composedSubject);
      setBody(composed);
    }
  }, [composed, composedSubject, edited]);

  const error = !to.trim()
    ? 'Candidate email is required.'
    : !EMAIL_RE.test(to.trim())
      ? 'Please enter a valid email address.'
      : !isIq && assessmentBanks.length === 0
        ? 'No assessment question sets — create one in Question Library → Assessment Questions.'
        : !isIq && selectedQuestions.length === 0
          ? 'Select an assessment question set to send.'
          : null;

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-gray-900">
            <Send size={15} className="text-accent-600" /> Send {what}
          </SheetTitle>
          <SheetDescription>
            {candidate.fullName} · {position}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4 text-xs">
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

          {!isIq && (
            <div>
              <Label className="text-[11px] font-medium text-gray-600">
                Assessment questions{' '}
                <span className="text-gray-400">(auto-selected by role)</span>
              </Label>
              {assessmentBanks.length === 0 ? (
                <p className="mt-1 rounded-md border border-dashed border-input bg-secondary/20 px-3 py-2 text-[11px] text-gray-500">
                  No assessment question sets found. Create one in Question Library → Assessment
                  Questions.
                </p>
              ) : (
                <>
                  <Select
                    value={bankId}
                    onChange={e => setBankId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm"
                    placeholder="Select an assessment question set"
                  >
                    <option value="">— Select a role —</option>
                    {assessmentBanks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.jobTitle} ({b.questions.length} question
                        {b.questions.length === 1 ? '' : 's'})
                      </option>
                    ))}
                  </Select>
                  {selectedQuestions.length > 0 && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      {selectedQuestions.length} question
                      {selectedQuestions.length === 1 ? '' : 's'} will be sent to the candidate.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

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
        </SheetBody>

        <SheetFooter className="justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!!error}
            onClick={() =>
              onConfirm({
                to: to.trim(),
                subject: subject.trim(),
                body,
                // The link is embedded in the template body, not appended here.
                links: [],
                ...(isIq ? {} : { questions: selectedQuestions }),
              })
            }
          >
            <Send size={14} /> Send {what}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SendTestModal;
