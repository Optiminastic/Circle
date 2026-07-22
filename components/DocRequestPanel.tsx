'use client';

import React, { useMemo, useState } from 'react';
import { Select } from './Select';
import {
  FileText,
  Landmark,
  Copy,
  Clock4,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Lock,
  Users,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DocRequest } from '@/types';
import { qk } from '@/lib/query/keys';
import { useCandidates } from '@/features/candidates/hooks';
import { useDocRequests, useDocRequestMutations, isDocRequestLive } from '@/features/doc-requests/hooks';
import { openDocument, downloadDocument } from '@/features/documents/hooks';
import { docDefsFor, needsBank, needsReferences, isSubmissionLocked } from '@/lib/onboarding-docs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useToast } from '@/components/Toaster';

interface DocRequestPanelProps {
  candidateId: string;
  candidateName: string;
  /** Fallback email when the candidate record isn't resolvable (e.g. post-onboarding). */
  email?: string;
}

function fmtExpiry(req: DocRequest): string {
  const ms = new Date(req.expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`;
}

export function DocRequestPanel({ candidateId, candidateName, email }: DocRequestPanelProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: candidates = [] } = useCandidates();
  const { data: requests = [], isFetching } = useDocRequests();
  const { verify, verifyBank, reactivate } = useDocRequestMutations();
  const [reHours, setReHours] = useState(24);
  const [rejectingBank, setRejectingBank] = useState(false);
  const [bankReason, setBankReason] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.docRequests.all });
    toast.info('Checking for new uploads…');
  };

  const candidate = candidates.find(c => c.id === candidateId);
  // Resolve the recipient: live candidate record first, then the passed fallback.
  const toEmail = candidate?.email || email || '';

  // Pick the request that actually holds the candidate's data. Resending creates
  // a fresh link, so prefer the one with the most uploads / bank details (the one
  // the candidate actually used); fall back to the most recent.
  const request = useMemo(() => {
    const score = (r: DocRequest) =>
      (r.submissions?.length ?? 0) + (r.bankDetails?.accountNumber ? 1 : 0);
    return requests
      .filter(r => r.candidateId === candidateId && r.kind !== 'signed-offer')
      .sort(
        (a, b) =>
          score(b) - score(a) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
  }, [requests, candidateId]);

  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const submittedFor = useMemo(() => {
    const map = new Map<string, NonNullable<DocRequest['submissions']>[number]>();
    request?.submissions?.forEach(s => map.set(s.docType, s));
    return map;
  }, [request]);

  const requestLink = request ? `${window.location.origin}/onboarding-docs/${request.id}` : '';

  const copyLink = () => {
    navigator.clipboard?.writeText(requestLink).then(
      () => toast.success('Upload link copied.'),
      () => toast.error('Could not copy the link.'),
    );
  };

  const runVerify = (docType: string, status: 'Verified' | 'Rejected', why?: string) => {
    if (!request) return;
    verify.mutate(
      { request, docType, status, reason: why },
      {
        onSuccess: () => {
          toast.success(status === 'Verified' ? 'Document verified.' : 'Document rejected.');
          setRejecting(null);
          setReason('');
        },
        onError: () => toast.error('Could not update the document — try again.'),
      },
    );
  };

  const runVerifyBank = (status: 'Verified' | 'Rejected', why?: string) => {
    if (!request) return;
    verifyBank.mutate(
      { request, status, reason: why },
      {
        onSuccess: () => {
          toast.success(status === 'Verified' ? 'Bank details verified.' : 'Bank details rejected.');
          setRejectingBank(false);
          setBankReason('');
        },
        onError: () => toast.error('Could not update bank details — try again.'),
      },
    );
  };

  const live = request ? isDocRequestLive(request) : false;
  const bank = request?.bankDetails;
  const fileDocs = docDefsFor(request?.requiredDocs).filter(d => d.kind === 'file');
  const verifiedCount = fileDocs.filter(
    d => submittedFor.get(d.type)?.status === 'Verified',
  ).length;
  // Whatever the candidate saved through the public link — however many.
  const references = request?.references ?? [];

  return (
    <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-2xl p-4 shadow-2xs space-y-4 md:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDEEF1] pb-2.5">
        <div>
          <h4 className="flex items-center gap-1.5 font-bold text-gray-900">
            <FileText size={14} className="text-accent-600" /> Joining documents
          </h4>
          <p className="text-[10px] text-gray-500">
            Send a secure 24-hour link, then verify each document the candidate uploads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {request && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                request.status === 'Verified'
                  ? 'bg-emerald-50 text-emerald-600'
                  : request.status === 'Submitted'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-amber-50 text-amber-600'
              }`}
            >
              {request.status}
            </span>
          )}
          {request && (
            <button
              onClick={refresh}
              title="Check for new uploads"
              aria-label="Refresh"
              className="grid size-7 place-items-center rounded-lg border border-[#E4E6EA] text-gray-500 transition hover:border-accent-400 hover:text-accent-600"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {!request ? (
        <p className="py-6 text-center text-[12px] text-gray-500">
          No document request yet. Use{' '}
          <span className="font-semibold">Request documents</span> on the “Joining Documents” step to
          email {toEmail || 'the candidate'} a secure upload link.
        </p>
      ) : (
        <>
          {/* Link + expiry */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E4E6EA] bg-[#F1F3F5] px-3 py-2">
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
                live ? 'text-amber-700' : 'text-red-600'
              }`}
            >
              <Clock4 size={12} /> {fmtExpiry(request)}
            </span>
            <div className="flex items-center gap-1.5">
              {!live && request && (
                <>
                  <Select
                    value={reHours}
                    onChange={e => setReHours(Number(e.target.value))}
                    className="rounded-md border border-[#E4E6EA] bg-white px-1.5 py-1 text-[10px] font-semibold text-gray-600"
                  >
                    <option value={24}>24h</option>
                    <option value={48}>48h</option>
                    <option value={72}>72h</option>
                    <option value={168}>7 days</option>
                  </Select>
                  <button
                    onClick={() =>
                      reactivate.mutate(
                        { id: request.id, hours: reHours },
                        {
                          onSuccess: () => toast.success('Upload link reactivated.'),
                          onError: () => toast.error('Could not reactivate the link — try again.'),
                        },
                      )
                    }
                    disabled={reactivate.isPending}
                    className="inline-flex items-center gap-1 rounded-md border border-accent-300 bg-accent-50 px-2 py-1 text-[10px] font-semibold text-accent-700 transition hover:bg-accent-100 disabled:opacity-60"
                  >
                    {reactivate.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Reactivate
                  </button>
                </>
              )}
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-[#FFFFFF] px-2 py-1 text-[10px] font-semibold text-gray-600 transition hover:border-accent-400 hover:text-accent-600"
              >
                <Copy size={11} /> Copy link
              </button>
            </div>
          </div>

          {/* Document verification rows — collapsed by default to keep the panel
              scannable; bank details and references stay outside. */}
          <Accordion type="multiple">
            <AccordionItem value="docs">
              <AccordionTrigger className="px-3.5 py-3.5 text-[12.5px]">
                <span className="flex items-center gap-2">
                  <FileText size={13} className="text-accent-600" /> Document files
                  <span className="font-normal text-gray-400">({fileDocs.length})</span>
                  {verifiedCount > 0 && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-700">
                      {verifiedCount}/{fileDocs.length} verified
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
          <div className="space-y-2">
            {fileDocs.map(doc => {
              const sub = submittedFor.get(doc.type);
              const locked = isSubmissionLocked(sub);
              return (
                <div
                  key={doc.type}
                  className={`rounded-lg border p-2.5 ${
                    locked ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#E4E6EA] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
                        {sub?.status === 'Verified' && <CheckCircle2 size={13} className="text-emerald-500" />}
                        {sub?.status === 'Rejected' && <XCircle size={13} className="text-red-500" />}
                        {doc.label}
                        {doc.optional && !sub && (
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-gray-500">
                            Optional
                          </span>
                        )}
                        {locked && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                            <Lock size={8} /> Locked
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[10px] text-gray-500">
                        {sub ? sub.fileName : 'Not uploaded yet'}
                        {sub?.status === 'Rejected' && sub.reviewReason ? ` — ${sub.reviewReason}` : ''}
                      </p>
                    </div>
                    {sub && (
                      <div className="flex shrink-0 items-center gap-1">
                        <IconBtn title="View" onClick={() => openDocument(sub.documentId)}>
                          <Eye size={13} />
                        </IconBtn>
                        <IconBtn title="Download" onClick={() => downloadDocument(sub.documentId, sub.fileName)}>
                          <Download size={13} />
                        </IconBtn>
                        {locked ? (
                          // Verified = approved & locked: no further review actions.
                          <span
                            title="Verified — locked"
                            className="grid size-7 place-items-center rounded-md border border-emerald-500 bg-emerald-500 text-white"
                          >
                            <Lock size={12} />
                          </span>
                        ) : (
                          <>
                            <IconBtn
                              title="Verify"
                              tone="green"
                              active={false}
                              onClick={() => runVerify(doc.type, 'Verified')}
                            >
                              <CheckCircle2 size={13} />
                            </IconBtn>
                            <IconBtn
                              title="Reject"
                              tone="red"
                              active={sub.status === 'Rejected'}
                              onClick={() => setRejecting(rejecting === doc.type ? null : doc.type)}
                            >
                              <XCircle size={13} />
                            </IconBtn>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {!locked && rejecting === doc.type && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        autoFocus
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Reason for rejection (shown to the candidate)"
                        className="flex-1 rounded-md border border-[#E4E6EA] bg-[#FFFFFF] px-2 py-1 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                      />
                      <button
                        onClick={() => runVerify(doc.type, 'Rejected', reason.trim() || undefined)}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Bank details — only when HR requested them */}
          {needsBank(request?.requiredDocs) && (
          <div className="rounded-lg border border-[#E4E6EA] bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
                <Landmark size={13} className="text-accent-600" /> Bank details
              </p>
              {bank?.accountNumber && bank.status && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    bank.status === 'Verified'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {bank.status}
                </span>
              )}
            </div>
            {bank?.accountNumber ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <KV k="Account holder" v={bank.accountHolderName || '—'} />
                  <KV k="Bank" v={bank.bankName || '—'} />
                  <KV k="Account no." v={bank.accountNumber} />
                  <KV k="IFSC" v={bank.ifscCode} />
                </div>
                {bank.status === 'Rejected' && bank.reviewReason && (
                  <p className="mt-1.5 text-[10px] text-red-600">Rejected — {bank.reviewReason}</p>
                )}
                {bank.status === 'Verified' ? (
                  <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <Lock size={11} /> Verified &amp; locked
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      onClick={() => runVerifyBank('Verified')}
                      disabled={verifyBank.isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-60"
                    >
                      <CheckCircle2 size={12} /> Verify
                    </button>
                    <button
                      onClick={() => setRejectingBank(v => !v)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                        bank.status === 'Rejected'
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : 'border-[#E4E6EA] bg-white text-gray-600 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                )}
                {rejectingBank && bank.status !== 'Verified' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      autoFocus
                      value={bankReason}
                      onChange={e => setBankReason(e.target.value)}
                      placeholder="Reason for rejection (shown to the candidate)"
                      className="flex-1 rounded-md border border-[#E4E6EA] bg-white px-2 py-1 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    />
                    <button
                      onClick={() => runVerifyBank('Rejected', bankReason.trim() || undefined)}
                      className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[11px] text-gray-500">Not submitted yet.</p>
            )}
          </div>
          )}

          {/* Reference contacts the candidate submitted through the public link. */}
          {needsReferences(request?.requiredDocs) && (
            <div className="rounded-lg border border-[#E4E6EA] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
                  <Users size={13} className="text-accent-600" /> Reference contacts
                </p>
                {references.length > 0 && (
                  <span className="rounded-full bg-accent-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent-700">
                    {references.length}
                  </span>
                )}
              </div>
              {references.length === 0 ? (
                <p className="text-[11px] text-gray-500">Not submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {references.map((r, i) => (
                    <div key={i} className="rounded-md border border-[#EDEEF1] bg-[#FBFBFC] p-2">
                      <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Reference {i + 1}
                      </p>
                      <p className="text-[11.5px] font-semibold text-gray-800">{r.organization}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="hover:text-accent-600">
                            {r.email}
                          </a>
                        )}
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="hover:text-accent-600">
                            {r.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {request.status === 'Verified' && (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <ShieldCheck size={13} /> All documents verified for {candidateName}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  tone = 'gray',
  active = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  tone?: 'gray' | 'green' | 'red';
  active?: boolean;
}) {
  const tones: Record<string, string> = {
    gray: 'border-[#E4E6EA] text-gray-500 hover:text-accent-600 hover:border-accent-400',
    green: active
      ? 'border-emerald-500 bg-emerald-500 text-white'
      : 'border-[#E4E6EA] text-emerald-600 hover:border-emerald-400',
    red: active
      ? 'border-red-500 bg-red-500 text-white'
      : 'border-[#E4E6EA] text-red-600 hover:border-red-400',
  };
  return (
    <button
      title={title}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md border transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-gray-400">{k}</p>
      <p className="text-gray-700">{v}</p>
    </div>
  );
}
