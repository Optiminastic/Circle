'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BankDetails, DocRequest } from '@/types';
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
  // On a resend, `prior` carries the existing request so already-verified
  // (locked) documents survive — they are NOT wiped, and the candidate sees
  // them locked on the fresh link instead of being asked to re-upload.
  const create = useMutation({
    mutationFn: async (input: {
      candidateId: string;
      candidateName: string;
      email: string;
      role?: string;
      prior?: DocRequest;
      // When true, only create/reuse the request + return the link — the caller
      // sends its own (editable) email instead of the built-in template.
      skipEmail?: boolean;
    }) => {
      const expiresAt = new Date(Date.now() + DOC_REQUEST_TTL_HOURS * 3600 * 1000).toISOString();

      // Reuse an existing live request for this candidate so "Resend" re-emails the
      // SAME link (and extends its window) instead of spawning empty duplicates the
      // candidate's uploads won't show up on. Only mint a new token if none is live.
      // Exclude the signed-offer link (kind='signed-offer') — it only accepts the
      // signed offer letter, not the joining documents.
      const existing = (qc.getQueryData<DocRequest[]>(qk.docRequests.all) ?? [])
        .filter(r => r.candidateId === input.candidateId && r.kind !== 'signed-offer')
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
        // New link: carry over already-verified (locked) documents + bank details
        // from the previous request so the candidate isn't asked to re-upload what
        // has already been cleared.
        const prior = input.prior ?? existing[0];
        const carried = (prior?.submissions ?? []).filter(s => s.status === 'Verified');
        const bank = prior?.bankDetails;
        const allVerified =
          carried.length > 0 && REQUIRED_DOC_TYPES.every(rt => carried.some(s => s.docType === rt));
        const bankOk = bank?.status === 'Verified';
        request = {
          id: randomToken('DOC'),
          candidateId: input.candidateId,
          candidateName: input.candidateName,
          email: input.email,
          role: input.role,
          requiredDocs: REQUIRED_DOC_TYPES,
          submissions: carried,
          bankDetails: bank,
          status: allVerified && bankOk ? 'Verified' : 'Pending',
          createdAt: nowISO(),
          expiresAt,
        };
        await repositories.docRequests.create(request);
      }

      const link = `${window.location.origin}${docPortalPath(request.id)}`;
      let emailed = false;
      let emailReason: string | undefined;
      if (input.email && !input.skipEmail) {
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
      const bankOk = input.request.bankDetails?.status === 'Verified';
      return repositories.docRequests.patch(input.request.id, {
        submissions,
        status: allVerified && bankOk ? 'Verified' : input.request.status,
      });
    },
    onSuccess: invalidate,
  });

  // HR verifies (or rejects) the submitted bank details, like a document.
  const verifyBank = useMutation({
    mutationFn: async (input: { request: DocRequest; status: 'Verified' | 'Rejected'; reason?: string }) => {
      const bank: BankDetails = {
        ...(input.request.bankDetails as BankDetails),
        status: input.status,
        reviewReason: input.reason,
        reviewedAt: nowISO(),
      };
      const allDocsVerified = input.request.requiredDocs.every(
        rt => input.request.submissions.find(s => s.docType === rt)?.status === 'Verified',
      );
      const bankVerified = input.status === 'Verified';
      const status =
        allDocsVerified && bankVerified
          ? 'Verified'
          : input.request.status === 'Verified'
            ? 'Submitted'
            : input.request.status;
      return repositories.docRequests.patch(input.request.id, { bankDetails: bank, status });
    },
    onSuccess: invalidate,
  });

  // Reactivate an expired link by extending its window by `hours` from now (the
  // token/URL stays the same, so a link already in the candidate's inbox works
  // again — no new email needed).
  const reactivate = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) =>
      repositories.docRequests.patch(id, {
        expiresAt: new Date(Date.now() + Math.max(1, hours) * 3600 * 1000).toISOString(),
      }),
    onSuccess: invalidate,
  });

  return { create, verify, verifyBank, reactivate };
}
