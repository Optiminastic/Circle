'use client';

import React, { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileText,
  Lock,
  KeyRound,
  Plus,
  X,
  Eye,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import {
  getHandoverPortal,
  submitHandoverCredentials,
  uploadHandoverDocument,
} from '@/lib/api/exit-handover';
import { documentPreviewUrl } from '@/lib/api/documents';

const portalKey = (token: string) => ['exit-handover-portal', token] as const;

const inputCls =
  'w-full rounded-md border border-[#E4E6EA] bg-white px-2.5 py-2 text-[13px] text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';
const cardCls = 'rounded-2xl border border-[#E4E6EA] bg-white p-5 shadow-sm sm:p-6';
const btnCls =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50';

const fmtSize = (b: number) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

export default function ExitHandoverPortal() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const qc = useQueryClient();

  const {
    data: portal,
    isLoading,
    isError,
  } = useQuery({
    queryKey: portalKey(token),
    queryFn: () => getHandoverPortal(token),
    enabled: Boolean(token),
    retry: false,
  });

  const [workEmail, setWorkEmail] = useState('');
  const [password, setPassword] = useState('');
  // Extra credentials the employee adds as key/value pairs (e.g. tool logins).
  const [extras, setExtras] = useState<{ key: string; value: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const expired = Boolean(portal?.expired);

  const setExtra = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setExtras(prev => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const addExtra = () => setExtras(prev => [...prev, { key: '', value: '' }]);
  const removeExtra = (i: number) => setExtras(prev => prev.filter((_, idx) => idx !== i));

  const saveCreds = useMutation({
    mutationFn: () =>
      submitHandoverCredentials(
        token,
        workEmail.trim(),
        password,
        extras.filter(e => e.key.trim()).map(e => ({ key: e.key.trim(), value: e.value })),
      ),
    onMutate: () => setErr(null),
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : 'Could not submit credentials.'),
    onSuccess: () => {
      setPassword('');
      qc.invalidateQueries({ queryKey: portalKey(token) });
    },
  });

  // Upload every selected file; report any that failed but keep the rest.
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const failed: string[] = [];
      for (const f of files) {
        try {
          await uploadHandoverDocument(token, f);
        } catch {
          failed.push(f.name);
        }
      }
      if (failed.length) throw new Error(`Could not upload: ${failed.join(', ')}`);
    },
    onMutate: () => setErr(null),
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : 'Upload failed — try again.'),
    onSettled: () => {
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: portalKey(token) });
    },
  });

  if (isLoading) {
    return (
      <Centered>
        <Loader2 className="animate-spin text-accent-600" size={26} />
        <p className="text-sm text-gray-500">Loading your handover page…</p>
      </Centered>
    );
  }
  if (isError || !portal) {
    return (
      <Centered>
        <AlertTriangle className="text-amber-500" size={28} />
        <p className="font-semibold text-gray-800">This handover link is invalid</p>
        <p className="text-sm text-gray-500">The link may be incorrect or was removed. Contact HR.</p>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <header className="border-b border-[#EDEEF1] bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-5">
          <Logo size={24} />
          <span className="font-display text-sm font-bold tracking-tight text-gray-900">{BRAND.name}</span>
          <span className="ml-auto font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Exit Handover
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-8 sm:py-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Hi {portal.employeeName || 'there'},
          </h1>
          <p className="text-[13px] text-gray-500">
            As part of your exit{portal.lastWorkingDay ? ` (last working day ${portal.lastWorkingDay})` : ''},
            please hand over your work-account access and any pending files below.
          </p>
        </div>

        {expired ? (
          <div className={cardCls}>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-red-600">
              <Lock size={15} /> This handover link has expired. Please ask HR for a new one.
            </p>
          </div>
        ) : (
          <>
            {/* Credentials */}
            <section className={cardCls}>
              <h2 className="mb-1 flex items-center gap-2 text-[14px] font-bold text-gray-900">
                <KeyRound size={15} className="text-accent-600" /> Work account credentials
              </h2>
              <p className="mb-4 text-[12px] text-gray-500">
                Your password is encrypted and only used to transfer/secure your accounts. It is deleted once
                the handover is complete.
              </p>
              {portal.credentialsSubmitted ? (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
                  <CheckCircle2 size={14} /> Credentials submitted. You can re-submit to update them.
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Work email">
                  <input
                    type="email"
                    className={inputCls}
                    value={workEmail}
                    onChange={e => setWorkEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    className={inputCls}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              </div>

              {/* Extra credentials (key/value) — add as many as needed */}
              {extras.length > 0 && (
                <div className="mt-3 space-y-2">
                  {extras.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className={inputCls}
                        value={ex.key}
                        onChange={e => setExtra(i, { key: e.target.value })}
                        placeholder="Label (e.g. GitHub, AWS console)"
                      />
                      <input
                        className={inputCls}
                        value={ex.value}
                        onChange={e => setExtra(i, { value: e.target.value })}
                        placeholder="Username / value"
                      />
                      <button
                        type="button"
                        onClick={() => removeExtra(i)}
                        className="shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={addExtra}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-600 hover:underline"
                >
                  <Plus size={13} /> Add more credentials
                </button>
              </div>

              <div className="mt-4 border-t border-[#EDEEF1] pt-4">
                <button
                  type="button"
                  onClick={() => saveCreds.mutate()}
                  disabled={saveCreds.isPending || !workEmail.trim() || !password}
                  className={btnCls}
                >
                  {saveCreds.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  {portal.credentialsSubmitted ? 'Update credentials' : 'Submit credentials'}
                </button>
              </div>
            </section>

            {/* Documents */}
            <section className={cardCls}>
              <h2 className="mb-1 flex items-center gap-2 text-[14px] font-bold text-gray-900">
                <FileText size={15} className="text-accent-600" /> Handover documents & files
              </h2>
              <p className="mb-4 text-[12px] text-gray-500">
                Upload any pending documents, files, or credentials lists — add as many as you need.
              </p>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#D7DAE0] bg-[#F1F3F5] px-3 py-6 text-center transition hover:border-accent-400 hover:bg-accent-50/40">
                {upload.isPending ? (
                  <Loader2 size={20} className="animate-spin text-accent-500" />
                ) : (
                  <UploadCloud size={20} className="text-accent-500" />
                )}
                <span className="text-xs font-semibold text-gray-600">
                  {upload.isPending ? 'Uploading…' : 'Click to upload files'}
                </span>
                <span className="text-[10px] text-gray-500">
                  Select one or more files · up to a few MB each
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  disabled={upload.isPending}
                  onChange={e => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) upload.mutate(files);
                  }}
                />
              </label>

              {portal.documents.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {portal.documents.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 rounded-lg border border-[#E4E6EA] bg-[#F7F8FA] px-3 py-2"
                    >
                      <FileText size={14} className="shrink-0 text-accent-600" />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-gray-800">
                        {d.fileName}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-gray-500">{fmtSize(d.size)}</span>
                      {d.documentId && (
                        <a
                          href={documentPreviewUrl(d.documentId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-gray-400 transition hover:text-accent-600"
                          title="Preview"
                          aria-label="Preview"
                        >
                          <Eye size={14} />
                        </a>
                      )}
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {err && <p className="text-center text-xs text-red-600">{err}</p>}
      </main>

      <footer className="mx-auto max-w-2xl px-5 py-8 text-center text-[11px] text-gray-400">
        {BRAND.name} · Exit Handover
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-[12px] font-semibold text-gray-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F6F7F9] px-5 text-center">
      {children}
    </div>
  );
}
