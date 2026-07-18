'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Loader2, RotateCcw, Pencil, X, Check } from 'lucide-react';
import {
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_GROUPS,
  emailTemplatesIn,
  type EmailTemplateDef,
} from '@/lib/email-templates-catalog';
import {
  useEmailTemplateOverrides,
  useEmailTemplateMutations,
  resolveTemplate,
  type EmailTemplateOverride,
} from '@/features/email-templates/hooks';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from './Toaster';

/**
 * Settings → Email templates. Every transactional email HR sends, editable in
 * one place. Saving stores an override that the send paths read at send time;
 * "Reset to default" deletes it so the built-in copy applies again.
 */
export function EmailTemplatesManager() {
  const { data: overrides, isLoading } = useEmailTemplateOverrides();
  const [editing, setEditing] = useState<EmailTemplateDef | null>(null);

  const standalone = EMAIL_TEMPLATES.filter(t => t.group === 'standalone');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] font-bold text-gray-900">Email templates</p>
        <p className="text-[11.5px] text-gray-500">
          Edit the emails Optiminastic sends. Saved changes are used the next time that email goes out.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-[12px] text-gray-500">
          <Loader2 size={14} className="animate-spin" /> Loading templates…
        </div>
      ) : (
        <>
          {/* Application received — kept out of the accordions on purpose */}
          <div className="space-y-1.5">
            {standalone.map(t => (
              <TemplateCard key={t.id} def={t} overrides={overrides} onEdit={() => setEditing(t)} />
            ))}
          </div>

          <Accordion type="multiple" defaultValue={['hiring']} className="space-y-2">
            {EMAIL_TEMPLATE_GROUPS.map(group => {
              const items = emailTemplatesIn(group.key);
              const customCount = items.filter(
                t => resolveTemplate(t, overrides).isCustom,
              ).length;
              return (
                <AccordionItem key={group.key} value={group.key}>
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      {group.label}
                      <span className="font-normal text-gray-400">({items.length})</span>
                      {customCount > 0 && (
                        <span className="rounded-full bg-accent-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent-700">
                          {customCount} edited
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5">
                      {items.map(t => (
                        <TemplateCard
                          key={t.id}
                          def={t}
                          overrides={overrides}
                          onEdit={() => setEditing(t)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </>
      )}

      {editing && (
        <TemplateEditor def={editing} overrides={overrides} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TemplateCard({
  def,
  overrides,
  onEdit,
}: {
  def: EmailTemplateDef;
  overrides: EmailTemplateOverride[] | undefined;
  onEdit: () => void;
}) {
  const { subject, isCustom } = resolveTemplate(def, overrides);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#E4E6EA] bg-white p-3 text-left transition hover:border-accent-400 hover:bg-[#FDFDFE]"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-900">
          <Mail size={13} className="shrink-0 text-accent-600" />
          {def.label}
          {isCustom && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wide text-emerald-700">
              Edited
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-gray-500">{def.description}</span>
        <span className="mt-0.5 block truncate font-mono text-[10.5px] text-gray-400">{subject}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E4E6EA] px-2 py-1 text-[10.5px] font-semibold text-gray-600">
        <Pencil size={11} /> Edit
      </span>
    </button>
  );
}

function TemplateEditor({
  def,
  overrides,
  onClose,
}: {
  def: EmailTemplateDef;
  overrides: EmailTemplateOverride[] | undefined;
  onClose: () => void;
}) {
  const toast = useToast();
  const { save, reset } = useEmailTemplateMutations();
  const resolved = resolveTemplate(def, overrides);

  const [subject, setSubject] = useState(resolved.subject);
  const [body, setBody] = useState(resolved.body);

  // Re-seed when a different template is opened.
  useEffect(() => {
    setSubject(resolved.subject);
    setBody(resolved.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  const dirty = subject !== resolved.subject || body !== resolved.body;

  const onSave = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and content can’t be empty.');
      return;
    }
    try {
      await save.mutateAsync({ id: def.id, subject: subject.trim(), body: body.trim() });
      toast.success(`“${def.label}” saved — it’ll be used from the next send.`);
      onClose();
    } catch {
      toast.error('Could not save the template — try again.');
    }
  };

  const onReset = async () => {
    try {
      await reset.mutateAsync(def.id);
      toast.success(`“${def.label}” reset to the default.`);
      onClose();
    } catch {
      toast.error('Could not reset the template — try again.');
    }
  };

  const busy = save.isPending || reset.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Mail size={15} className="text-accent-600" /> {def.label}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[11.5px] text-gray-500">{def.description}</p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="tpl-subject">Subject</Label>
            <Input id="tpl-subject" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tpl-body">Content</Label>
            <Textarea
              id="tpl-body"
              className="min-h-[280px] font-mono text-[12px]"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          {/* Placeholders are the contract between the template and the send site. */}
          <div className="rounded-lg border border-[#E4E6EA] bg-[#FBFBFC] p-2.5">
            <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
              Available placeholders — click to insert
            </p>
            <div className="flex flex-wrap gap-1.5">
              {def.placeholders.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBody(b => `${b}{{${p}}}`)}
                  className="rounded-md border border-[#E4E6EA] bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-600 transition hover:border-accent-400 hover:text-accent-600"
                >
                  {`{{${p}}}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-gray-500">
              Links must use <code className="font-mono text-gray-600">[[Label|url]]</code> — e.g.{' '}
              <code className="font-mono text-gray-600">[[Start your test|{'{{test_url}}'}]]</code>. They’re sent
              as buttons, never as raw URLs. The Optiminastic logo header and sign-off are added automatically.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECEDF0] pt-3">
          <button
            onClick={onReset}
            disabled={busy || !resolved.isCustom}
            title={resolved.isCustom ? 'Discard your edits and use the built-in copy' : 'Already the default'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-[#F1F3F5] disabled:opacity-40"
          >
            <RotateCcw size={12} /> Reset to default
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-[#E4E6EA] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 hover:bg-[#F1F3F5] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={busy || !dirty}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60"
            >
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {save.isPending ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplatesManager;
