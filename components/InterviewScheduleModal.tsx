'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, CalendarClock, Mail, Phone, Briefcase, User, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select } from './Select';
import { DatePicker, TimeSelect } from '@/components/ui/date-picker';
import { BRAND } from '@/lib/brand';
import { OFFICE_LOCATION_URL, OFFICE_ADDRESS } from '@/lib/config';
import { Candidate } from '@/types';
import { useEmployees } from '@/features/employees/hooks';
import { useJobs } from '@/features/jobs/hooks';
import { emailTemplateById } from '@/lib/email-templates-catalog';
import {
  useEmailTemplateOverrides,
  resolveTemplate,
  renderTemplate,
} from '@/features/email-templates/hooks';

/** An existing interview window used for conflict detection. */
export interface BusyInterview {
  start: number;
  end: number;
  candidateId: string;
  candidateName: string;
}

export interface InterviewScheduleResult {
  dateTimeIso: string;
  durationMin: number;
  type: 'Online' | 'Offline';
  location: string; // office address (Offline) or meeting link (Online)
  interviewerName: string;
  interviewerEmail?: string;
  notes?: string;
  emailSubject: string;
  emailBody: string;
}

interface InterviewScheduleModalProps {
  candidate: Candidate;
  busyInterviews: BusyInterview[];
  onClose: () => void;
  onConfirm: (result: InterviewScheduleResult) => void;
  /** True while the invitation email is being sent — keeps the modal open and
   *  locked so HR can't double-submit or close it mid-send. */
  isSending?: boolean;
  /** 'reschedule' prefills the existing slot and switches the copy to a
   *  reschedule notice instead of a fresh invitation. */
  mode?: 'schedule' | 'reschedule';
  /** Prefilled values (used when rescheduling an existing interview). */
  initial?: {
    date?: string;
    time?: string;
    type?: 'Online' | 'Offline';
    interviewerName?: string;
    interviewerEmail?: string;
    notes?: string;
  };
}

const DURATION_MIN = 45;

