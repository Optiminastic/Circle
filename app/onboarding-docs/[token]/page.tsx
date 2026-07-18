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
  Users,
  Plus,
  Trash2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { BankDetails, DocSubmission, ReferenceContact } from '@/types';
import {
  docDefsFor,
  requiredFileDocTypes,
  needsBank,
  needsReferences,
  REFERENCE_COUNT,
  isSubmissionLocked,
  ONGRID_CONSENT_TEXT,
} from '@/lib/onboarding-docs';
import {
  getDocRequest,
  uploadRequestDocument,
  saveDocRequestBankDetails,
  saveDocRequestReferences,
  saveDocRequestConsent,
} from '@/lib/api/doc-requests';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

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

  // Starts with one reference; the candidate adds as many as they want.
  const [refs, setRefs] = useState<ReferenceContact[]>(() =>
    Array.from({ length: REFERENCE_COUNT }, () => ({ organization: '', email: '', phone: '' })),
  );
  const [refsSaved, setRefsSaved] = useState(false);
  useEffect(() => {
    if (request?.references?.length) {
      setRefs(request.references);
      setRefsSaved(true);
    }
  }, [request?.id]);

  const addRef = () => setRefs(prev => [...prev, { organization: '', email: '', phone: '' }]);
  const removeRef = (i: number) => setRefs(prev => prev.filter((_, j) => j !== i));

  // OnGrid consent — must be given before HR can onboard the candidate to OnGrid.
  const [consentChecked, setConsentChecked] = useState(false);
  useEffect(() => {
    if (request?.consent?.agreed) setConsentChecked(true);
  }, [request?.id]);
  const saveConsent = useMutation({
    mutationFn: (agreed: boolean) =>
      saveDocRequestConsent(token, {
        agreed,
        text: ONGRID_CONSENT_TEXT,
        at: new Date().toISOString(),
      }),
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : 'Could not save consent.'),
    onSuccess: () => qc.invalidateQueries({ queryKey: portalKey(token) }),
  });
  const consentSaved = Boolean(request?.consent?.agreed);

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

  const saveRefs = useMutation({
    mutationFn: () => saveDocRequestReferences(token, refs),
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : 'Could not save references.'),
    onSuccess: () => {
      setRefsSaved(true);
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
  // Once HR verifies the bank details they're locked, like an approved document:
  // read-only, no Save button — just a "Verified" state.
  const bankLocked = request?.bankDetails?.status === 'Verified';

  // Only what HR actually asked for counts towards "all done".
  const wantBank = needsBank(request?.requiredDocs);
  const wantRefs = needsReferences(request?.requiredDocs);
  const docCards = docDefsFor(request?.requiredDocs).filter(d => d.kind === 'file');

  // Per-reference validation: complete fields, a valid email that is neither the
  // candidate's own nor a duplicate of another reference, and a 10-digit phone.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const candidateEmailNorm = (request?.email ?? '').trim().toLowerCase();
  const refError = (i: number): string | null => {
    const r = refs[i];
    if (!r.organization.trim()) return 'Enter the organization name.';
    const email = r.email.trim().toLowerCase();
    if (!email) return 'Enter an email.';
    if (!EMAIL_RE.test(r.email.trim())) return 'Enter a valid email.';
    if (email === candidateEmailNorm) return 'This can’t be your own email.';
    if (refs.some((o, j) => j !== i && o.email.trim().toLowerCase() === email))
      return 'This email is already used for another reference.';
    if (r.phone.trim().length !== 10) return 'Enter a 10-digit contact number.';
    return null;
  };
  // At least one reference, and every row valid.
  const refsValid = refs.length > 0 && refs.every((_, i) => refError(i) === null);

  // Optional documents (e.g. "current offer letter") don't block "all done".
  const allDocsIn = requiredFileDocTypes(request?.requiredDocs).every(rt => submittedFor.has(rt));
  const allDone =
    allDocsIn &&
    (!wantBank || Boolean(request?.bankDetails?.accountNumber)) &&
    (!wantRefs || Boolean(request?.references?.length));
  // Everything is not just submitted but VERIFIED (each doc locked, bank verified).
  const allVerified =
    allDone &&
    docCards.every(d => isSubmissionLocked(submittedFor.get(d.type))) &&
    (!wantBank || bankLocked);

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
        {allDone ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              allVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <CheckCircle2 size={12} /> {allVerified ? 'All verified' : 'All received'}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-700">
            <Clock4 size={12} /> {fmtTimeLeft(expiresMs)}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}

      {/* Documents / Bank details / Reference contact — one tab each. */}
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <FileText size={13} /> Documents
          </TabsTrigger>
          {wantBank && (
            <TabsTrigger value="bank" className="flex items-center gap-1.5">
              <Landmark size={13} /> Bank details
            </TabsTrigger>
          )}
          {wantRefs && (
            <TabsTrigger value="reference" className="flex items-center gap-1.5">
              <Users size={13} /> Reference contact
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="documents" className="space-y-2.5">
        {docCards.map(doc => {
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
        </TabsContent>

        {/* Bank details — only when HR requested them */}
        {wantBank && (
        <TabsContent value="bank" className="space-y-3">
        {bankLocked && (
          <span className="inline-flex w-fit items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
            <Lock size={8} /> Verified
          </span>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="bank-holder">Account holder name</Label>
            <Input
              id="bank-holder"
              disabled={bankLocked}
              value={bank.accountHolderName ?? ''}
              onChange={e => setBank(b => ({ ...b, accountHolderName: e.target.value }))}
              placeholder="As per bank records"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank-name">Bank name</Label>
            <Input
              id="bank-name"
              disabled={bankLocked}
              value={bank.bankName ?? ''}
              onChange={e => setBank(b => ({ ...b, bankName: e.target.value }))}
              placeholder="e.g. HDFC Bank"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank-account">Account number *</Label>
            <Input
              id="bank-account"
              inputMode="numeric"
              disabled={bankLocked}
              value={bank.accountNumber}
              onChange={e => setBank(b => ({ ...b, accountNumber: e.target.value.replace(/[^0-9]/g, '') }))}
              placeholder="Your account number"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bank-ifsc">IFSC code *</Label>
            <Input
              id="bank-ifsc"
              className="uppercase"
              disabled={bankLocked}
              value={bank.ifscCode}
              onChange={e => setBank(b => ({ ...b, ifscCode: e.target.value.toUpperCase() }))}
              placeholder="e.g. HDFC0001234"
              maxLength={11}
            />
          </div>
        </div>
        {!bankLocked && (
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
        )}
        </TabsContent>
        )}

        {/* Past-employer references — only when HR requested them */}
        {wantRefs && (
        <TabsContent value="reference" className="space-y-3">
          <p className="text-[11px] text-gray-500">
            Please share a reference from a past organization. You can add more than one.
          </p>
          {refs.map((r, i) => (
            <div key={i} className="rounded-lg border border-[#E4E6EA] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Reference {i + 1}
                </p>
                {refs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRef(i)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] px-1.5 py-0.5 text-[10.5px] font-semibold text-gray-500 transition hover:border-red-300 hover:text-red-600"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor={`ref-org-${i}`}>Organization name</Label>
                  <Input
                    id={`ref-org-${i}`}
                    value={r.organization}
                    onChange={e =>
                      setRefs(prev => prev.map((x, j) => (j === i ? { ...x, organization: e.target.value } : x)))
                    }
                    placeholder="e.g. Acme Pvt Ltd"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`ref-email-${i}`}>Email</Label>
                  <Input
                    id={`ref-email-${i}`}
                    type="email"
                    value={r.email}
                    onChange={e =>
                      setRefs(prev => prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                    }
                    placeholder="name@company.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`ref-phone-${i}`}>Contact number</Label>
                  <Input
                    id={`ref-phone-${i}`}
                    inputMode="numeric"
                    maxLength={10}
                    value={r.phone}
                    onChange={e =>
                      setRefs(prev =>
                        prev.map((x, j) =>
                          j === i ? { ...x, phone: e.target.value.replace(/\D/g, '').slice(0, 10) } : x,
                        ),
                      )
                    }
                    placeholder="10-digit number"
                  />
                </div>
              </div>
              {/* Inline validation, shown once the row has been started. */}
              {(r.organization || r.email || r.phone) && refError(i) && (
                <p className="mt-1.5 text-[11px] text-red-600">{refError(i)}</p>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addRef}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#C9CDD3] bg-white py-2 text-[12px] font-semibold text-gray-600 transition hover:border-accent-400 hover:text-accent-600"
          >
            <Plus size={13} /> Add another reference
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!refsValid || saveRefs.isPending}
              onClick={() => saveRefs.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveRefs.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              Save references
            </button>
            {refsSaved && !saveRefs.isPending && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 size={13} /> Saved
              </span>
            )}
            {!refsValid && (
              <span className="text-[11px] text-gray-400">
                Complete each reference with a unique email and a 10-digit number.
              </span>
            )}
          </div>
        </TabsContent>
        )}
      </Tabs>

      {/* Consent — required before we can share anything with our verification
          partner. The full text is collapsed behind the arrow on the right. */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <ShieldCheck size={13} /> Consent
        </h2>
        <div className="flex items-center gap-2.5 rounded-xl border border-[#E4E6EA] bg-white px-3.5">
          <Checkbox
            checked={consentChecked}
            disabled={saveConsent.isPending}
            onCheckedChange={v => {
              const agreed = v === true;
              setConsentChecked(agreed);
              saveConsent.mutate(agreed);
            }}
          />
          <Accordion type="single" collapsible className="min-w-0 flex-1">
            <AccordionItem value="consent" className="rounded-none border-0 bg-transparent">
              <AccordionTrigger className="px-0 py-2.5 text-[12.5px]">
                <span className="flex items-center gap-1.5">
                  I consent to background verification
                  {consentSaved && !saveConsent.isPending && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wide text-emerald-700">
                      <CheckCircle2 size={9} /> Saved
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="border-0 bg-transparent px-0 pb-3 pt-0">
                <span className="block text-[11px] leading-relaxed text-gray-500">{ONGRID_CONSENT_TEXT}</span>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-gray-400">
        Your information is encrypted in transit and used only for employment verification.
      </p>
    </Shell>
  );
}

/* ------------------------------ chrome ------------------------------ */

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
