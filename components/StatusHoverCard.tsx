'use client';

/**
 * Row hover summaries for the Candidates and Onboarding tables.
 *
 * Both tables show a single status pill per row, which tells you where someone
 * is but not how they got there or what is outstanding. These cards expand that
 * one pill into the full step list on hover, without costing a navigation.
 *
 * Status and progress are derived from data the parent table already holds.
 * The one exception is the resume row, which looks up the candidate's documents
 * — that fires only when a card actually opens, not per row. Everything shown
 * is also reachable on the record's detail page (see the accessibility note in
 * components/ui/hover-card.tsx).
 */

import { Check, ExternalLink, FileText, Minus, X } from 'lucide-react';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { TagPill, type DotColor } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { pipelineFlags, stageStatusColor, type PipelineContext, type StageStatus } from '@/lib/pipeline';
import { useDocuments } from '@/features/documents/hooks';
import { documentPreviewUrl } from '@/lib/api/documents';
import type { Candidate, OnboardingChecklist } from '@/types';

/* ------------------------------------------------------------------ shared */

type StepState = 'done' | 'active' | 'todo' | 'skipped';

interface Step {
  label: string;
  state: StepState;
  /** Optional right-hand detail, e.g. "3/7" or a date. */
  note?: string;
}

const STEP_ICON: Record<StepState, typeof Check> = {
  done: Check,
  active: Minus,
  todo: Minus,
  skipped: X,
};

