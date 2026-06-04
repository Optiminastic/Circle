'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Candidate } from '@/types';
import { useJob, useApplyToJob } from '@/features/jobs/hooks';
import { uploadDocument } from '@/lib/api/documents';
import {
  MapPin,
  Briefcase,
  Clock4,
  Wallet,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  UploadCloud,
  FileText,
  X,
} from 'lucide-react';

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  currentCompany: '',
  currentDesignation: '',
  totalExperienceYears: 0,
  currentCtc: '',
  expectedCtc: '',
  noticePeriodDays: 30,
  resumeUrl: '',
  linkedInUrl: '',
  coverNote: '',
};

const inputCls =
  'w-full px-3 py-2 border border-[#EAEAEC] rounded-lg text-sm bg-[#F6F6F7] focus:bg-white focus:outline-none focus:border-accent-400 transition';

const MAX_RESUME_MB = 5;

const formatSize = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function PublicJobPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? '';

  const { data: job, isLoading, isError } = useJob(jobId);
  const apply = useApplyToJob();

  const [form, setForm] = useState(EMPTY);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<typeof EMPTY>) => setForm(prev => ({ ...prev, ...patch }));

  const pickResume = (file: File | null) => {
    if (!file) {
      setResumeFile(null);
      return;
    }
    if (file.size > MAX_RESUME_MB * 1024 * 1024) {
      setError(
        `Your resume must be ${MAX_RESUME_MB} MB or smaller — "${file.name}" is ${formatSize(file.size)}.`,
      );
      setResumeFile(null);
      return;
    }
    setError(null);
    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    if (!form.fullName.trim() || !form.email.trim()) {
      alert('Please provide your full name and email.');
      return;
    }
    setError(null);

    const id = `CAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate: Candidate = {
      id,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      location: form.location,
      currentCompany: form.currentCompany,
      currentDesignation: form.currentDesignation,
      totalExperienceYears: Number(form.totalExperienceYears) || 0,
      relevantExperienceYears: Number(form.totalExperienceYears) || 0,
      currentCtc: form.currentCtc,
      expectedCtc: form.expectedCtc,
      noticePeriodDays: Number(form.noticePeriodDays) || 0,
      // The uploaded file lives in the candidate's document panel; this keeps a
      // human-readable marker (filename or the optional link) on the profile.
      resumeUrl: resumeFile ? resumeFile.name : form.resumeUrl,
      linkedInUrl: form.linkedInUrl,
      appliedRole: job.title,
      department: job.department,
      sourceOfApplication: 'Job Posting',
      referralDetails: `Applied via public posting ${job.id}`,
      hrRemarks: form.coverNote,
      status: 'New Application',
      appliedDate: new Date().toISOString().split('T')[0],
      jobId: job.id,
    };

    try {
      await apply.mutateAsync(candidate);
      // Upload the resume under the same scope the HR candidate profile reads
      // (entityType "candidate" / category "resume") so it appears there.
      if (resumeFile) {
        await uploadDocument({
          entityType: 'candidate',
          entityId: id,
          category: 'resume',
          file: resumeFile,
        });
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `Could not submit your application: ${err.message}`
          : 'Could not submit your application. Please try again.',
      );
    }
  };

  const busy = apply.isPending;

  // --- States -------------------------------------------------------------
  if (isLoading) {
    return (
      <Centered>
        <Loader2 className="animate-spin text-accent-600" size={26} />
        <p className="text-gray-500 text-sm">Loading opening…</p>
      </Centered>
    );
  }

  if (isError || !job) {
    return (
      <Centered>
        <AlertTriangle className="text-amber-500" size={28} />
        <p className="text-gray-800 font-semibold">This opening could not be found</p>
        <p className="text-gray-500 text-sm">The link may be incorrect or the posting was removed.</p>
      </Centered>
    );
  }

  if (submitted) {
    return (
      <Centered>
        <CheckCircle2 className="text-emerald-500" size={34} />
        <p className="text-gray-900 font-bold text-lg">Application submitted!</p>
        <p className="text-gray-500 text-sm max-w-sm text-center">
          Thanks for applying to <span className="font-semibold">{job.title}</span>. Our HR team has
          received your details and will be in touch.
        </p>
      </Centered>
    );
  }

  const closed = job.status === 'Closed' || job.status === 'On Hold';
  const requirements = job.requirements
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F6F6F7]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#EAEAEC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2.5">
          <Logo size={26} />
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight font-display leading-none">
              Curcle
            </h1>
            <p className="text-[10px] text-gray-400 uppercase font-mono font-semibold tracking-wider">
              Careers
            </p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-accent-600 to-accent-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 rounded-full px-2.5 py-1 mb-3">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${closed ? 'bg-red-300' : 'bg-emerald-300'}`}
                />
                {closed ? 'Applications closed' : 'Actively hiring'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{job.title}</h2>
              <p className="text-white/70 text-xs font-mono mt-1">
                {job.department} · Ref {job.id}
              </p>
            </div>
            <a
              href="#apply"
              className="lg:hidden shrink-0 bg-white text-accent-700 hover:bg-white/90 px-4 py-2 rounded-lg font-semibold text-sm text-center transition"
            >
              Apply now
            </a>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { icon: <MapPin size={13} />, label: job.location },
              { icon: <Briefcase size={13} />, label: `${job.employmentType} · ${job.workMode}` },
              { icon: <Clock4 size={13} />, label: `${job.minExperienceYears}+ yrs` },
              { icon: <Wallet size={13} />, label: `${job.salaryMin} – ${job.salaryMax}` },
            ].map((chip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs bg-white/15 rounded-full px-3 py-1.5"
              >
                {chip.icon}
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
        {/* Job details */}
        <section className="lg:col-span-3 space-y-5">
          <div className="bg-white border border-[#EAEAEC] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-2">About the role</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {job.description}
              </p>
            </div>
            {requirements.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">What we're looking for</h3>
                <ul className="space-y-1.5">
                  {requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={15} className="text-accent-500 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Apply form */}
        <section id="apply" className="lg:col-span-2 scroll-mt-20">
          <div className="bg-white border border-[#EAEAEC] rounded-2xl p-5 sm:p-6 shadow-2xs lg:sticky lg:top-20">
            <h3 className="font-bold text-gray-900 text-base mb-1">Apply for this role</h3>
            <p className="text-xs text-gray-400 mb-4">
              Your details go straight to the hiring team.
            </p>

            {closed ? (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg p-3">
                Applications for this posting are currently closed.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Field label="Full name *">
                  <input
                    className={inputCls}
                    value={form.fullName}
                    onChange={e => set({ fullName: e.target.value })}
                    placeholder="Jane Doe"
                    required
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email *">
                    <input
                      type="email"
                      className={inputCls}
                      value={form.email}
                      onChange={e => set({ email: e.target.value })}
                      placeholder="jane@email.com"
                      required
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      className={inputCls}
                      value={form.phone}
                      onChange={e => set({ phone: e.target.value })}
                      placeholder="+1 555 123 4567"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Previous company">
                    <input
                      className={inputCls}
                      value={form.currentCompany}
                      onChange={e => set({ currentCompany: e.target.value })}
                      placeholder="Acme Inc."
                    />
                  </Field>
                  <Field label="Current title">
                    <input
                      className={inputCls}
                      value={form.currentDesignation}
                      onChange={e => set({ currentDesignation: e.target.value })}
                      placeholder="Frontend Engineer"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Current salary">
                    <input
                      className={inputCls}
                      value={form.currentCtc}
                      onChange={e => set({ currentCtc: e.target.value })}
                      placeholder="$120,000"
                    />
                  </Field>
                  <Field label="Expected salary">
                    <input
                      className={inputCls}
                      value={form.expectedCtc}
                      onChange={e => set({ expectedCtc: e.target.value })}
                      placeholder="$140,000"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Experience (yrs)">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.totalExperienceYears}
                      onChange={e => set({ totalExperienceYears: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Notice period (days)">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.noticePeriodDays}
                      onChange={e => set({ noticePeriodDays: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <Field label="Resume">
                  {resumeFile ? (
                    <div className="flex items-center gap-2.5 border border-[#EAEAEC] rounded-lg px-3 py-2.5 bg-accent-50/50">
                      <span className="w-8 h-8 rounded-md bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {resumeFile.name}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {formatSize(resumeFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => pickResume(null)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer shrink-0"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1 cursor-pointer border border-dashed border-[#D0D2D6] rounded-lg px-3 py-5 bg-[#F6F6F7] hover:border-accent-400 hover:bg-accent-50/40 transition text-center">
                      <UploadCloud size={20} className="text-accent-500" />
                      <span className="text-xs font-semibold text-gray-600">
                        Click to upload your resume
                      </span>
                      <span className="text-[10px] text-gray-400">
                        PDF, DOC, DOCX · up to {MAX_RESUME_MB} MB
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.rtf,.txt"
                        className="hidden"
                        onChange={e => pickResume(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </Field>
                <Field label="Or resume link (optional)">
                  <input
                    className={inputCls}
                    value={form.resumeUrl}
                    onChange={e => set({ resumeUrl: e.target.value })}
                    placeholder="Google Drive / Dropbox / portfolio URL"
                  />
                </Field>
                <Field label="LinkedIn">
                  <input
                    className={inputCls}
                    value={form.linkedInUrl}
                    onChange={e => set({ linkedInUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/…"
                  />
                </Field>
                <Field label="Cover note">
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={form.coverNote}
                    onChange={e => set({ coverNote: e.target.value })}
                    placeholder="Why are you a great fit?"
                  />
                </Field>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  {busy ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Submitting…
                    </>
                  ) : (
                    'Submit application'
                  )}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-[11px] text-gray-400">
        Powered by Curcle HR · {job.department}
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F6F7] flex flex-col items-center justify-center gap-3 px-5">
      {children}
    </div>
  );
}
