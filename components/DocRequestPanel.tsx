'use client';

import React, { useMemo, useState } from 'react';
import {
  FileText,
  Landmark,
  Send,
  Copy,
  Clock4,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { DocRequest } from '@/types';
import { useCandidates } from '@/features/candidates/hooks';
import { useDocRequests, useDocRequestMutations, isDocRequestLive } from '@/features/doc-requests/hooks';
import { openDocument } from '@/features/documents/hooks';
import { REQUIRED_DOCS, isSubmissionLocked } from '@/lib/onboarding-docs';
import { useToast } from '@/components/Toaster';

interface DocRequestPanelProps {
  candidateId: string;
  candidateName: string;
}

function fmtExpiry(req: DocRequest): string {
  const ms = new Date(req.expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`;
}

export function DocRequestPanel({ candidateId, candidateName }: DocRequestPanelProps) {
  const toast = useToast();
  const { data: candidates = [] } = useCandidates();
  const { data: requests = [] } = useDocRequests();
  const { create, verify } = useDocRequestMutations();

  const candidate = candidates.find(c => c.id === candidateId);

  // The most recent request for this candidate (re-requests supersede older ones).
  const request = useMemo(
    () =>
      requests
        .filter(r => r.candidateId === candidateId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    [requests, candidateId],
  );

  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const submittedFor = useMemo(() => {
    const map = new Map<string, NonNullable<DocRequest['submissions']>[number]>();
    request?.submissions?.forEach(s => map.set(s.docType, s));
    return map;
  }, [request]);

  const requestLink = request ? `${window.location.origin}/onboarding-docs/${request.id}` : '';

  const handleRequest = () => {
    create.mutate(
      {
        candidateId,
        candidateName,
        email: candidate?.email ?? '',
        role: candidate?.appliedRole,
        // Carry verified/locked docs forward so a resend never wipes them.
        prior: request,
      },
      {
        onSuccess: ({ emailed, emailReason }) => {
          if (emailed) toast.success('Document link sent to the candidate.');
          else if (emailReason === 'not_configured')
            toast.info('Link created. Email not sent — SMTP is not configured (copy the link to share).');
          else if (!candidate?.email)
            toast.info('Link created, but no email on file — copy the link to share it.');
          else toast.info('Link created, but the email could not be sent — copy the link to share.');
        },
        onError: () => toast.error('Could not create the document link — try again.'),
      },
    );
  };

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

  const live = request ? isDocRequestLive(request) : false;
  const bank = request?.bankDetails;

  return (
    <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-5 space-y-4 md:col-span-3">
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
          <button
            onClick={handleRequest}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
          >
            {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {request ? 'Resend / new link' : 'Request documents'}
          </button>
        </div>
      </div>

      {!request ? (
        <p className="py-6 text-center text-[12px] text-gray-500">
          No document request yet. Click <span className="font-semibold">Request documents</span> to email{' '}
          {candidate?.email ? candidate.email : 'the candidate'} a secure upload link.
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
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-[#FFFFFF] px-2 py-1 text-[10px] font-semibold text-gray-600 transition hover:border-accent-400 hover:text-accent-600"
            >
              <Copy size={11} /> Copy link
            </button>
          </div>

          {/* Document verification rows */}
          <div className="space-y-2">
            {REQUIRED_DOCS.map(doc => {
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

          {/* Bank details */}
          <div className="rounded-lg border border-[#E4E6EA] bg-white p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-gray-800">
              <Landmark size={13} className="text-accent-600" /> Bank details
            </p>
            {bank?.accountNumber ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                <KV k="Account holder" v={bank.accountHolderName || '—'} />
                <KV k="Bank" v={bank.bankName || '—'} />
                <KV k="Account no." v={bank.accountNumber} />
                <KV k="IFSC" v={bank.ifscCode} />
              </div>
            ) : (
              <p className="text-[11px] text-gray-500">Not submitted yet.</p>
            )}
          </div>

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
