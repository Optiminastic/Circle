'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Send, Link2, FileUp, Library } from 'lucide-react';
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
import { FileDropzone, PickedFile, pickedName } from '@/components/ui/file-dropzone';
import { BRAND } from '@/lib/brand';
import { Candidate, AssessmentQuestion } from '@/types';
import { useAssessmentBanks, useAssignmentBanks } from '@/features/question-banks/hooks';
import { useHrIdentity } from '@/features/employees/hooks';
import { emailTemplateById } from '@/lib/email-templates-catalog';
import {
  useEmailTemplateOverrides,
  resolveTemplate,
  renderTemplate,
} from '@/features/email-templates/hooks';
import { TAKE_HOME_DURATION_MIN } from '@/data/test-banks';
import { blobToBase64 } from '@/lib/offer-letter-pdf';
import { uploadDocument, documentPreviewUrl } from '@/lib/api/documents';
import { useToast } from './Toaster';

export interface SendTestResult {
  to: string;
  subject: string;
  body: string;
  /** The test link, rendered in the email as a labelled anchor button (never a
   *  raw URL in the body). */
  links: { label: string; url: string }[];
  /** Selected assessment questions (assessment only). */
  questions?: AssessmentQuestion[];
  /** Set when HR chose "Assignment" instead of "MCQ Questions" for a non-IQ
   *  send. The caller creates the TestInvite with kind: 'take-home' instead
   *  of the `kind` prop, and persists these onto it. No generic `instructions`
   *  text — the assignment file itself carries the brief, so the public page
   *  doesn't duplicate it. */
  takeHome?: {
    deadlineIso: string;
    briefDocId: string;
    briefFileName: string;
    /** How long the candidate gets, chosen by HR when sending. */
    durationMin: number;
    /** A Drive folder the candidate uploads large work into. Empty when the
     *  task produces something small enough to upload here directly. */
    driveUploadUrl?: string;
  };
  /** Email attachment (the assignment brief), take-home sends only. */
  attachment?: { name: string; base64: string; type: string };
}