const STEP_STYLE: Record<StepState, { dot: string; text: string }> = {
  done: { dot: 'border-accent-600 bg-accent-600 text-white', text: 'text-gray-700' },
  active: { dot: 'border-accent-600 bg-accent-50 text-accent-700', text: 'font-semibold text-gray-900' },
  todo: { dot: 'border-line-strong bg-surface text-gray-400', text: 'text-gray-400' },
  skipped: { dot: 'border-line-strong bg-surface-sunken text-gray-400', text: 'text-gray-400 line-through' },
};

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map(s => {
        const Icon = STEP_ICON[s.state];
        const style = STEP_STYLE[s.state];
        return (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                style.dot,
              )}
            >
              {s.state === 'done' || s.state === 'skipped' ? <Icon size={9} strokeWidth={3} /> : null}
            </span>
            <span className={cn('flex-1 truncate text-[11px]', style.text)}>{s.label}</span>
            {s.note ? <span className="shrink-0 text-[10px] text-gray-400 tabular-nums">{s.note}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function CardShell({
  name,
  pill,
  pillColor,
  children,
}: {
  name: string;
  pill: string;
  pillColor: DotColor;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate font-display text-[13px] font-bold tracking-tight text-gray-900">
          {name}
        </p>
        <TagPill color={pillColor}>{pill}</TagPill>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ resume */

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Resume row. Only mounts when the card opens (Radix does not render Content
 * while closed), so this is one request per hover rather than one per table row.
 *
 * Two sources, in order: an uploaded document, then the Google Drive link a
 * public applicant may have supplied on the apply form (`candidate.resumeUrl`).
 */
function ResumeLink({ candidateId, driveUrl }: { candidateId: string; driveUrl?: string }) {
  const { data: docs, isLoading, isError } = useDocuments('candidate', candidateId);
  const resume = docs?.find(d => d.category === 'resume') ?? docs?.[0];

  const row = 'flex items-center gap-1.5 border-t border-line-soft pt-2 text-[10px]';

  if (isLoading) return <div className={cn(row, 'text-gray-400')}>Checking for a resume...</div>;

  if (resume) {
    return (
      <div className={row}>
        <FileText size={11} className="shrink-0 text-accent-600" />
        <a
          href={documentPreviewUrl(resume.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-semibold text-accent-600 hover:underline"
          title={resume.fileName}
        >
          {resume.fileName}
        </a>
        <span className="shrink-0 text-gray-400 tabular-nums">{fmtSize(resume.size)}</span>
      </div>
    );
  }

  if (driveUrl) {
    return (
      <div className={row}>
        <ExternalLink size={11} className="shrink-0 text-accent-600" />
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-semibold text-accent-600 hover:underline"
        >
          Resume (Drive link)
        </a>
      </div>
    );
  }

  // Document storage is currently unconfigured server-side (the API logs
  // "S3 storage not configured" and returns 502), so distinguish "failed to
  // load" from "this candidate has no resume" rather than showing one for both.
  if (isError) return <div className={cn(row, 'text-gray-400')}>Resume unavailable right now.</div>;

  return <div className={cn(row, 'text-gray-400')}>No resume on file.</div>;
}

/* --------------------------------------------------------------- candidate */

/** Pipeline order shown on the card, matching the detail page. */
function candidateSteps(candidate: Candidate, ctx: PipelineContext, stage: StageStatus): Step[] {
  const f = pipelineFlags(candidate, ctx);

  // A terminal decision stops the pipeline; remaining steps read as skipped
  // rather than pending, so "Rejected at HR Call" is legible at a glance.
  const stopped = f.rejected || f.onHold;
  const mk = (label: string, reached: boolean, done: boolean): Step => {
    if (done) return { label, state: 'done' };
    if (reached) return { label, state: stopped ? 'skipped' : 'active' };
    return { label, state: stopped ? 'skipped' : 'todo' };
  };

  return [
    mk('Screening', f.screeningStarted, f.screeningDone),
    mk('HR Call', f.hrCallReached, f.hrCallDone),
    mk('Interview', f.interviewReached, f.interviewDone),
    mk('IQ Test', f.iqReached, f.iqDone),
    mk('Assessment', f.asgReached, f.asgDone),
    mk('Decision', f.offerShortlisted || f.decided, f.selected),
  ];
}

export function CandidateStatusHover({
  candidate,
  ctx,
  stage,
  children,
}: {
  candidate: Candidate;
  ctx: PipelineContext;
  stage: StageStatus;
  children: React.ReactNode;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        <CardShell name={candidate.fullName} pill={stage} pillColor={stageStatusColor(stage)}>
          <StepList steps={candidateSteps(candidate, ctx, stage)} />
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line-soft pt-2 text-[10px]">
            <dt className="text-gray-400">Role</dt>
            <dd className="truncate text-right text-gray-700">{candidate.appliedRole || '—'}</dd>
            <dt className="text-gray-400">Source</dt>
            <dd className="truncate text-right text-gray-700">{candidate.sourceOfApplication || '—'}</dd>
            <dt className="text-gray-400">Notice</dt>
            <dd className="text-right text-gray-700 tabular-nums">{candidate.noticePeriodDays} days</dd>
            <dt className="text-gray-400">Applied</dt>
            <dd className="text-right text-gray-700 tabular-nums">{candidate.appliedDate || '—'}</dd>
          </dl>
          <ResumeLink candidateId={candidate.id} driveUrl={candidate.resumeUrl} />
        </CardShell>
      </HoverCardContent>
    </HoverCard>
  );
}

/* -------------------------------------------------------------- onboarding */

const TASK_CATEGORIES = [
  'Documentation',
  'IT Setup',
  'Admin & Assets',
  'HR & Induction',
  'Manager & Team',
] as const;

export function OnboardingStatusHover({
  record,
  status,
  percentage,
  children,
}: {
  record: OnboardingChecklist;
  status: string;
  percentage: number;
  children: React.ReactNode;
}) {
  const tasks = record.tasks ?? [];

  // Group by category so the card shows which *area* is lagging, which is the
  // actionable question. A flat list of every task would overflow the card.
  const steps: Step[] = TASK_CATEGORIES.map(cat => {
    const inCat = tasks.filter(t => t.category === cat);
    const done = inCat.filter(t => t.isChecked).length;
    if (inCat.length === 0) return { label: cat, state: 'skipped', note: '—' };
    return {
      label: cat,
      state: done === inCat.length ? 'done' : done > 0 ? 'active' : 'todo',
      note: `${done}/${inCat.length}`,
    };
  });

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        <CardShell
          name={record.candidateName}
          pill={status}
          pillColor={percentage === 100 ? 'green' : 'blue'}
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
              <div className="h-full rounded-full bg-accent-600" style={{ width: `${percentage}%` }} />
            </div>
            <span className="shrink-0 text-[10px] text-gray-600 tabular-nums">{percentage}%</span>
          </div>
          <StepList steps={steps} />
          <div className="border-t border-line-soft pt-2 text-[10px]">
            {record.convertedToEmployeeAt ? (
              <span className="text-gray-700">
                Converted to employee{record.employeeId ? ` · ${record.employeeId}` : ''}
              </span>
            ) : (
              <span className="text-gray-400">Not yet converted to employee</span>
            )}
          </div>
        </CardShell>
      </HoverCardContent>
    </HoverCard>
  );
}