const pad = (n: number) => String(n).padStart(2, '0');
const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fmtTime(t: string): string {
  if (!t) return '[Time]';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${pad(m)} ${ap}`;
}

function fmtDate(date: string): string {
  if (!date) return '[Date]';
  const d = new Date(`${date}T00:00`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function InterviewScheduleModal({
  candidate,
  busyInterviews,
  onClose,
  onConfirm,
  isSending = false,
  mode = 'schedule',
  initial,
}: InterviewScheduleModalProps) {
  const position = candidate.appliedRole || candidate.department || 'the role';
  const isReschedule = mode === 'reschedule';

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return localDateStr(d);
  }, []);
  const todayStr = useMemo(() => localDateStr(new Date()), []);

  const [date, setDate] = useState(initial?.date || tomorrow);
  const [time, setTime] = useState(initial?.time || '10:00');
  // Interviews are scheduled as in-person by default. Whether the round is
  // actually run online (with a Google Meet link) is decided later, on the
  // Physical Interview email — so no mode picker here.
  const type = 'Offline' as const;
  const [interviewerName, setInterviewerName] = useState(initial?.interviewerName || '');
  const [interviewerEmail, setInterviewerEmail] = useState(initial?.interviewerEmail || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  // Interviewers are picked from active employees — selecting one fills the email.
  const { data: employees = [] } = useEmployees();
  const interviewerPool = useMemo(() => employees.filter(e => e.status !== 'Offboarded'), [employees]);
  const pickInterviewer = (name: string) => {
    setInterviewerName(name);
    const match = interviewerPool.find(e => e.fullName === name);
    if (match?.email) setInterviewerEmail(match.email);
  };

  // The draft comes from Settings → Email templates, so what HR sees here is
  // exactly the saved template. Scheduling and rescheduling are separate
  // templates because their wording differs.
  const { data: overrides } = useEmailTemplateOverrides();
  const templateDef = emailTemplateById(
    isReschedule ? 'interview_reschedule_candidate' : 'interview_schedule_candidate',
  );

  // The candidate's job posting → its description, so the invite can carry the
  // JD (a reminder of the role + what's expected). Matched by jobId, else title.
  const { data: jobs = [] } = useJobs();
  const jd = useMemo(() => {
    const job =
      jobs.find(j => j.id === candidate.jobId) ??
      jobs.find(j => j.title.trim().toLowerCase() === (candidate.appliedRole || '').trim().toLowerCase());
    if (!job) return '';
    const parts = [
      job.description?.trim(),
      job.keyResponsibilities?.trim() && `Key responsibilities:\n${job.keyResponsibilities.trim()}`,
      job.requirements?.trim() && `What we’re looking for:\n${job.requirements.trim()}`,
    ].filter(Boolean);
    return parts.length ? `About the ${position} role:\n\n${parts.join('\n\n')}` : '';
  }, [jobs, candidate.jobId, candidate.appliedRole, position]);

  const templateVars = useMemo(
    () => ({
      candidate_name: candidate.fullName,
      role: position,
      date: fmtDate(date),
      time: fmtTime(time),
      location: OFFICE_ADDRESS,
      map_url: OFFICE_LOCATION_URL,
      interviewer_name: interviewerName.trim() || 'The Hiring Team',
      jd,
    }),
    [candidate.fullName, position, date, time, interviewerName, jd],
  );

  const composedSubject = useMemo(() => {
    if (!templateDef) return '';
    return renderTemplate(resolveTemplate(templateDef, overrides).subject, templateVars);
  }, [templateDef, overrides, templateVars]);

  const composedBody = useMemo(() => {
    if (!templateDef) return '';
    return renderTemplate(resolveTemplate(templateDef, overrides).body, templateVars);
  }, [templateDef, overrides, templateVars]);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emailEdited, setEmailEdited] = useState(false);

  // Keep the email in sync with the form + template until HR manually edits it.
  useEffect(() => {
    if (!emailEdited) {
      setSubject(composedSubject);
      setBody(composedBody);
    }
  }, [composedSubject, composedBody, emailEdited]);

  // --- validation + conflict detection -------------------------------------
  const startMs = useMemo(() => {
    const ms = new Date(`${date}T${time || '00:00'}`).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [date, time]);

  const conflict = useMemo(() => {
    if (startMs == null) return null;
    const endMs = startMs + DURATION_MIN * 60_000;
    // Ignore the candidate's own existing slot (matters when rescheduling).
    return (
      busyInterviews.find(b => b.candidateId !== candidate.id && startMs < b.end && endMs > b.start) ?? null
    );
  }, [startMs, busyInterviews, candidate.id]);

  const error = useMemo(() => {
    if (!date || !time) return 'Pick an interview date and time.';
    if (startMs == null) return 'Invalid date/time.';
    if (startMs < Date.now()) return 'Interview date & time cannot be in the past.';
    if (!candidate.email?.trim()) return 'Candidate has no email on file — cannot send the invitation.';
    if (conflict)
      return `That slot overlaps an interview already booked for ${conflict.candidateName}. Pick another time.`;
    return null;
  }, [date, time, startMs, candidate.email, conflict]);

  const submit = () => {
    if (error || startMs == null || isSending) return;
    onConfirm({
      dateTimeIso: `${date}T${time}:00`,
      durationMin: DURATION_MIN,
      type,
      location: OFFICE_LOCATION_URL,
      interviewerName: interviewerName.trim(),
      interviewerEmail: interviewerEmail.trim() || undefined,
      notes: notes.trim() || undefined,
      emailSubject: subject.trim() || `Interview Invitation - ${position} - ${BRAND.company}`,
      emailBody: body,
    });
  };

  const readOnlyCls =
    'mt-1 flex items-center gap-1.5 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm text-gray-700';

  return (
    <Sheet open onOpenChange={open => !open && !isSending && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-gray-900">
            <CalendarClock size={15} className="text-accent-600" />{' '}
            {isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
          </SheetTitle>
          <SheetDescription>
            {candidate.fullName} · {position}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6 text-xs">
          {/* Candidate information (auto-filled) */}
          <section className="space-y-3">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
              Candidate information
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] font-medium text-gray-600">Candidate Name</Label>
                <div className={readOnlyCls}>
                  <User size={13} className="text-gray-400" /> {candidate.fullName}
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-gray-600">Applied Position</Label>
                <div className={readOnlyCls}>
                  <Briefcase size={13} className="text-gray-400" /> {position}
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-gray-600">Candidate Email</Label>
                <div className={readOnlyCls}>
                  <Mail size={13} className="text-gray-400" /> {candidate.email || '— none on file —'}
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-gray-600">Candidate Phone</Label>
                <div className={readOnlyCls}>
                  <Phone size={13} className="text-gray-400" /> {candidate.phone || '—'}
                </div>
              </div>
            </div>
          </section>

          {/* Interview details (HR input) */}
          <section className="space-y-3">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
              Interview details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="iv-date" className="text-[11px] font-medium text-gray-600">
                  Interview Date <span className="text-accent-600">*</span>
                </Label>
                <DatePicker
                  id="iv-date"
                  min={todayStr}
                  value={date}
                  onChange={setDate}
                  placeholder="Select date"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="iv-time" className="text-[11px] font-medium text-gray-600">
                  Interview Time <span className="text-accent-600">*</span>
                </Label>
                <TimeSelect id="iv-time" value={time} onChange={setTime} step={15} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="iv-interviewer" className="text-[11px] font-medium text-gray-600">
                  Interviewer
                </Label>
                <Select
                  id="iv-interviewer"
                  value={interviewerName}
                  onChange={e => pickInterviewer(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm"
                >
                  <option value="">Select an employee…</option>
                  {interviewerPool.map(e => (
                    <option key={e.id} value={e.fullName}>
                      {e.fullName} — {e.role}
                    </option>
                  ))}
                </Select>
                {interviewerName && interviewerEmail && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                    <Mail size={10} /> {interviewerEmail}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="iv-notes" className="text-[11px] font-medium text-gray-600">
                  Additional Notes <span className="text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  id="iv-notes"
                  placeholder="Anything the candidate should know — what to bring, the panel, etc."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          {/* Email preview (editable) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                Invitation email <span className="text-gray-400">· editable</span>
              </h3>
              {emailEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setEmailEdited(false);
                    setBody(composedBody);
                  }}
                  className="text-[10px] font-semibold text-accent-600 hover:underline"
                >
                  Reset to template
                </button>
              )}
            </div>
            <div>
              <Label htmlFor="iv-subject" className="text-[11px] font-medium text-gray-600">
                Subject
              </Label>
              <Input
                id="iv-subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="iv-body" className="text-[11px] font-medium text-gray-600">
                Message
              </Label>
              <Textarea
                id="iv-body"
                value={body}
                onChange={e => {
                  setEmailEdited(true);
                  setBody(e.target.value);
                }}
                rows={12}
                className="mt-1 font-mono text-[12px] leading-relaxed"
              />
            </div>
          </section>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
              {error}
            </p>
          )}
        </SheetBody>

        <SheetFooter className="justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!!error || isSending}>
            {isSending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sending{isReschedule ? '…' : ' invitation…'}
              </>
            ) : (
              <>
                <CalendarPlus size={14} /> {isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default InterviewScheduleModal;