interface SendTestModalProps {
  candidate: Candidate;
  kind: 'iq' | 'assignment';
  /** The candidate-facing link to the IQ / Assessment module (already generated). */
  testUrl: string;
  /** The TestInvite id the caller already minted — needed to scope the
   *  take-home brief-file upload before the invite record itself exists. */
  inviteId: string;
  onClose: () => void;
  onConfirm: (result: SendTestResult) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// How long the candidate gets. HR chooses per send, because the right window
// is a property of the task: a short exercise is not a brand campaign. The
// first option is the default, matching what every send used before this.
const TAKE_HOME_WINDOWS = [
  { min: TAKE_HOME_DURATION_MIN, label: '1 hour' },
  { min: 30, label: '30 minutes' },
  { min: 90, label: '1 hour 30 minutes' },
  { min: 120, label: '2 hours' },
  { min: 240, label: '4 hours' },
  { min: 60 * 24, label: '1 day' },
  { min: 60 * 24 * 2, label: '2 days' },
  { min: 60 * 24 * 3, label: '3 days' },
  { min: 60 * 24 * 7, label: '1 week' },
] as const;

/** The window as it reads in a sentence: "You will have 2 days to ...". */
function windowLabel(min: number): string {
  return TAKE_HOME_WINDOWS.find(w => w.min === min)?.label ?? `${min} minutes`;
}

export function SendTestModal({ candidate, kind, testUrl, inviteId, onClose, onConfirm }: SendTestModalProps) {
  const toast = useToast();
  const isIq = kind === 'iq';
  const position = candidate.appliedRole || candidate.department || 'the role';
  const hr = useHrIdentity();

  // MCQ Questions vs Assignment — only offered for the non-IQ send (IQ stays
  // its own single-purpose flow, unchanged). No default: HR must explicitly
  // pick one before anything else — link, candidate email, subject/message —
  // is generated or shown, since only the chosen type is ever actually sent.
  const [mode, setMode] = useState<'mcq' | 'take-home' | null>(isIq ? 'mcq' : null);
  // Where the candidate puts work too large to upload here - a video answer
  // runs to several hundred MB. Optional: a document-sized task needs none.
  const [windowMin, setWindowMin] = useState<number>(TAKE_HOME_DURATION_MIN);
  const [driveUploadUrl, setDriveUploadUrl] = useState('');
  // Tracks whether HR has typed here, so re-picking a library file refreshes
  // the suggestion but never discards something they wrote themselves.
  const [driveUrlEdited, setDriveUrlEdited] = useState(false);
  const isTakeHome = !isIq && mode === 'take-home';
  const what = isIq ? 'IQ Test' : isTakeHome ? 'Assignment' : 'Assessment';

  // Candidate's email is pre-filled but HR can change it before sending.
  const [to, setTo] = useState(candidate.email || '');
  const [subject, setSubject] = useState('');

  // Assessment question sets from the Question Library (DB) — auto-select by role.
  const { data: assessmentBanks = [] } = useAssessmentBanks();
  const [bankId, setBankId] = useState('');
  useEffect(() => {
    if (isIq) return;
    const match = assessmentBanks.find(
      b => b.jobTitle.trim().toLowerCase() === position.trim().toLowerCase(),
    );
    if (match) setBankId(match.id);
  }, [isIq, position, assessmentBanks]);

  const selectedBank = assessmentBanks.find(b => b.id === bankId);
  const selectedQuestions: AssessmentQuestion[] = selectedBank
    ? selectedBank.questions
        .filter(q => q.q.trim())
        .map(q => ({ text: q.q.trim(), options: [...q.options], answer: q.answer }))
    : [];

  // Take-home: either a fresh upload or a file picked from the "Assignment
  // File Upload" library (Question Library), auto-matched by role like the
  // MCQ bank picker above.
  const { data: assignmentBanks = [] } = useAssignmentBanks();
  const [fileSource, setFileSource] = useState<'upload' | 'library'>('upload');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [libraryBankId, setLibraryBankId] = useState('');
  // The folder saved with the chosen library assignment. It fills the field
  // below so HR does not retype it, and stays editable for a one-off change.
  const pickedBankDriveUrl = assignmentBanks.find(b => b.id === libraryBankId)?.driveUploadUrl;

  // Fill from the chosen library assignment, unless HR has typed their own.
  useEffect(() => {
    if (driveUrlEdited) return;
    setDriveUploadUrl(pickedBankDriveUrl ?? '');
  }, [pickedBankDriveUrl, driveUrlEdited]);
  const matchingAssignmentBanks = assignmentBanks.filter(
    b => b.jobTitle.trim().toLowerCase() === position.trim().toLowerCase(),
  );
  const libraryOptions = matchingAssignmentBanks.length > 0 ? matchingAssignmentBanks : assignmentBanks;
  useEffect(() => {
    if (!isTakeHome) return;
    if (matchingAssignmentBanks.length > 0 && !libraryBankId) {
      setFileSource('library');
      setLibraryBankId(matchingAssignmentBanks[0].id);
    }
    // Re-run only when entering take-home mode or the match set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTakeHome, matchingAssignmentBanks.length]);
  const [sending, setSending] = useState(false);

  // The link itself is sent as a labelled button (see `linkLabel` below), so the
  // body only references it — no raw URL is ever pasted into the message.
  const linkLabel = isIq ? 'Start IQ Test' : isTakeHome ? 'Submit Assignment' : 'Start Assessment';

  // Copy comes from Settings → Email templates, so HR's saved edits show here
  // and are what gets sent. The template embeds the link itself via
  // [[Start IQ Test|{{test_url}}]], so no separate link button is attached.
  // Take-home has its own fixed copy (not Settings-editable — see HR's exact
  // wording below), same edit-before-send textarea either way.
  const { data: overrides } = useEmailTemplateOverrides();
  const templateDef = emailTemplateById(isIq ? 'iq_invite' : 'assessment_invite');

  const takeHomeBody = useMemo(
    () =>
      [
        `Hi ${candidate.fullName},`,
        '',
        'As part of the next round of the selection process, please find the assignment attached.',
        `You will have ${windowLabel(windowMin)} to complete and submit the assessment. The submission link will expire once that time is up.`,
        '',
        'You may submit your assignment in any of the following formats:',
        '',
        'Word Document',
        'Excel',
        'PowerPoint',
        '',
        // Only when HR opened a folder. Without one the paragraph would point
        // the candidate at nowhere.
        ...(driveUploadUrl.trim()
          ? [
              'If your work is a video or is larger than 15 MB, upload it to this folder instead and paste the link on the submission page:',
              '',
              driveUploadUrl.trim(),
              '',
            ]
          : []),
        'Please go through the assignment carefully and feel free to be as creative and innovative as possible with your approach.',
        '',
        `[[${linkLabel}|${testUrl}]]`,
        '',
        'All the best!',
        '',
        'Regards,',
        'HR Team',
        'Optiminastic Media',
      ].join('\n'),
    [candidate.fullName, testUrl, linkLabel, driveUploadUrl, windowMin],
  );
  const takeHomeSubject = `Your ${position} assignment at Optiminastic — submit your work`;

  const composed = useMemo(() => {
    if (isTakeHome) return takeHomeBody;
    if (!templateDef) return '';
    const { body: tpl } = resolveTemplate(templateDef, overrides);
    return renderTemplate(tpl, {
      candidate_name: candidate.fullName,
      role: position,
      test_url: testUrl,
      hr_signoff: hr.signoff,
    });
  }, [isTakeHome, takeHomeBody, templateDef, overrides, candidate.fullName, position, testUrl, hr.signoff]);

  const composedSubject = useMemo(() => {
    if (isTakeHome) return takeHomeSubject;
    if (!templateDef) return '';
    const { subject: tpl } = resolveTemplate(templateDef, overrides);
    return renderTemplate(tpl, { candidate_name: candidate.fullName, role: position });
  }, [isTakeHome, takeHomeSubject, templateDef, overrides, candidate.fullName, position]);

  const [body, setBody] = useState(composed);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) {
      setSubject(composedSubject);
      setBody(composed);
    }
  }, [composed, composedSubject, edited]);
  // Switching modes always resets to that mode's template, even if the
  // previous mode's text was hand-edited — carrying an MCQ-edited draft over
  // to Assignment (or vice-versa) would be more confusing than helpful.
  useEffect(() => {
    setEdited(false);
  }, [mode]);

