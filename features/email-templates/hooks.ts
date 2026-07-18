'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http/client';
import { RESOURCES } from '@/lib/api/resources';
import { qk } from '@/lib/query/keys';
import { nowISO } from '@/lib/utils';
import { emailTemplateById, type EmailTemplateDef } from '@/lib/email-templates-catalog';

const SLUG = RESOURCES.emailTemplateOverrides.slug;

/** One HR-saved template. Absent row = the built-in default is in use. */
export interface EmailTemplateOverride {
  id: string;
  subject: string;
  body: string;
  updatedAt?: string;
}

export function useEmailTemplateOverrides() {
  return useQuery({
    queryKey: qk.emailTemplateOverrides.all,
    queryFn: () => http.get<EmailTemplateOverride[]>(`/${SLUG}`),
    // Templates change rarely; the send paths read from cache.
    staleTime: 60_000,
  });
}

export function useEmailTemplateMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.emailTemplateOverrides.all });

  // Upsert: the row id is the template id, so saving twice edits the same row.
  const save = useMutation({
    mutationFn: async (input: { id: string; subject: string; body: string }) => {
      const row: EmailTemplateOverride = {
        id: input.id,
        subject: input.subject,
        body: input.body,
        updatedAt: nowISO(),
      };
      const existing = qc
        .getQueryData<EmailTemplateOverride[]>(qk.emailTemplateOverrides.all)
        ?.some(t => t.id === input.id);
      if (existing) return http.patch<EmailTemplateOverride>(`/${SLUG}/${input.id}`, row);
      return http.post<EmailTemplateOverride>(`/${SLUG}`, row);
    },
    onSuccess: invalidate,
  });

  /** Drop the override so the built-in default applies again. */
  const reset = useMutation({
    mutationFn: (id: string) => http.delete<void>(`/${SLUG}/${id}`),
    onSuccess: invalidate,
  });

  return { save, reset };
}

/**
 * The copy that should actually go out for `id` — HR's saved version if there is
 * one, otherwise the built-in default from the catalogue.
 */
export function resolveTemplate(
  def: EmailTemplateDef,
  overrides: EmailTemplateOverride[] | undefined,
): { subject: string; body: string; isCustom: boolean } {
  const saved = overrides?.find(o => o.id === def.id);
  if (saved?.subject?.trim() && saved?.body?.trim()) {
    return { subject: saved.subject, body: saved.body, isCustom: true };
  }
  return { subject: def.defaultSubject, body: def.defaultBody, isCustom: false };
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Substitute {{tokens}}. Unknown tokens resolve to '' so braces never reach a
 * candidate — unless `keepUnknown` is set, which leaves them for a later pass
 * (used when a value like the upload URL only exists at send time).
 */
export function renderTemplate(
  text: string,
  vars: Record<string, string | number | undefined>,
  opts?: { keepUnknown?: boolean },
): string {
  return text.replace(TOKEN_RE, (match, name: string) => {
    const v = vars[name];
    if (v === undefined || v === null) return opts?.keepUnknown ? match : '';
    return String(v);
  });
}

/**
 * Resolve + render a template outside React (stores, event handlers).
 *
 * Fetches the overrides directly rather than reading the query cache, so a send
 * always uses the latest saved copy. If the fetch fails we fall back to the
 * built-in default rather than blocking the send.
 */
export async function fetchRenderedTemplate(
  id: string,
  vars: Record<string, string | number | undefined>,
  opts?: { keepUnknown?: boolean },
): Promise<{ subject: string; body: string } | null> {
  const def = emailTemplateById(id);
  if (!def) return null;
  let overrides: EmailTemplateOverride[] | undefined;
  try {
    overrides = await http.get<EmailTemplateOverride[]>(`/${SLUG}`);
  } catch {
    overrides = undefined;
  }
  const resolved = resolveTemplate(def, overrides);
  return {
    subject: renderTemplate(resolved.subject, vars, opts),
    body: renderTemplate(resolved.body, vars, opts),
  };
}

/**
 * Convenience for send sites: resolve + render a template in one call.
 * Returns null when the id isn't in the catalogue (caller keeps its own copy).
 */
export function useRenderedTemplate(
  id: string,
  vars: Record<string, string | number | undefined>,
): { subject: string; body: string; isCustom: boolean } | null {
  const { data: overrides } = useEmailTemplateOverrides();
  const def = emailTemplateById(id);
  if (!def) return null;
  const { subject, body, isCustom } = resolveTemplate(def, overrides);
  return {
    subject: renderTemplate(subject, vars),
    body: renderTemplate(body, vars),
    isCustom,
  };
}
