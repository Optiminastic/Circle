'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Clock4,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Landmark,
  FileText,
  Lock,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { BankDetails, DocSubmission } from '@/types';
import { getDocRequest, uploadRequestDocument, saveDocRequestBankDetails } from '@/lib/api/doc-requests';
import { REQUIRED_DOCS, isSubmissionLocked } from '@/lib/onboarding-docs';

const portalKey = (token: string) => ['doc-request-portal', token] as const;

function fmtTimeLeft(ms: number): string {
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export default function OnboardingDocsPortal() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const qc = useQueryClient();

  const { data: request, isLoading, isError } = useQuery({
    queryKey: portalKey(token),
    queryFn: () => getDocRequest(token),
    enabled: Boolean(token),
    retry: false,
  });

  // Live countdown so the portal locks itself the moment the link expires.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const expiresMs = request ? new Date(request.expiresAt).getTime() - now : 0;
  const expired = Boolean(request) && expiresMs <= 0;

  const [bank, setBank] = useState<BankDetails>({ accountNumber: '', ifscCode: '' });
  const [bankSavedAt, setBankSavedAt] = useState<string | null>(null);
  useEffect(() => {
    if (request?.bankDetails) {
      setBank({
        accountHolderName: request.bankDetails.accountHolderName ?? '',
        bankName: request.bankDetails.bankName ?? '',
        accountNumber: request.bankDetails.accountNumber ?? '',
        ifscCode: request.bankDetails.ifscCode ?? '',
      });
      setBankSavedAt(request.updatedAt ?? request.createdAt);
    }
  }, [request?.id]);

  const [uploading, setUploading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const upload = useMutation({
    mutationFn: ({ docType, file }: { docType: string; file: File }) =>
      uploadRequestDocument({ token, docType, file }),
    onMutate: ({ docType }) => {
      setErrorMsg(null);
      setUploading(docType);
    },
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : 'Upload failed — try again.'),
    onSettled: () => {
      setUploading(null);
      qc.invalidateQueries({ queryKey: portalKey(token) });
    },
  });

  const saveBank = useMutation({
    mutationFn: () => saveDocRequestBankDetails(token, bank),
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : 'Could not save bank details.'),
    onSuccess: () => {
      setBankSavedAt(new Date().toISOString());
      qc.invalidateQueries({ queryKey: portalKey(token) });
    },
  });

  const submittedFor = useMemo(() => {
    const map = new Map<string, DocSubmission>();
    request?.submissions?.forEach(s => map.set(s.docType, s));
    return map;
  }, [request?.submissions]);

  // IFSC is 11 alphanumeric characters; account number at least 6 digits.
  const bankValid =
    bank.accountNumber.trim().length >= 6 && /^[A-Za-z0-9]{11}$/.test(bank.ifscCode.trim());
  const allDocsIn = (request?.requiredDocs ?? []).every(rt => submittedFor.has(rt));
  const allDone = allDocsIn && Boolean(request?.bankDetails?.accountNumber);

  /* ----------------------------- states ----------------------------- */

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Loading your secure upload link…
        </div>
      </Shell>
    );
  }

  if (isError || !request) {
    return (
      <Shell>
        <Notice
          icon={<XCircle className="text-red-500" size={28} />}
          title="This link is invalid"
          body="The upload link could not be found. Please use the most recent link from our HR team."
        />
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <Notice
          icon={<Clock4 className="text-amber-500" size={28} />}
          title="This link has expired"
          body="For security, document links are valid for 24 hours. Please reply to our email and we'll send you a fresh link right away."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-4">
        <div>
          <p className="text-sm font-bold text-gray-900">Welcome, {request.candidateName}</p>
          <p className="text-[12px] text-gray-500">
            {request.role ? `${request.role} · ` : ''}Upload your joining documents below.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-700">
          <Clock4 size={12} /> {fmtTimeLeft(expiresMs)}
        </span>
      </div>

      {allDone && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 size={18} />
          <p className="text-[12.5px] font-semibold">
            All set — your documents and bank details have been received. Our team will verify them shortly.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}

      {/* Documents */}
      <section className="space-y-2.5">
        <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <FileText size={13} /> Documents
        </h2>
        {REQUIRED_DOCS.map(doc => {
          const sub = submittedFor.get(doc.type);
          const isUploading = uploading === doc.type;
          const rejected = sub?.status === 'Rejected';
          const locked = isSubmissionLocked(sub);
          return (
            <div
              key={doc.type}
              className={`flex items-center justify-between gap-3 rounded-lg border bg-white p-3 ${
                rejected ? 'border-red-300' : locked ? 'border-emerald-300' : sub ? 'border-emerald-200' : 'border-[#E4E6EA]'
              }`}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-800">
                  {sub && !rejected && <CheckCircle2 size={14} className="text-emerald-500" />}
                  {rejected && <XCircle size={14} className="text-red-500" />}
                  {doc.label}
                  {locked && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                      <Lock size={8} /> Verified
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-gray-500">
                  {locked
                    ? `${sub?.fileName ?? ''} — verified by our team. This document is locked.`
                    : rejected
                      ? `Rejected${sub?.reviewReason ? ` — ${sub.reviewReason}` : ''}. Please re-upload.`
                      : sub
                        ? sub.fileName
                        : doc.hint}
                </p>
              </div>
              <div className="shrink-0">
                {locked ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                    <Lock size={13} /> Locked
                  </span>
                ) : (
                  <>
                    <input
                      ref={el => {
                        fileInputs.current[doc.type] = el;
                      }}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) upload.mutate({ docType: doc.type, file });
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputs.current[doc.type]?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-600 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <UploadCloud size={13} />
                      )}
                      {sub ? 'Replace' : 'Upload'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Bank details */}
      <section className="mt-6 space-y-3">
        <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <Landmark size={13} /> Bank details (for salary)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Account holder name">
            <input
              className={FIELD}
              value={bank.accountHolderName ?? ''}
              onChange={e => setBank(b => ({ ...b, accountHolderName: e.target.value }))}
              placeholder="As per bank records"
            />
          </Field>
          <Field label="Bank name">
            <input
              className={FIELD}
              value={bank.bankName ?? ''}
              onChange={e => setBank(b => ({ ...b, bankName: e.target.value }))}
              placeholder="e.g. HDFC Bank"
            />
          </Field>
          <Field label="Account number *">
            <input
              className={FIELD}
              inputMode="numeric"
              value={bank.accountNumber}
              onChange={e => setBank(b => ({ ...b, accountNumber: e.target.value.replace(/[^0-9]/g, '') }))}
              placeholder="Your account number"
            />
          </Field>
          <Field label="IFSC code *">
            <input
              className={`${FIELD} uppercase`}
              value={bank.ifscCode}
              onChange={e => setBank(b => ({ ...b, ifscCode: e.target.value.toUpperCase() }))}
              placeholder="e.g. HDFC0001234"
              maxLength={11}
            />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!bankValid || saveBank.isPending}
            onClick={() => saveBank.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveBank.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            Save bank details
          </button>
          {bankSavedAt && !saveBank.isPending && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
          {!bankValid && (bank.accountNumber || bank.ifscCode) && (
            <span className="text-[11px] text-gray-400">Enter a valid account number and IFSC (e.g. HDFC0001234).</span>
          )}
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-gray-400">
        Your information is encrypted in transit and used only for employment verification.
      </p>
    </Shell>
  );
}

/* ------------------------------ chrome ------------------------------ */

const FIELD =
  'w-full rounded-md border border-[#E4E6EA] bg-white px-2.5 py-2 text-[13px] text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-[12px] font-semibold text-gray-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F1F3F5] px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-5 flex items-center gap-2">
          <Logo size={26} />
          <span className="text-sm font-bold text-gray-800">{BRAND.name}</span>
        </div>
        <div className="rounded-2xl border border-[#E4E6EA] bg-[#F7F8FA] p-5 shadow-sm sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function Notice({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {icon}
      <p className="text-base font-bold text-gray-900">{title}</p>
      <p className="max-w-sm text-[12.5px] text-gray-500">{body}</p>
    </div>
  );
}
