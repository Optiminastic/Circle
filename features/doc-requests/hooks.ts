'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DocRequest } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { sendTestEmail } from '@/lib/api/notifications';
import { nowISO, randomToken } from '@/lib/utils';
import { REQUIRED_DOC_TYPES, docPortalPath, DOC_REQUEST_TTL_HOURS } from '@/lib/onboarding-docs';

export function useDocRequests() {
  // Candidates upload from their own session, so HR must poll to see new
  // submissions land — refetch on focus/mount and every 20s while open.
  return useQuery({
    queryKey: qk.docRequests.all,
    queryFn: () => repositories.docRequests.list(),
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 20_000,
  });
}

/** Is this request still within its 24h window? */
export function isDocRequestLive(req: DocRequest): boolean {
  return new Date(req.expiresAt).getTime() > Date.now();
}

export function useDocRequestMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.docRequests.all });

  // Create a 24h request and email the candidate their secure upload link.
  const create = useMutation({
    mutationFn: async (input: {
      candidateId: string;
      candidateName: string;
      email: string;
      role?: string;
    }) => {
      const expiresAt = new Date(Date.now() + DOC_REQUEST_TTL_HOURS * 3600 * 1000).toISOString();

      // Reuse an existing live request for this candidate so "Resend" re-emails the
      // SAME link (and extends its window) instead of spawning empty duplicates the
      // candidate's uploads won't show up on. Only mint a new token if none is live.
      const existing = (qc.getQueryData<DocRequest[]>(qk.docRequests.all) ?? [])
        .filter(r => r.candidateId === input.candidateId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const live = existing.find(r => new Date(r.expiresAt).getTime() > Date.now());

      let request: DocRequest;
      if (live) {
        request = { ...live, email: input.email || live.email, role: input.role ?? live.role, expiresAt };
        await repositories.docRequests.patch(live.id, {
          email: request.email,
          role: request.role,
          expiresAt,
        });
      } else {
        request = {
          id: randomToken('DOC'),
          candidateId: input.candidateId,
          candidateName: input.candidateName,
          email: input.email,
          role: input.role,
          requiredDocs: REQUIRED_DOC_TYPES,
          submissions: [],
          status: 'Pending',
          createdAt: nowISO(),
          expiresAt,
        };
        await repositories.docRequests.create(request);
      }

      const link = `${window.location.origin}${docPortalPath(request.id)}`;
      let emailed = false;
      let emailReason: string | undefined;
      if (input.email) {
        const res = await sendTestEmail({
          to: input.email,
          candidateName: input.candidateName,
          template: 'doc_request',
          testUrl: link,
          position: input.role,
        }).catch(() => ({ sent: false, reason: undefined } as { sent: boolean; reason?: string }));
        emailed = res.sent;
        emailReason = res.reason;
      }
      return { request, link, emailed, emailReason };
    },
    onSuccess: invalidate,
  });

  // HR marks one submitted document Verified or Rejected (with a reason).
  const verify = useMutation({
    mutationFn: async (input: {
      request: DocRequest;
      docType: string;
      status: 'Verified' | 'Rejected';
      reason?: string;
    }) => {
      const submissions = input.request.submissions.map(s =>
        s.docType === input.docType
          ? { ...s, status: input.status, reviewReason: input.reason, reviewedAt: nowISO() }
          : s,
      );
      const allVerified = input.request.requiredDocs.every(
        rt => submissions.find(s => s.docType === rt)?.status === 'Verified',
      );
      const bankOk = Boolean(
        input.request.bankDetails?.accountNumber && input.request.bankDetails?.ifscCode,
      );
      return repositories.docRequests.patch(input.request.id, {
        submissions,
        status: allVerified && bankOk ? 'Verified' : input.request.status,
      });
    },
    onSuccess: invalidate,
  });

  return { create, verify };
}
