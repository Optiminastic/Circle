'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';
import { getDocRequest, uploadRequestDocument } from '@/lib/api/doc-requests';
import { SIGNED_OFFER_DOC } from '@/lib/sign-offer';
import type { DocRequest } from '@/types';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';

type Phase = 'loading' | 'ready' | 'expired' | 'error' | 'done';

export default function SignOfferPage() {
  const params = useParams();
  const token = String(params?.token ?? '');
  const [req, setReq] = useState<DocRequest | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getDocRequest(token)
      .then(r => {
        setReq(r);
        const expired = new Date(r.expiresAt).getTime() < Date.now();
        const uploaded = (r.submissions || []).some(s => s.docType === SIGNED_OFFER_DOC);
        setPhase(expired ? 'expired' : uploaded ? 'done' : 'ready');
      })
      .catch(() => setPhase('error'));
  }, [token]);

  const MAX_MB = 5;
  const isAllowed = (f: File) =>
    /\.(pdf|docx?)$/i.test(f.name) ||
    [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(f.type);

  const pickFile = (f: File | null) => {
    setError('');
    if (!f) {
      setFile(null);
      return;
    }
    if (!isAllowed(f)) {
      setFile(null);
      setError('Please upload a PDF or Word document (.pdf, .doc, .docx).');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setError(`File must be under ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadRequestDocument({ token, docType: SIGNED_OFFER_DOC, file });
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — the link may have expired.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-5">
          <Logo size={24} />
          <span className="font-display text-sm font-bold tracking-tight">{BRAND.company}</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-12">
        <div className="rounded-2xl border border-[#E4E6EA] bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold">Upload your signed offer letter</h1>
          {req?.candidateName && (
            <p className="mt-1 text-[13px] text-gray-500">For {req.candidateName}</p>
          )}

          {phase === 'loading' && (
            <p className="mt-6 flex items-center gap-2 text-[13px] text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </p>
          )}

          {phase === 'error' && (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-gray-500">
              <AlertTriangle className="text-amber-500" size={28} />
              <p className="font-semibold text-gray-800">This link is invalid</p>
              <p className="text-sm">Please ask HR for a fresh upload link.</p>
            </div>
          )}

          {phase === 'expired' && (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-gray-500">
              <AlertTriangle className="text-amber-500" size={28} />
              <p className="font-semibold text-gray-800">This link has expired</p>
              <p className="text-sm">The upload link was valid for 48 hours. Please ask HR for a new one.</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-gray-600">
              <CheckCircle2 className="text-emerald-500" size={30} />
              <p className="font-semibold text-gray-800">Thank you!</p>
              <p className="text-sm">Your signed offer letter has been received. You can close this page.</p>
            </div>
          )}

          {phase === 'ready' && (
            <div className="mt-5 space-y-4">
              <p className="text-[13px] leading-relaxed text-gray-600">
                Please attach the signed copy of your offer letter — <strong>PDF or Word only</strong>,
                <strong> under 5 MB</strong>. This link is valid for 48 hours.
              </p>
              <input
                type="file"
                accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={e => pickFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-dashed border-[#CBD0D6] p-3 text-[13px] text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-accent-600 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
              />
              {error && <p className="text-[12px] text-red-600">{error}</p>}
              <button
                onClick={upload}
                disabled={!file || uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {uploading ? 'Uploading…' : 'Upload signed offer letter'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
