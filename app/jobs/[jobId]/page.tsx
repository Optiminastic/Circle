'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Candidate } from '@/types';
import { useJob, useApplyToJob } from '@/features/jobs/hooks';
import { uploadDocument } from '@/lib/api/documents';
import { buildAnswers, computeFit } from '@/lib/screening';
import { BRAND } from '@/lib/brand';
import { useToast } from '@/components/Toaster';
import { Tip } from '@/components/ui/tooltip';
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
  'w-full px-3 py-2 border border-[#DAD4C8] rounded-lg text-sm bg-[#ECE8E0] focus:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus:border-accent-400 transition';

const MAX_RESUME_MB = 5;

// Per-field input sanitisers — keep each field to its own data type.
const onlyLetters = (v: string) => v.replace(/[^A-Za-z\s.'-]/g, ''); // names, titles
const onlyCompany = (v: string) => v.replace(/[^A-Za-z0-9\s.,&'-]/g, ''); // company names
const onlyDigits = (v: string) => v.replace(/\D/g, ''); // phone
const onlyDecimal = (v: string) => v.replace(/[^0-9.]/g, ''); // CTC
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// LinkedIn profile/company URL (linkedin.com or its country/sub domains).
const LINKEDIN_RE = /^https?:\/\/([a-z0-9-]+\.)*linkedin\.com\/.+/i;
// Google Drive / Docs share link.
const DRIVE_RE = /^https?:\/\/(drive|docs)\.google\.com\/.+/i;

const formatSize = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function PublicJobPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? '';

  const { data: job, isLoading, isError } = useJob(jobId);
  const apply = useApplyToJob();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0); // 0 = your details, 1 = screening questions
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<typeof EMPTY>) => setForm(prev => ({ ...prev, ...patch }));

  const pickResume = (file: File | null) => {
    if (!file) {
      setResumeFile(null);
      return;
    }
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Your resume must be a PDF file.');
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

  // Every field is required except "Previous company" and the Google Drive link.
  const validateDetails = (): string | null => {
    if (!form.fullName.trim()) return 'Please enter your full name.';
    if (!form.email.trim()) return 'Please enter your email.';
    if (!EMAIL_RE.test(form.email.trim())) return 'Please enter a valid email address.';
    if (!form.phone.trim()) return 'Please enter your phone number.';
    if (form.phone.trim().length !== 10)
      return 'Please enter a valid 10-digit phone number.';
    if (!form.currentDesignation.trim()) return 'Please enter your current title.';
    if (!String(form.currentCtc).trim()) return 'Please enter your current CTC.';
    if (!String(form.expectedCtc).trim()) return 'Please enter your expected CTC.';
    if (String(form.totalExperienceYears).trim() === '')
      return 'Please enter your total experience.';
    if (String(form.noticePeriodDays).trim() === '')
      return 'Please enter your notice period.';
    if (!resumeFile) return 'Please upload your resume.';
    if (form.resumeUrl.trim() && !DRIVE_RE.test(form.resumeUrl.trim()))
      return 'Please enter a valid Google Drive link (e.g. https://drive.google.com/…).';
    if (!form.linkedInUrl.trim()) return 'Please enter your LinkedIn profile URL.';
    if (!LINKEDIN_RE.test(form.linkedInUrl.trim()))
      return 'Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/your-profile).';
    if (!form.coverNote.trim()) return 'Please add a short cover note.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    const detailsError = validateDetails();
    if (detailsError) {
      toast.error(detailsError);
      setStep(0);
      return;
    }
    const questions = job.screeningQuestions ?? [];
    // On the details step (e.g. Enter key) advance to the questions, don't submit.
    if (step === 0 && questions.length > 0) {
      setStep(1);
      return;
    }
    // Yes/No and choice questions are required; short-text is optional.
    if (questions.filter(q => (q.type ?? 'yesno') !== 'text').some(q => !responses[q.id])) {
      toast.error('Please answer all the screening questions.');
      return;
    }
    setError(null);

    // Resume is mandatory — never save a candidate without it.
    if (!resumeFile) {
      toast.error('Please upload your resume before submitting.');
      setStep(0);
      return;
    }

    const screeningAnswers = questions.length ? buildAnswers(questions, responses) : undefined;
    const fitRating = screeningAnswers ? computeFit(screeningAnswers) : undefined;

    const id = `CAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate: Candidate = {
      id,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone ? `+91 ${form.phone}` : '',
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
      screeningAnswers,
      fitRating,
    };

    // 1) Upload the resume FIRST (entityType "candidate" / category "resume" — the
    //    same scope the HR candidate profile reads). If this fails, we abort and
    //    DO NOT save the candidate, so no one is ever recorded without a resume.
    try {
      await uploadDocument({
        entityType: 'candidate',
        entityId: id,
        category: 'resume',
        file: resumeFile,
      });
    } catch {
      setError('Your resume could not be uploaded. Please try again — your application was not submitted.');
      return;
    }

    // 2) Resume is in storage — now save the candidate so it appears for this role.
    try {
      await apply.mutateAsync(candidate);
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
  const hasQuestions = (job?.screeningQuestions ?? []).length > 0;

  // Step 1 (details) → next: validate the basics, then move to the questions.
  const goNext = () => {
    const detailsError = validateDetails();
    if (detailsError) {
      toast.error(detailsError);
      return;
    }
    setError(null);
    setStep(1);
  };

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

  const driveInvalid = form.resumeUrl.trim() !== '' && !DRIVE_RE.test(form.resumeUrl.trim());
  const linkedinInvalid = form.linkedInUrl.trim() !== '' && !LINKEDIN_RE.test(form.linkedInUrl.trim());

  const closed = job.status === 'Closed' || job.status === 'On Hold';
  const requirements = job.requirements
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#ECE8E0]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#F7F4EE]/90 backdrop-blur border-b border-[#DAD4C8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2.5">
          <a
            href={BRAND.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 transition hover:opacity-80"
            title="Optiminastic"
          >
            <Logo size={26} />
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-tight font-display leading-none">
                {BRAND.name}
              </h1>
              <p className="text-[10px] text-gray-500 uppercase font-mono font-semibold tracking-wider">
                Careers
              </p>
            </div>
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-accent-600 to-accent-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-[#F7F4EE]/15 rounded-full px-2.5 py-1 mb-3">
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
              className="lg:hidden shrink-0 bg-[#F7F4EE] text-accent-700 hover:bg-[#F7F4EE]/90 px-4 py-2 rounded-lg font-semibold text-sm text-center transition"
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
                className="inline-flex items-center gap-1.5 text-xs bg-[#F7F4EE]/15 rounded-full px-3 py-1.5"
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
          <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
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
          <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-2xl p-5 sm:p-6 shadow-2xs lg:sticky lg:top-20">
            <h3 className="font-bold text-gray-900 text-base mb-1">Apply for this role</h3>
            <p className="text-xs text-gray-500 mb-4">
              Your details go straight to the hiring team.
            </p>

            {closed ? (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg p-3">
                Applications for this posting are currently closed.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {hasQuestions && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                      Step {step + 1} of 2
                    </span>
                    <span className="text-[11px] text-gray-500">
                      · {step === 0 ? 'Your details' : 'A few quick questions'}
                    </span>
                  </div>
                )}

                {step === 0 && (
                  <>
                <Field label="Full name *">
                  <input
                    className={inputCls}
                    value={form.fullName}
                    onChange={e => set({ fullName: onlyLetters(e.target.value) })}
                    placeholder="Enter your full name"
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
                      placeholder="example@email.com"
                      required
                    />
                  </Field>
                  <Field label="Phone *">
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[#DAD4C8] bg-[#E6E1D8] text-sm text-gray-600">
                        +91
                      </span>
                      <input
                        inputMode="numeric"
                        className={`${inputCls} rounded-l-none`}
                        value={form.phone}
                        onChange={e => set({ phone: onlyDigits(e.target.value).slice(0, 10) })}
                        placeholder="98765 43210"
                        required
                      />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Previous company">
                    <input
                      className={inputCls}
                      value={form.currentCompany}
                      onChange={e => set({ currentCompany: onlyCompany(e.target.value) })}
                      placeholder="Enter your previous company"
                    />
                  </Field>
                  <Field label="Current title *">
                    <input
                      className={inputCls}
                      value={form.currentDesignation}
                      onChange={e => set({ currentDesignation: onlyLetters(e.target.value) })}
                      placeholder="Enter your current job title"
                      required
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Current CTC (LPA) *">
                    <input
                      inputMode="decimal"
                      className={inputCls}
                      value={form.currentCtc}
                      onChange={e => set({ currentCtc: onlyDecimal(e.target.value) })}
                      placeholder="e.g. 12"
                      required
                    />
                  </Field>
                  <Field label="Expected CTC (LPA) *">
                    <input
                      inputMode="decimal"
                      className={inputCls}
                      value={form.expectedCtc}
                      onChange={e => set({ expectedCtc: onlyDecimal(e.target.value) })}
                      placeholder="e.g. 15"
                      required
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Experience (yrs) *">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.totalExperienceYears}
                      onChange={e => set({ totalExperienceYears: Number(e.target.value) })}
                      placeholder="e.g. 3"
                      required
                    />
                  </Field>
                  <Field label="Notice period (days) *">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.noticePeriodDays}
                      onChange={e => set({ noticePeriodDays: Number(e.target.value) })}
                      placeholder="e.g. 30"
                      required
                    />
                  </Field>
                </div>
                <Field label="Resume *">
                  {resumeFile ? (
                    <div className="flex items-center gap-2.5 border border-[#DAD4C8] rounded-lg px-3 py-2.5 bg-accent-50/50">
                      <span className="w-8 h-8 rounded-md bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {resumeFile.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {formatSize(resumeFile.size)}
                        </p>
                      </div>
                      <Tip label="Remove file">
                        <button
                          type="button"
                          onClick={() => pickResume(null)}
                          className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer shrink-0"
                          aria-label="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </Tip>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1 cursor-pointer border border-dashed border-[#CFC8BA] rounded-lg px-3 py-5 bg-[#ECE8E0] hover:border-accent-400 hover:bg-accent-50/40 transition text-center">
                      <UploadCloud size={20} className="text-accent-500" />
                      <span className="text-xs font-semibold text-gray-600">
                        Click to upload your resume
                      </span>
                      <span className="text-[10px] text-gray-500">
                        PDF only · up to {MAX_RESUME_MB} MB
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={e => pickResume(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </Field>
                <Field label="Google Drive resume link">
                  <input
                    type="url"
                    className={`${inputCls} ${driveInvalid ? 'border-red-400 focus-visible:ring-red-500' : ''}`}
                    value={form.resumeUrl}
                    onChange={e => set({ resumeUrl: e.target.value })}
                    placeholder="https://drive.google.com/your-resume"
                  />
                  {driveInvalid && (
                    <span className="text-[10px] text-red-600">
                      Enter a valid Google Drive link (drive.google.com/…).
                    </span>
                  )}
                </Field>
                <Field label="LinkedIn *">
                  <input
                    type="url"
                    className={`${inputCls} ${linkedinInvalid ? 'border-red-400 focus-visible:ring-red-500' : ''}`}
                    value={form.linkedInUrl}
                    onChange={e => set({ linkedInUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/your-profile"
                    required
                  />
                  {linkedinInvalid && (
                    <span className="text-[10px] text-red-600">
                      Enter a valid LinkedIn URL (linkedin.com/in/…).
                    </span>
                  )}
                </Field>
                <Field label="Cover note *">
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={form.coverNote}
                    onChange={e => set({ coverNote: e.target.value })}
                    placeholder="Why are you a great fit for this role?"
                    required
                  />
                </Field>
                  </>
                )}

                {step === 1 && (
                  <div className="space-y-4 rounded-lg border border-[#DAD4C8] bg-[#ECE8E0]/60 p-3">
                    <p className="text-[11px] font-semibold text-gray-700">A few quick questions</p>
                    {(
                      [
                        { key: 'Must Have', label: 'Must-have' },
                        { key: 'Good to Have', label: 'Good to have' },
                      ] as const
                    ).map(group => {
                      const items = (job.screeningQuestions ?? []).filter(
                        q => q.importance === group.key,
                      );
                      if (!items.length) return null;
                      return (
                        <div key={group.key} className="space-y-2.5">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                            {group.label}
                          </p>
                          {items.map(q => {
                            const qType = q.type ?? 'yesno';
                            return (
                              <div key={q.id} className="space-y-1.5">
                                <p className="text-xs text-gray-700">{q.text}</p>
                                {qType === 'text' ? (
                                  <input
                                    className={inputCls}
                                    value={responses[q.id] ?? ''}
                                    onChange={e => setResponses(r => ({ ...r, [q.id]: e.target.value }))}
                                    placeholder="Your answer…"
                                  />
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {(qType === 'choice'
                                      ? (q.options ?? []).filter(Boolean)
                                      : ['Yes', 'No']
                                    ).map(opt => {
                                      const active = responses[q.id] === opt;
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => setResponses(r => ({ ...r, [q.id]: opt }))}
                                          className={`min-w-[6rem] flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                            active
                                              ? 'border-accent-500 bg-accent-50 text-accent-700'
                                              : 'border-[#DAD4C8] bg-[#F7F4EE] text-gray-600 hover:border-accent-300'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}

                {step === 0 && hasQuestions ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full bg-accent-600 hover:bg-accent-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    Next: a few questions
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {step === 1 && (
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="rounded-lg border border-[#DAD4C8] bg-[#F7F4EE] px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-[#E6E1D8] cursor-pointer transition"
                      >
                        Previous
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex-1 bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      {busy ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Submitting…
                        </>
                      ) : (
                        'Submit application'
                      )}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex justify-center">
        <a
          href={BRAND.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-600 transition hover:opacity-80"
          title="Optiminastic"
        >
          <Logo size={20} />
          {BRAND.name}
        </a>
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
    <div className="min-h-screen bg-[#ECE8E0] flex flex-col items-center justify-center gap-3 px-5">
      {children}
    </div>
  );
}