  const error = !to.trim()
    ? 'Candidate email is required.'
    : !EMAIL_RE.test(to.trim())
      ? 'Please enter a valid email address.'
      : !isIq && !isTakeHome && assessmentBanks.length === 0
        ? 'No assessment question sets — create one in Question Library → Assessment Questions.'
        : !isIq && !isTakeHome && selectedQuestions.length === 0
          ? 'Select an assessment question set to send.'
          : isTakeHome && fileSource === 'upload' && !pickedFile
            ? 'Upload the assignment file to send.'
            : isTakeHome && fileSource === 'library' && !libraryBankId
              ? 'Select an assignment file from the library.'
              : null;

  // Resolve the brief file (upload it fresh, or reuse the library doc) and
  // base64-encode it for the email attachment, then hand everything to the
  // caller to create the TestInvite + send the email.
  const confirmTakeHome = async () => {
    setSending(true);
    try {
      let briefDocId: string;
      let briefFileName: string;
      let attachmentBlob: Blob;
      if (fileSource === 'upload' && pickedFile) {
        if (pickedFile.kind !== 'local') {
          toast.error('Please upload a file directly (Drive import is not supported for assignments yet).');
          return;
        }
        const doc = await uploadDocument({
          entityType: 'test-invite',
          entityId: inviteId,
          category: 'assignment-brief',
          file: pickedFile.file,
        });
        briefDocId = doc.id;
        briefFileName = doc.fileName;
        attachmentBlob = pickedFile.file;
      } else {
        const bank = assignmentBanks.find(b => b.id === libraryBankId);
        if (!bank) {
          toast.error('Select an assignment file from the library.');
          return;
        }
        briefDocId = bank.fileDocId;
        briefFileName = bank.fileName;
        // Read it back through our own API rather than the presigned object-store
        // URL. That URL points at a different origin, so the browser needs the
        // bucket to allow ours before it will hand over the bytes - and when it
        // does not, the fetch fails with nothing useful to show HR. `/preview`
        // proxies the same bytes from an origin we control.
        const res = await fetch(documentPreviewUrl(bank.fileDocId), {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`Could not read "${bank.fileName}" (${res.status}).`);
        }
        attachmentBlob = await res.blob();
      }
      const base64 = await blobToBase64(attachmentBlob);
      onConfirm({
        to: to.trim(),
        subject: subject.trim(),
        body,
        links: [],
        takeHome: {
          deadlineIso: new Date(Date.now() + windowMin * 60_000).toISOString(),
          durationMin: windowMin,
          briefDocId,
          briefFileName,
          driveUploadUrl: driveUploadUrl.trim() || undefined,
        },
        attachment: {
          name: briefFileName,
          base64,
          type: attachmentBlob.type || 'application/octet-stream',
        },
      });
    } catch (err) {
      // The whole block is wrapped, so this used to report a file problem even
      // when the failure was elsewhere. Show what actually happened.
      console.error('Sending the assignment failed:', err);
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Could not send the assignment — try again.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-gray-900">
            <Send size={15} className="text-accent-600" /> Send {what}
          </SheetTitle>
          <SheetDescription>
            {candidate.fullName} · {position}
          </SheetDescription>
        </SheetHeader>

        {mode === null ? (
          <SheetBody className="space-y-3 text-xs">
            <p className="text-[11px] font-medium text-gray-600">
              What do you want to send — pick one. Everything below (the candidate email, link,
              subject and message) is set up for whichever you choose, not both.
            </p>
            <button
              type="button"
              onClick={() => setMode('mcq')}
              className="flex w-full items-center gap-3 rounded-md border border-line p-3.5 text-left transition hover:border-accent-400 hover:bg-accent-50"
            >
              <Link2 size={18} className="shrink-0 text-accent-600" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-gray-900">MCQ Questions</p>
                <p className="text-[11px] text-gray-500">
                  A timed, proctored multiple-choice test — the candidate opens a secure link.
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('take-home')}
              className="flex w-full items-center gap-3 rounded-md border border-line p-3.5 text-left transition hover:border-accent-400 hover:bg-accent-50"
            >
              <FileUp size={18} className="shrink-0 text-accent-600" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-gray-900">Assignment</p>
                <p className="text-[11px] text-gray-500">
                  A take-home file the candidate downloads, completes and uploads back.
                </p>
              </div>
            </button>
          </SheetBody>
        ) : (
          <>
        <SheetBody className="space-y-4 text-xs">
          <div>
            <Label htmlFor="st-to" className="text-[11px] font-medium text-gray-600">
              Candidate email <span className="text-accent-600">*</span>
            </Label>
            <Input
              id="st-to"
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="candidate@email.com"
              className="mt-1"
            />
          </div>

          {!isIq && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-medium text-gray-600">Test type</Label>
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="text-[10px] font-semibold text-accent-600 hover:underline"
                >
                  Change
                </button>
              </div>
              <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-secondary/30 p-1">
                <button
                  type="button"
                  onClick={() => setMode('mcq')}
                  className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    mode === 'mcq' ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  MCQ Questions
                </button>
                <button
                  type="button"
                  onClick={() => setMode('take-home')}
                  className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    mode === 'take-home'
                      ? 'bg-surface text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Assignment
                </button>
              </div>
            </div>
          )}

          {!isIq && !isTakeHome && (
            <div>
              <Label className="text-[11px] font-medium text-gray-600">
                Assessment questions{' '}
                <span className="text-gray-400">(auto-selected by role)</span>
              </Label>
              {assessmentBanks.length === 0 ? (
                <p className="mt-1 rounded-sm border border-dashed border-input bg-secondary/20 px-3 py-2 text-[11px] text-gray-500">
                  No assessment question sets found. Create one in Question Library → Assessment
                  Questions.
                </p>
              ) : (
                <>
                  <Select
                    value={bankId}
                    onChange={e => setBankId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-sm border border-input bg-secondary/50 px-3 text-sm"
                    placeholder="Select an assessment question set"
                  >
                    <option value="">— Select a role —</option>
                    {assessmentBanks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.jobTitle} ({b.questions.length} question
                        {b.questions.length === 1 ? '' : 's'})
                      </option>
                    ))}
                  </Select>
                  {selectedQuestions.length > 0 && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      {selectedQuestions.length} question
                      {selectedQuestions.length === 1 ? '' : 's'} will be sent to the candidate.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {isTakeHome && (
            <div>
              <Label className="text-[11px] font-medium text-gray-600">Assignment file</Label>
              <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-secondary/30 p-1">
                <button
                  type="button"
                  onClick={() => setFileSource('upload')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    fileSource === 'upload'
                      ? 'bg-surface text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <FileUp size={12} /> Upload a file
                </button>
                <button
                  type="button"
                  onClick={() => setFileSource('library')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    fileSource === 'library'
                      ? 'bg-surface text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Library size={12} /> Select from library
                </button>
              </div>

              {fileSource === 'upload' ? (
                <div className="mt-2">
                  <FileDropzone
                    value={pickedFile}
                    onChange={setPickedFile}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                    hint="PDF, Word, Excel, PowerPoint or ZIP up to 15 MB"
                  />
                </div>
              ) : libraryOptions.length === 0 ? (
                <p className="mt-2 rounded-sm border border-dashed border-input bg-secondary/20 px-3 py-2 text-[11px] text-gray-500">
                  No assignment files found. Add one in Question Library → Assignment File Upload.
                </p>
              ) : (
                <Select
                  value={libraryBankId}
                  onChange={e => setLibraryBankId(e.target.value)}
                  className="mt-2 h-9 w-full rounded-sm border border-input bg-secondary/50 px-3 text-sm"
                  placeholder="Select an assignment file"
                >
                  <option value="">— Select a file —</option>
                  {libraryOptions.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.jobTitle} — {b.fileName}
                    </option>
                  ))}
                </Select>
              )}

              <div>
            <Label htmlFor="take-home-window" className="text-[11px] font-medium text-gray-600">
              Time to complete
            </Label>
            <Select
              id="take-home-window"
              value={String(windowMin)}
              onChange={e => setWindowMin(Number(e.target.value))}
              className="mt-2 h-9 w-full rounded-sm border border-input bg-secondary/50 px-3 text-sm"
            >
              {TAKE_HOME_WINDOWS.map(w => (
                <option key={w.min} value={w.min}>
                  {w.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-gray-500">
              Counts from when this is sent. The email says so, and the link stops accepting work
              once it is up.
            </p>
          </div>

          {/* Work that is too large to upload here - a video answer can run
                  to several hundred MB. The file never passes through Circle:
                  the candidate puts it in this folder and hands back a link. */}
              <div className="mt-3">
                <Label
                  htmlFor="drive-upload-url"
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-600"
                >
                  <Link2 size={12} /> Drive upload folder
                  <span className="font-normal text-gray-400">(optional)</span>
                </Label>
                <Input
                  id="drive-upload-url"
                  value={driveUploadUrl}
                  onChange={e => {
                    setDriveUrlEdited(true);
                    setDriveUploadUrl(e.target.value);
                  }}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="mt-2"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  For a video or anything over 15 MB. Share a folder that allows uploads; the
                  candidate uploads there and sends back the link instead of a file.
                </p>
              </div>
            </div>
          )}

          {!isTakeHome && (
            <div>
              <Label className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
                <Link2 size={12} /> {what} link
              </Label>
              <a
                href={testUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate rounded-sm border border-input bg-secondary/40 px-3 py-2 text-sm text-accent-600 hover:underline"
              >
                {testUrl}
              </a>
            </div>
          )}

          <div>
            <Label htmlFor="st-subject" className="text-[11px] font-medium text-gray-600">
              Subject
            </Label>
            <Input
              id="st-subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="st-body" className="text-[11px] font-medium text-gray-600">
                Message
              </Label>
              {edited && (
                <button
                  type="button"
                  onClick={() => {
                    setEdited(false);
                    setBody(composed);
                  }}
                  className="text-[10px] font-semibold text-accent-600 hover:underline"
                >
                  Reset to template
                </button>
              )}
            </div>
            <Textarea
              id="st-body"
              value={body}
              onChange={e => {
                setEdited(true);
                setBody(e.target.value);
              }}
              rows={11}
              className="mt-1 font-mono text-[12px] leading-relaxed"
            />
          </div>

          {error && (
            <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600">
              {error}
            </p>
          )}
        </SheetBody>

        <SheetFooter className="justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!!error || sending}
            onClick={() => {
              if (isTakeHome) {
                confirmTakeHome();
                return;
              }
              onConfirm({
                to: to.trim(),
                subject: subject.trim(),
                body,
                // The link is embedded in the template body, not appended here.
                links: [],
                ...(isIq ? {} : { questions: selectedQuestions }),
              });
            }}
          >
            <Send size={14} /> {sending ? 'Preparing…' : `Send ${what}`}
          </Button>
        </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default SendTestModal;
