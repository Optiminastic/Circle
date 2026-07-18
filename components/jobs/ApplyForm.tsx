'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Select } from '@/components/Select';
import { Job } from '@/types';
import {
  submitApplicationAction,
  requestOtpAction,
  verifyOtpAction,
  checkAppliedAction,
} from '@/lib/actions/public';
import { useToast } from '@/components/Toaster';
import { Tip } from '@/components/ui/tooltip';
import { CheckCircle2, Loader2, UploadCloud, FileText, X } from 'lucide-react';

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  gender: '',
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
  'w-full px-3 py-2.5 border border-[#E4E6EA] rounded-lg text-sm bg-[#FFFFFF] placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 focus:border-accent-500 transition';

const MAX_RESUME_MB = 5;

// Per-field input sanitisers — keep each field to its own data type.
const onlyLetters = (v: string) => v.replace(/[^A-Za-z\s.'-]/g, ''); // names, titles
const onlyCompany = (v: string) => v.replace(/[^A-Za-z0-9\s.,&'-]/g, ''); // company names
const onlyDigits = (v: string) => v.replace(/\D/g, ''); // phone
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// LinkedIn profile/company URL (linkedin.com or its country/sub domains).
const LINKEDIN_RE = /^https?:\/\/([a-z0-9-]+\.)*linkedin\.com\/.+/i;
// Google Drive / Docs share link.
const DRIVE_RE = /^https?:\/\/(drive|docs)\.google\.com\/.+/i;

const formatSize = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Pull a number out of a salary string like "12 LPA" / "₹12" / "12".
const parseLpa = (value: string): number | null => {
  const m = String(value ?? '').match(/[\d.]+/);
  const n = m ? parseFloat(m[0]) : NaN;
  return Number.isFinite(n) ? n : null;
};
const fmtLpa = (n: number): string => (Number.isInteger(n) ? `${n}` : n.toFixed(1));
// Build LPA options from `lo` to `hi` in 0.5 steps (capped).
const lpaRange = (lo: number, hi: number): string[] => {
  const out: string[] = [];
  for (let v = lo; v <= hi + 1e-9 && out.length < 200; v = Math.round((v + 0.5) * 10) / 10) {
    out.push(fmtLpa(v));
  }
  return out;
};
// Current CTC is the candidate's existing salary (not tied to the role): a
// general 1–10 LPA dropdown.
const currentCtcOptions = (): string[] => lpaRange(1, 10);
// Expected CTC must sit inside the role's offered salary band (min–max). Falls
// back to a sensible range when the role has no usable salary, so it's always a
// dropdown (never a free-text input).
const expectedCtcOptions = (min: string, max: string): string[] => {
  let lo = parseLpa(min);
  let hi = parseLpa(max);
  if (lo == null || hi == null || hi < lo) {
    lo = 1;
    hi = 50;
  }
  return lpaRange(lo, hi);
};

/**
 * The public job application form. The job is fetched on the server and passed
 * in; this component owns only the interactive apply flow (validation, resume
 * upload, screening questions, submission).
 */
export function ApplyForm({ job }: { job: Job }) {
  const toast = useToast();

  // Screening questions come from the job's own server-persisted snapshot. HR's
  // Question Library set is mirrored onto the job when it's created/edited, so
  // this stays correct across devices without the public page ever fetching the
  // library from the browser.
  const screeningQuestions = job.screeningQuestions ?? [];

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  // Choice questions with allowOther: tracks which have the "Other" free-text
  // box active (so it stays open even before the applicant types anything).
  const [otherActive, setOtherActive] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0); // 0 = your details, 1 = screening questions
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Browser-level guard: once someone applies to this role from this browser, we
  // remember it in localStorage. On revisit we show the same "submitted"
  // confirmation instead of letting them apply again. (The backend still enforces
  // one-application-per-email as the real source of truth — this is just UX.)
  const appliedKey = `curcle.applied.${job.id}`;
  useEffect(() => {
    try {
      if (localStorage.getItem(appliedKey)) setSubmitted(true);
    } catch {
      /* localStorage blocked (private mode) — server checks still apply */
    }
  }, [appliedKey]);

  // Email OTP verification — the applicant must prove they own the email.
  const [emailVerified, setEmailVerified] = useState(false);
  // Shown under the email field, e.g. "You have already applied…".
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Current CTC = general 1–10 LPA; Expected CTC = the role's salary band.
  const currentCtcChoices = currentCtcOptions();
  const expectedCtcChoices = expectedCtcOptions(job.salaryMin, job.salaryMax);

  const set = (patch: Partial<typeof EMPTY>) => setForm(prev => ({ ...prev, ...patch }));

  // Changing the email invalidates any prior verification + clears its error.
  const onEmailChange = (value: string) => {
    set({ email: value });
    setEmailVerified(false);
    setEmailError(null);
  };

  // Request (or re-request) the code for the entered email.
  const sendOtp = async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await requestOtpAction(form.email.trim());
      if (!res.ok) {
        setOtpError(res.error ?? 'Could not send the code.');
        return;
      }
      setDevCode(res.devCode ?? null);
      toast.success(`OTP sent to ${form.email.trim()}.`);
    } catch {
      setOtpError('Could not send the code.');
    } finally {
      setOtpSending(false);
    }
  };

  // Clicking "Verify": block re-applications first (message shown under the
  // email field), otherwise open the OTP modal and send the code right away.
  const openOtp = async () => {
    if (!EMAIL_RE.test(form.email.trim())) {
      toast.error('Please enter a valid email first.');
      return;
    }
    setEmailError(null);
    setCheckingEmail(true);
    try {
      const { applied } = await checkAppliedAction(job.id, form.email.trim());
      if (applied) {
        setEmailError('You have already applied to this role with this email.');
        return;
      }
    } finally {
      setCheckingEmail(false);
    }
    setOtpDigits(['', '', '', '']);
    setOtpError(null);
    setDevCode(null);
    setOtpOpen(true);
    await sendOtp();
  };

  const setOtpDigit = (i: number, value: string) => {
    const d = value.replace(/\D/g, '').slice(-1);
    setOtpDigits(prev => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 3) otpRefs.current[i + 1]?.focus();
  };

  const onOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  // Paste the whole code at once (e.g. copied from the email) into any box —
  // the digits spread across all four inputs. Works regardless of which box the
  // paste lands in.
  const onOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!digits) return;
    e.preventDefault();
    const next = ['', '', '', ''];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setOtpDigits(next);
    otpRefs.current[Math.min(digits.length, 3)]?.focus();
  };

  const verifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 4) {
      setOtpError('Enter the 4-digit code.');
      return;
    }
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res = await verifyOtpAction(form.email.trim(), code);
      if (!res.ok) {
        setOtpError(res.error ?? 'Verification failed.');
        return;
      }
      setEmailVerified(true);
      setOtpOpen(false);
      toast.success('Email verified.');
    } catch {
      setOtpError('Verification failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const pickResume = (file: File | null) => {
    if (!file) {
      setResumeFile(null);
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
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
    if (!emailVerified) return 'Please verify your email before applying.';
    if (!form.phone.trim()) return 'Please enter your phone number.';
    if (form.phone.trim().length !== 10) return 'Please enter a valid 10-digit phone number.';
    if (!form.gender) return 'Please select your gender.';
    if (!form.currentDesignation.trim()) return 'Please enter your current title.';
    if (!String(form.currentCtc).trim()) return 'Please enter your current CTC.';
    if (!String(form.expectedCtc).trim()) return 'Please enter your expected CTC.';
    if (String(form.totalExperienceYears).trim() === '') return 'Please enter your total experience.';
    if (String(form.noticePeriodDays).trim() === '') return 'Please enter your notice period.';
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
    const detailsError = validateDetails();
    if (detailsError) {
      toast.error(detailsError);
      setStep(0);
      return;
    }
    const questions = screeningQuestions;
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

    setError(null);

    // One hardened, atomic request: the resume + application go to the public
    // endpoint, which validates everything and sets the trust-sensitive fields
    // server-side (id, status, source, role/department, fit rating).
    setSubmitting(true);
    try {
      const res = await submitApplicationAction(
        {
          jobId: job.id,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone,
          currentDesignation: form.currentDesignation,
          currentCtc: String(form.currentCtc),
          expectedCtc: String(form.expectedCtc),
          totalExperienceYears: Number(form.totalExperienceYears) || 0,
          noticePeriodDays: Number(form.noticePeriodDays) || 0,
          linkedInUrl: form.linkedInUrl,
          coverNote: form.coverNote,
          location: form.location,
          gender: form.gender,
          currentCompany: form.currentCompany,
          resumeUrl: form.resumeUrl,
          responses,
        },
        resumeFile,
      );
      if (res.ok) {
        // Remember the application in this browser so a re-visit can't re-apply.
        try {
          localStorage.setItem(appliedKey, new Date().toISOString());
        } catch {
          /* ignore storage errors */
        }
        setSubmitted(true);
      } else {
        setError(res.error ?? 'Could not submit your application. Please try again.');
      }
    } catch {
      setError('Could not submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting;
  const hasQuestions = screeningQuestions.length > 0;

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

  const driveInvalid = form.resumeUrl.trim() !== '' && !DRIVE_RE.test(form.resumeUrl.trim());
  const linkedinInvalid = form.linkedInUrl.trim() !== '' && !LINKEDIN_RE.test(form.linkedInUrl.trim());
  const closed = job.status === 'Closed' || job.status === 'On Hold';

  if (submitted) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-12 text-center">
        <CheckCircle2 className="text-emerald-500" size={34} />
        <p className="text-lg font-bold text-gray-900">Application submitted!</p>
        <p className="max-w-sm text-sm text-gray-500">
          Thanks for applying to <span className="font-semibold">{job.title}</span>. Our HR team has received
          your details and will be in touch.
        </p>
      </div>
    );
  }

  return (
    <section id="apply" className="mt-8 scroll-mt-16 border-t border-[#EDEEF1] pt-8">
      <h2 className="text-lg font-bold tracking-tight text-gray-900">Apply for this role</h2>
      <p className="mb-5 mt-1 text-[13px] text-gray-500">
        Your application goes straight to the hiring team.
      </p>

      {closed ? (
        <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg p-3">
          Applications for this posting are currently closed.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div
                    className={`flex items-stretch rounded-lg border bg-white transition focus-within:ring-2 ${
                      emailError
                        ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/30'
                        : 'border-[#E4E6EA] focus-within:border-accent-500 focus-within:ring-accent-500/30'
                    }`}
                  >
                    <input
                      type="email"
                      className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                      value={form.email}
                      onChange={e => onEmailChange(e.target.value)}
                      placeholder="example@email.com"
                      required
                    />
                    {emailVerified ? (
                      <span className="my-1.5 mr-1.5 inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={openOtp}
                        disabled={checkingEmail}
                        className="my-1.5 mr-1.5 inline-flex shrink-0 items-center gap-1 rounded-md bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                      >
                        {checkingEmail ? <Loader2 size={12} className="animate-spin" /> : null}
                        Verify
                      </button>
                    )}
                  </div>
                  {emailError && <span className="text-[11px] text-red-600">{emailError}</span>}
                </Field>
                <Field label="Phone *">
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[#E4E6EA] bg-[#EDEEF1] text-sm text-gray-600">
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
                <Field label="Gender *">
                  <Select
                    className={inputCls}
                    value={form.gender}
                    onChange={e => set({ gender: e.target.value })}
                    placeholder="Select gender"
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </Field>
                <Field label="Current location">
                  <input
                    className={inputCls}
                    value={form.location}
                    onChange={e => set({ location: e.target.value })}
                    placeholder="City you're based in"
                  />
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
                  <Select
                    className={inputCls}
                    value={form.currentCtc}
                    onChange={e => set({ currentCtc: e.target.value })}
                    placeholder="Select CTC"
                  >
                    <option value="" disabled>
                      Select CTC
                    </option>
                    {currentCtcChoices.map(n => (
                      <option key={n} value={n}>
                        {n} LPA
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Expected CTC (LPA) *">
                  <Select
                    className={inputCls}
                    value={form.expectedCtc}
                    onChange={e => set({ expectedCtc: e.target.value })}
                    placeholder="Select CTC"
                  >
                    <option value="" disabled>
                      Select CTC
                    </option>
                    {expectedCtcChoices.map(n => (
                      <option key={n} value={n}>
                        {n} LPA
                      </option>
                    ))}
                  </Select>
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
                  <div className="flex items-center gap-2.5 border border-[#E4E6EA] rounded-lg px-3 py-2.5 bg-accent-50/50">
                    <span className="w-8 h-8 rounded-md bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                      <FileText size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{resumeFile.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{formatSize(resumeFile.size)}</p>
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
                  <label className="flex flex-col items-center justify-center gap-1 cursor-pointer border border-dashed border-[#D7DAE0] rounded-lg px-3 py-5 bg-[#F1F3F5] hover:border-accent-400 hover:bg-accent-50/40 transition text-center">
                    <UploadCloud size={20} className="text-accent-500" />
                    <span className="text-xs font-semibold text-gray-600">Click to upload your resume</span>
                    <span className="text-[10px] text-gray-500">PDF only · up to {MAX_RESUME_MB} MB</span>
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
            <div className="space-y-4 rounded-lg border border-[#E4E6EA] bg-[#F1F3F5]/60 p-3">
              <p className="text-[11px] font-semibold text-gray-700">A few quick questions</p>
              {(
                [
                  { key: 'Must Have', label: 'Must-have' },
                  { key: 'Good to Have', label: 'Good to have' },
                ] as const
              ).map(group => {
                const items = screeningQuestions.filter(q => q.importance === group.key);
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
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {(qType === 'choice' ? (q.options ?? []).filter(Boolean) : ['Yes', 'No']).map(
                                  opt => {
                                    const active = !otherActive[q.id] && responses[q.id] === opt;
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => {
                                          setOtherActive(o => ({ ...o, [q.id]: false }));
                                          setResponses(r => ({ ...r, [q.id]: opt }));
                                        }}
                                        className={`min-w-[6rem] flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                          active
                                            ? 'border-accent-500 bg-accent-50 text-accent-700'
                                            : 'border-[#E4E6EA] bg-[#FFFFFF] text-gray-600 hover:border-accent-300'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  },
                                )}
                                {qType === 'choice' && q.allowOther && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOtherActive(o => ({ ...o, [q.id]: true }));
                                      setResponses(r => ({ ...r, [q.id]: '' }));
                                    }}
                                    className={`min-w-[6rem] flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                      otherActive[q.id]
                                        ? 'border-accent-500 bg-accent-50 text-accent-700'
                                        : 'border-[#E4E6EA] bg-[#FFFFFF] text-gray-600 hover:border-accent-300'
                                    }`}
                                  >
                                    Other
                                  </button>
                                )}
                              </div>
                              {qType === 'choice' && q.allowOther && otherActive[q.id] && (
                                <input
                                  className={inputCls}
                                  value={responses[q.id] ?? ''}
                                  onChange={e => setResponses(r => ({ ...r, [q.id]: e.target.value }))}
                                  placeholder="Please specify…"
                                  autoFocus
                                />
                              )}
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

          {step === 0 && !emailVerified && (
            <p className="text-[11px] font-medium text-red-600">Verify your email to continue.</p>
          )}

          {step === 0 && hasQuestions ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!emailVerified}
              title={!emailVerified ? 'Verify your email to continue' : undefined}
              className="w-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
            >
              Next: a few questions
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-[#EDEEF1] cursor-pointer transition"
                >
                  Previous
                </button>
              )}
              <button
                type="submit"
                disabled={busy || !emailVerified}
                title={!emailVerified ? 'Verify your email to continue' : undefined}
                className="flex-1 bg-accent-600 hover:bg-accent-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
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

      {/* Email OTP verification modal */}
      {otpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOtpOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Verify your email</h3>
              <button
                type="button"
                onClick={() => setOtpOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-500">
              {otpSending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Sending an OTP to{' '}
                  <span className="font-semibold text-gray-700">{form.email}</span>…
                </span>
              ) : (
                <>
                  We&apos;ve sent an OTP to <span className="font-semibold text-gray-700">{form.email}</span>.
                  Enter the 4-digit code below to verify.
                </>
              )}
            </p>

            <div className="flex justify-center gap-3">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => {
                    otpRefs.current[i] = el;
                  }}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : undefined}
                  maxLength={1}
                  value={d}
                  onChange={e => setOtpDigit(i, e.target.value)}
                  onKeyDown={e => onOtpKey(i, e)}
                  onPaste={onOtpPaste}
                  className="h-14 w-12 rounded-lg border border-[#E4E6EA] text-center text-2xl font-bold text-gray-900 focus:border-accent-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30"
                />
              ))}
            </div>

            {devCode && (
              <p className="mt-3 text-center text-[11px] text-amber-600">
                Dev code (email not configured): <span className="font-mono font-bold">{devCode}</span>
              </p>
            )}
            {otpError && <p className="mt-3 text-center text-xs text-red-600">{otpError}</p>}

            <button
              type="button"
              onClick={verifyOtp}
              disabled={otpVerifying || otpDigits.join('').length !== 4}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-700 disabled:opacity-60 cursor-pointer"
            >
              {otpVerifying ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Verifying…
                </>
              ) : (
                'Verify email'
              )}
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={otpSending}
              className="mt-2 w-full text-center text-[12px] font-semibold text-accent-600 hover:underline disabled:opacity-60 cursor-pointer"
            >
              {otpSending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
