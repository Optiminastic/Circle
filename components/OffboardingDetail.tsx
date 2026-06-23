'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Send,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  UserRound,
  CalendarDays,
  CalendarClock,
  Clock4,
  Building2,
} from 'lucide-react';
import { Employee, ExitHandover, OffboardingWorkflow } from '@/types';
import { DocumentsPanel } from './DocumentsPanel';
import { ExitHandoverModal } from './ExitHandoverModal';
import { repositories } from '@/lib/api/repositories';
import { revealHandover, purgeHandover, type HandoverReveal } from '@/lib/api/exit-handover';
import { useEmployees } from '@/features/employees/hooks';
import { useToast } from './Toaster';

interface OffboardingDetailProps {
  workflow: OffboardingWorkflow;
  onToggleExitTask: (empId: string, taskId: string) => void;
  onToggleDeliverable: (empId: string, deliverableId: string) => void;
  onConfirmClearance: (empId: string) => void;
}

const initials = (name: string) =>
  name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const cardCls = 'rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 shadow-2xs';

/** Exit case for one employee — left: employee details, middle: submitted
 *  documents, right: the dated exit journey. */
export function OffboardingDetail({ workflow }: OffboardingDetailProps) {
  const { data: employees = [] } = useEmployees();
  const employee: Employee | undefined = employees.find(e => e.id === workflow.employeeId);

  const noticeLeft = useMemo(() => {
    const lwd = new Date(workflow.lastWorkingDay).getTime();
    if (Number.isNaN(lwd)) return null;
    return Math.max(0, Math.ceil((lwd - Date.now()) / 86_400_000));
  }, [workflow.lastWorkingDay]);

  return (
    <div className="grid grid-cols-1 gap-5 text-xs lg:grid-cols-[300px_minmax(0,1fr)_300px]">
      {/* ── LEFT: employee details + actions ────────────────────────────── */}
      <aside className="space-y-4">
        <div className={`${cardCls} text-center`}>
          {employee?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.avatarUrl}
              alt={workflow.employeeName}
              className="mx-auto size-20 rounded-full object-cover"
            />
          ) : (
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-2xl font-bold text-white">
              {initials(workflow.employeeName)}
            </span>
          )}
          <h3 className="mt-3 font-display text-base font-bold text-gray-900">{workflow.employeeName}</h3>
          <p className="text-[11px] text-gray-500">
            {employee?.role || '—'}
            {employee?.department ? ` · ${employee.department}` : ''}
          </p>
          <span className="mt-2 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600">
            {workflow.triggerReason || 'Resignation'} · {workflow.status}
          </span>
        </div>

        <div className={`${cardCls} space-y-2.5`}>
          <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Employee details
          </h4>
          <Contact icon={<UserRound size={13} />} value={workflow.employeeId} hint="ID" />
          <Contact icon={<Mail size={13} />} value={employee?.email} />
          <Contact icon={<Phone size={13} />} value={employee?.phone} />
          <Contact icon={<Building2 size={13} />} value={employee?.department} hint="Dept" />
          <Contact icon={<Briefcase size={13} />} value={employee?.employmentType} />
          <Contact icon={<MapPin size={13} />} value={employee?.workLocation} />
          <Contact icon={<UserRound size={13} />} value={employee?.reportingManager} hint="Manager" />
        </div>

        <div className={cardCls}>
          <SendMailButton
            employeeId={workflow.employeeId}
            employeeName={workflow.employeeName}
            workEmail={employee?.email}
            lastWorkingDay={workflow.lastWorkingDay}
          />
        </div>

        <CredentialsCard employeeId={workflow.employeeId} />
      </aside>

      {/* ── MIDDLE: documents submitted ─────────────────────────────────── */}
      <div className="space-y-4">
        <DocumentsPanel
          entityType="offboarding"
          entityId={workflow.employeeId}
          category="handover"
          title="Submitted documents (employee & HR)"
        />
      </div>

      {/* ── RIGHT: dated exit journey ───────────────────────────────────── */}
      <aside className="space-y-4">
        <div className={`${cardCls} space-y-3`}>
          <h4 className="font-bold text-gray-900">Exit journey</h4>
          <ol className="relative space-y-4 border-l border-[#E4E6EA] pl-4">
            <Milestone
              icon={<CalendarDays size={12} />}
              label="Joined"
              date={fmtDate(employee?.joiningDate)}
            />
            <Milestone
              icon={<CalendarClock size={12} />}
              label="Resignation applied"
              date={fmtDate(workflow.initiatedDate)}
            />
            <Milestone
              icon={<CalendarClock size={12} />}
              label="Last working day"
              date={fmtDate(workflow.lastWorkingDay)}
              tone="red"
            />
          </ol>
          <div className="rounded-lg border border-[#E4E6EA] bg-[#F7F8FA] p-3">
            <p className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-gray-500">
              <Clock4 size={12} /> Notice remaining
            </p>
            <p className="mt-1 text-[15px] font-bold text-gray-900">
              {noticeLeft === null ? '—' : `${noticeLeft} day${noticeLeft === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {workflow.ktRecord && (
          <div className={`${cardCls} space-y-1`}>
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Knowledge transfer
            </h4>
            <p className="text-[11px] text-gray-700">{workflow.ktRecord.currentProjects}</p>
            <p className="text-[10px] font-semibold text-accent-600">
              Status: {workflow.ktRecord.ktCompletionStatus}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

// ── Small presentational helpers ─────────────────────────────────────────────

function Contact({ icon, value, hint }: { icon: React.ReactNode; value?: string; hint?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-700">
      <span className="text-gray-400">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
      {hint && <span className="font-mono text-[9px] uppercase text-gray-400">{hint}</span>}
    </div>
  );
}

function Milestone({
  icon,
  label,
  date,
  tone = 'accent',
}: {
  icon: React.ReactNode;
  label: string;
  date: string;
  tone?: 'accent' | 'red';
}) {
  const dot = tone === 'red' ? 'bg-red-600' : 'bg-accent-600';
  return (
    <li className="relative">
      <span
        className={`absolute -left-[1.42rem] top-0.5 grid size-4 place-items-center rounded-full text-white ${dot}`}
      >
        {icon}
      </span>
      <p className="text-[11px] font-semibold text-gray-800">{label}</p>
      <p className="font-mono text-[11px] text-gray-500">{date}</p>
    </li>
  );
}

// ── Send-mail button + modal ─────────────────────────────────────────────────

function SendMailButton(props: {
  employeeId: string;
  employeeName: string;
  workEmail?: string;
  lastWorkingDay?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-accent-700"
      >
        <Send size={13} /> Send mail for final documents
      </button>
      {open && (
        <ExitHandoverModal
          employeeId={props.employeeId}
          employeeName={props.employeeName}
          workEmail={props.workEmail}
          lastWorkingDay={props.lastWorkingDay}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Credentials card (HR view of what the employee submitted) ────────────────

function CredentialsCard({ employeeId }: { employeeId: string }) {
  const toast = useToast();
  const [handover, setHandover] = useState<ExitHandover | null>(null);
  const [reveal, setReveal] = useState<HandoverReveal | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const load = useCallback(async () => {
    try {
      setHandover(await repositories.exitHandovers.get(employeeId));
    } catch {
      setHandover(null);
    }
  }, [employeeId]);
  useEffect(() => {
    load();
  }, [load]);

  const doReveal = async () => {
    setRevealing(true);
    try {
      setReveal(await revealHandover(employeeId));
    } catch {
      toast.error('Could not load the submitted credentials.');
    } finally {
      setRevealing(false);
    }
  };

  const doPurge = () =>
    toast.confirm({
      title: 'Delete collected credentials?',
      description: 'Permanently removes the stored work email + password. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await purgeHandover(employeeId);
          setReveal(null);
          toast.success('Credentials deleted.');
          load();
        } catch {
          toast.error('Could not delete the credentials.');
        }
      },
    });

  return (
    <div className={`${cardCls} space-y-2.5`}>
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-bold text-gray-900">
          <KeyRound size={14} className="text-accent-600" /> Credentials
        </h4>
        {handover?.credentials && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 size={11} /> Submitted
          </span>
        )}
      </div>

      {!handover ? (
        <p className="text-[11px] text-gray-500">No handover link sent yet.</p>
      ) : !handover.credentials ? (
        <p className="text-[11px] text-gray-500">Waiting for the employee to submit credentials.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={doReveal}
              disabled={revealing}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E6EA] px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:bg-[#F1F3F5] disabled:opacity-50"
            >
              {revealing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
              Reveal
            </button>
            <button
              onClick={doPurge}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>

          {reveal && (
            <div className="space-y-1.5 rounded-lg border border-[#E4E6EA] bg-[#F7F8FA] p-3 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-700">Email</span>
                <span className="min-w-0 truncate font-mono text-gray-900">{reveal.workEmail || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-700">Password</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-gray-900">
                    {reveal.password ? (showPw ? reveal.password : '••••••••') : '—'}
                  </span>
                  {reveal.password && (
                    <button
                      onClick={() => setShowPw(s => !s)}
                      className="text-gray-400 hover:text-gray-700"
                      aria-label={showPw ? 'Hide' : 'Show'}
                    >
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </span>
              </div>
              {reveal.extras?.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 border-t border-[#EDEEF1] pt-1.5"
                >
                  <span className="min-w-0 truncate font-semibold text-gray-700">{ex.key}</span>
                  <span className="min-w-0 truncate font-mono text-gray-900">{ex.value || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default OffboardingDetail;
