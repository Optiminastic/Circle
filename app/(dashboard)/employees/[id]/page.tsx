'use client';

import React, { useState } from 'react';
import { Select } from '@/components/Select';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CalendarDays,
  Wallet,
  Landmark,
  Fingerprint,
  ScrollText,
  Building2,
  PenLine,
  CheckCircle2,
  XCircle,
  Clock4,
  KeyRound,
  Laptop,
  Award,
  Users,
  Hash,
  ShieldAlert,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useEmployees, useEmployeeMutations } from '@/features/employees/hooks';
import { useOffboarding, useInitiateOffboarding } from '@/features/offboarding/hooks';
import { useToast } from '@/components/Toaster';
import type { OffboardingWorkflow } from '@/types';
import { useBgvs } from '@/features/candidates/hooks';
import { useDocRequests } from '@/features/doc-requests/hooks';
import { PageLoading } from '@/components/PageLoading';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { DatePicker } from '@/components/ui/date-picker';
import { AvatarUploader } from '@/components/AvatarUploader';
import { EditEmployeeDialog } from '@/components/EditEmployeeDialog';

const PROBATION_MONTHS = 6;

type TabKey = 'overview' | 'compensation' | 'documents' | 'access';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'compensation', label: 'Compensation' },
  { key: 'documents', label: 'Documents' },
  { key: 'access', label: 'Assets & Access' },
];

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const router = useRouter();
  const { data: employees = [], isLoading } = useEmployees();
  const { data: bgvs = [] } = useBgvs();
  const { data: docRequests = [] } = useDocRequests();
  const { data: offboarding = [] } = useOffboarding();
  const { update } = useEmployeeMutations();
  const initiateOffboarding = useInitiateOffboarding();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(false);

  // HR-triggered resignation / notice period
  const [resignOpen, setResignOpen] = useState(false);
  const [resignReason, setResignReason] = useState<OffboardingWorkflow['triggerReason']>('Resignation');
  const [resignDate, setResignDate] = useState('');
  const [resignNoticeDays, setResignNoticeDays] = useState(30);

  const employee = employees.find(e => e.id === id);

  if (isLoading) return <PageLoading />;
  if (!employee) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-sm font-semibold text-gray-700">Employee not found</p>
        <Link href="/directory" className="mt-3 inline-block text-xs font-semibold text-accent-600 hover:underline">
          ← Back to directory
        </Link>
      </div>
    );
  }

  const cid = employee.candidateId;
  const bgv = cid ? bgvs.find(b => b.candidateId === cid) : undefined;
  const docRequest = cid
    ? docRequests
        .filter(r => r.candidateId === cid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : undefined;

  const credentials = employee.credentials ?? [];
  const assets = employee.assets ?? [];
  const bank = docRequest?.bankDetails;

  const initials = employee.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  // --- Probation: 6 months from the joining date ---
  const DAY = 86_400_000;
  const now = new Date();
  const joinDate = new Date(employee.joiningDate);
  const probationEnd = Number.isNaN(joinDate.getTime()) ? null : new Date(joinDate);
  if (probationEnd) probationEnd.setMonth(probationEnd.getMonth() + PROBATION_MONTHS);
  const inProbation =
    employee.status === 'Active' && !!probationEnd && now < probationEnd;
  const probationDaysLeft = probationEnd ? Math.max(0, Math.ceil((probationEnd.getTime() - now.getTime()) / DAY)) : 0;

  // --- Applicable notice period (company policy) ---
  // Confirmed employees (past probation) serve 1 month; those still on probation
  // and interns serve a shorter 15-day notice.
  const isIntern = employee.employmentType === 'Intern' || /intern/i.test(employee.role || '');
  const noticePolicyDays = isIntern || inProbation ? 15 : 30;
  const noticePolicyLabel = `${noticePolicyDays === 30 ? '1 month' : '15 days'} (${
    isIntern ? 'intern' : inProbation ? 'probation' : 'confirmed'
  })`;

  // --- Currently serving notice: derived from a live exit case in the offboarding repo ---
  const exitCase = offboarding.find(o => o.employeeId === employee.id && o.status !== 'Completed');
  const onNotice = !!exitCase && !!exitCase.lastWorkingDay;
  const lastWorkingDay = onNotice ? new Date(exitCase!.lastWorkingDay) : null;
  const noticeDaysLeft =
    lastWorkingDay && !Number.isNaN(lastWorkingDay.getTime())
      ? Math.max(0, Math.ceil((lastWorkingDay.getTime() - now.getTime()) / DAY))
      : 0;

  const todayStr = now.toISOString().split('T')[0];
  const startResign = () => {
    setResignReason('Resignation');
    setResignDate(todayStr);
    setResignNoticeDays(noticePolicyDays);
    setResignOpen(true);
  };
  const resignLastWorkingDay = (() => {
    const d = new Date(resignDate || todayStr);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (Number(resignNoticeDays) || 0));
    return d.toISOString().split('T')[0];
  })();
  const confirmResign = () => {
    initiateOffboarding.mutate(
      {
        empId: employee.id,
        reason: resignReason,
        initiatedDate: resignDate || todayStr,
        noticeDays: Number(resignNoticeDays) || 0,
      },
      {
        onSuccess: () => {
          toast.success(`Exit case opened — last working day ${fmtDate(resignLastWorkingDay)}.`);
          setResignOpen(false);
          router.push(`/offboarding/${employee.id}`);
        },
        onError: () => toast.error('Could not open the exit case — please try again.'),
      },
    );
  };
  const openExitCase = () => router.push(`/offboarding/${employee.id}`);

  const statusTone =
    employee.status === 'Active'
      ? 'bg-emerald-50 text-emerald-600'
      : employee.status === 'Offboarded'
        ? 'bg-red-50 text-red-600'
        : 'bg-yellow-50 text-yellow-600';

  return (
    <div className="space-y-5 text-xs">
      <EditEmployeeDialog
        open={editOpen}
        employee={employee}
        onClose={() => setEditOpen(false)}
        onSave={updated => update.mutate(updated)}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* MAIN */}
        <div className="space-y-5">
          {/* Profile card */}
          <div className="overflow-hidden rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs">
            <div
              className="h-28 bg-[#EDE9E3] bg-cover bg-center"
              style={{ backgroundImage: "url('/optiminastic-banner.png')" }}
              role="img"
              aria-label="Optiminastic"
            />
            <div className="px-5">
              {/* Avatar overlaps the banner; quick actions on the right */}
              <div className="-mt-12 flex items-end justify-between gap-3">
                <AvatarUploader
                  employeeId={employee.id}
                  avatarUrl={employee.avatarUrl}
                  initials={initials}
                  size={96}
                  onChange={url => update.mutate({ ...employee, avatarUrl: url })}
                />
                <div className="flex items-center gap-2 pb-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-3 text-[12px] font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-600"
                  >
                    <PenLine size={14} /> Edit
                  </button>
                  <a
                    href={employee.email ? `mailto:${employee.email}` : undefined}
                    aria-label="Email"
                    className="grid size-9 place-items-center rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] text-gray-600 transition hover:bg-[#F7F8FA] hover:text-accent-600"
                  >
                    <Mail size={15} />
                  </a>
                  <a
                    href={employee.phone ? `tel:${employee.phone}` : undefined}
                    aria-label="Call"
                    className="grid size-9 place-items-center rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] text-gray-600 transition hover:bg-[#F7F8FA] hover:text-accent-600"
                  >
                    <Phone size={15} />
                  </a>
                  {employee.status !== 'Offboarded' &&
                    (onNotice ? (
                      <button
                        onClick={openExitCase}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[12px] font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        <LogOut size={14} /> View exit case
                      </button>
                    ) : (
                      <button
                        onClick={startResign}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-[#FFFFFF] px-3 text-[12px] font-semibold text-gray-700 transition hover:bg-[#F7F8FA] hover:text-accent-600"
                      >
                        <LogOut size={14} /> Start offboarding
                      </button>
                    ))}
                </div>
              </div>

              {/* Identity — on white, below the banner */}
              <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-bold text-gray-900">{employee.fullName}</h1>
                  <p className="text-[13px] text-gray-500">
                    {employee.role} · {employee.department}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[#E4E6EA] bg-[#F7F8FA] px-2 py-0.5 text-[11px] text-gray-600">
                    <MapPin size={11} /> {employee.workLocation || '—'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${statusTone}`}>
                    {employee.status}
                  </span>
                  {inProbation && (
                    <span
                      title={`On probation until ${fmtDate(probationEnd?.toISOString())}`}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-700"
                    >
                      <ShieldAlert size={11} /> Probation · {probationDaysLeft}d
                    </span>
                  )}
                  {employee.status === 'Active' && !inProbation && probationEnd && !isIntern && (
                    <span
                      title={`Probation cleared on ${fmtDate(probationEnd.toISOString())}`}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-700"
                    >
                      <ShieldCheck size={11} /> Confirmed
                    </span>
                  )}
                  {isIntern && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 font-mono text-[10px] font-bold text-purple-700">
                      Intern
                    </span>
                  )}
                  {!onNotice && (
                    <span
                      title="Applicable resignation notice period"
                      className="inline-flex items-center gap-1 rounded-full bg-[#F1F3F5] px-2.5 py-1 font-mono text-[10px] font-bold text-gray-500"
                    >
                      <LogOut size={11} /> Notice {noticePolicyDays === 30 ? '1mo' : '15d'}
                    </span>
                  )}
                  {onNotice && (
                    <span
                      title={`Last working day ${fmtDate(exitCase!.lastWorkingDay)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-mono text-[10px] font-bold text-red-600"
                    >
                      <LogOut size={11} /> Notice · {noticeDaysLeft}d
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-gray-400">
                    {employee.id} · joined {fmtDate(employee.joiningDate)}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex flex-wrap gap-1 border-b border-[#EDEEF1]">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition ${
                      tab === t.key
                        ? 'border-accent-600 text-accent-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <>
              <Card icon={<Briefcase size={14} />} title="Job details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <KV k="Reporting manager" v={employee.reportingManager} />
                  <KV k="Work location" v={employee.workLocation} />
                  <KV k="Joining date" v={fmtDate(employee.joiningDate)} />
                  <KV k="Department" v={employee.department} />
                  <KV k="Employment type" v={employee.employmentType || 'Full-time'} />
                  <KV
                    k="Probation"
                    v={
                      inProbation
                        ? `On probation · ends ${fmtDate(probationEnd?.toISOString())}`
                        : `Confirmed (${PROBATION_MONTHS}-month probation cleared)`
                    }
                  />
                  <KV
                    k="Notice period"
                    v={
                      onNotice
                        ? `Serving notice · LWD ${fmtDate(exitCase!.lastWorkingDay)}`
                        : noticePolicyLabel
                    }
                  />
                </div>
              </Card>

              <Card icon={<Mail size={14} />} title="Contact & personal">
                <div className="space-y-2">
                  <Detail icon={<Mail size={13} />} value={employee.email} />
                  <Detail icon={<Phone size={13} />} value={employee.phone || '—'} />
                  <Detail icon={<MapPin size={13} />} value={employee.personalDetails?.address || '—'} />
                  <Detail
                    icon={<CalendarDays size={13} />}
                    value={`Emergency: ${employee.personalDetails?.emergencyContact || '—'}`}
                  />
                  {(employee.personalDetails?.dateOfBirth || employee.personalDetails?.gender) && (
                    <Detail
                      icon={<CalendarDays size={13} />}
                      value={[
                        employee.personalDetails?.dateOfBirth ? `DOB ${fmtDate(employee.personalDetails.dateOfBirth)}` : null,
                        employee.personalDetails?.gender || null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  )}
                  {(employee.personalDetails?.panNumber || employee.personalDetails?.aadhaarNumber) && (
                    <Detail
                      icon={<Hash size={13} />}
                      value={[
                        employee.personalDetails?.panNumber ? `PAN ${employee.personalDetails.panNumber}` : null,
                        employee.personalDetails?.aadhaarNumber ? `Aadhaar ${employee.personalDetails.aadhaarNumber}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  )}
                </div>
              </Card>
            </>
          )}

          {/* Compensation */}
          {tab === 'compensation' && (
            <>
              <Card icon={<Wallet size={14} />} title="Compensation">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <KV k="Annual CTC" v={employee.annualCtc || '—'} />
                  <KV k="Source" v={cid ? 'From accepted offer' : 'Set manually'} />
                </div>
              </Card>

              <Card icon={<Landmark size={14} />} title="Bank details">
                {bank?.accountNumber ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <KV k="Account holder" v={bank.accountHolderName || employee.fullName} />
                    <KV k="Bank" v={bank.bankName || '—'} />
                    <KV k="Account number" v={bank.accountNumber} />
                    <KV k="IFSC" v={bank.ifscCode} />
                  </div>
                ) : employee.personalDetails?.accountNumber ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <KV k="Account holder" v={employee.fullName} />
                    <KV k="Bank" v={employee.personalDetails.bankName || '—'} />
                    <KV k="Account number" v={employee.personalDetails.accountNumber} />
                    <KV k="IFSC" v={employee.personalDetails.ifsc || '—'} />
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    {employee.personalDetails?.bankAccount || 'No bank details on file.'}
                  </p>
                )}
              </Card>
            </>
          )}

          {/* Documents */}
          {tab === 'documents' && (
            <>
              <Card icon={<Fingerprint size={14} />} title="Background verification report">
                {bgv ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-600">Overall status</span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                          bgv.overallStatus === 'Verified'
                            ? 'bg-emerald-50 text-emerald-600'
                            : bgv.overallStatus === 'Rejected'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-yellow-50 text-yellow-600'
                        }`}
                      >
                        {bgv.overallStatus}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {bgv.documents.map(d => (
                        <div key={d.type} className="flex items-center justify-between border-b border-[#ECEDF0] pb-1 text-[11px] last:border-0">
                          <span className="flex items-center gap-1.5 text-gray-700">
                            {d.status === 'Verified' ? (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            ) : d.status === 'Rejected' ? (
                              <XCircle size={12} className="text-red-500" />
                            ) : (
                              <Clock4 size={12} className="text-gray-400" />
                            )}
                            {d.type}
                          </span>
                          <span className="font-mono text-gray-500">{d.status}</span>
                        </div>
                      ))}
                    </div>
                    {bgv.verificationTimeline?.length > 0 && (
                      <div className="rounded-lg bg-[#F7F8FA] p-2.5">
                        <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Timeline</p>
                        <ul className="space-y-1">
                          {bgv.verificationTimeline.map((t, i) => (
                            <li key={i} className="flex justify-between gap-2 text-[11px] text-gray-600">
                              <span>{t.action}</span>
                              <span className="shrink-0 font-mono text-gray-400">{fmtDate(t.date)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">No background verification record linked.</p>
                )}
              </Card>

              {cid && (
                <DocumentsPanel
                  entityType="candidate"
                  entityId={cid}
                  title="Joining documents (verified at onboarding)"
                  previewOnly
                />
              )}
              <DocumentsPanel entityType="employee" entityId={employee.id} category="document" title="Important documents" />
            </>
          )}

          {/* Assets & Access */}
          {tab === 'access' && (
            <>
              <Card icon={<KeyRound size={14} />} title={`Credentials (${credentials.length})`}>
                {credentials.length ? (
                  <div className="space-y-1.5">
                    {credentials.map(c => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-gray-700">{c.systemName}</span>
                        <span className="shrink-0 font-mono text-gray-400">{c.accessLevel} · {c.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">No system access granted yet.</p>
                )}
              </Card>

              <Card icon={<Laptop size={14} />} title={`Assets (${assets.length})`}>
                {assets.length ? (
                  <div className="space-y-1.5">
                    {assets.map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-gray-700">{a.assetName}</span>
                        <span className="shrink-0 font-mono text-gray-400">{a.serialNumber}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">No hardware assigned.</p>
                )}
              </Card>

              <Card icon={<Award size={14} />} title="Appraisal history">
                {employee.appraisalHistory && employee.appraisalHistory.length ? (
                  <div className="space-y-2">
                    {employee.appraisalHistory.map(ap => (
                      <div key={ap.id} className="rounded-lg bg-[#F7F8FA] p-2.5">
                        <div className="flex justify-between font-mono text-[9px] font-bold">
                          <span className="text-accent-600 uppercase">{ap.reviewPeriod}</span>
                          <span className="text-emerald-600">⭐ {ap.performanceScore}/5</span>
                        </div>
                        <p className="mt-1 text-[11px] italic text-gray-600">“{ap.managerFeedback}”</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">No appraisals filed yet.</p>
                )}
              </Card>
            </>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-5">
          <Card icon={<Users size={14} />} title="Reporting line">
            <div className="space-y-3">
              {employee.reportingManager && employee.reportingManager !== '—' && (
                <PersonRow name={employee.reportingManager} role="Reporting manager" />
              )}
              <PersonRow name={employee.fullName} role={employee.role} self />
            </div>
          </Card>

          <Card icon={<ScrollText size={14} />} title="Additional details">
            <div className="space-y-3.5">
              <InfoRow icon={<Mail size={13} />} label="Email" value={employee.email} />
              <InfoRow icon={<Phone size={13} />} label="Phone" value={employee.phone || '—'} />
              <InfoRow icon={<MapPin size={13} />} label="Work location" value={employee.workLocation || '—'} />
              <InfoRow icon={<Building2 size={13} />} label="Department" value={employee.department} />
              <InfoRow icon={<CalendarDays size={13} />} label="Join date" value={fmtDate(employee.joiningDate)} />
              <InfoRow
                icon={<ShieldAlert size={13} />}
                label="Probation"
                value={inProbation ? `On probation · ends ${fmtDate(probationEnd?.toISOString())}` : 'Confirmed'}
              />
              <InfoRow icon={<LogOut size={13} />} label="Notice period" value={noticePolicyLabel} />
              <InfoRow icon={<Wallet size={13} />} label="Annual CTC" value={employee.annualCtc || '—'} />
              <InfoRow icon={<Hash size={13} />} label="Employee ID" value={employee.id} />
            </div>
          </Card>
        </aside>
      </div>

      {/* HR: start the notice period on resignation */}
      {resignOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <LogOut size={15} className="text-accent-600" /> Start notice period
              </h3>
              <button onClick={() => setResignOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <XCircle size={16} />
              </button>
            </div>
            <p className="mb-4 text-[12px] text-gray-500">
              Record {employee.fullName}&apos;s exit. The last working day is calculated from the notice
              period below ({isIntern ? 'interns' : inProbation ? 'on probation' : 'confirmed'} →{' '}
              {noticePolicyDays === 30 ? '1 month' : '15 days'} by policy).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Reason</label>
                <Select
                  value={resignReason}
                  onChange={e => setResignReason(e.target.value as OffboardingWorkflow['triggerReason'])}
                  className="mt-1 w-full rounded-lg border border-[#E4E6EA] bg-[#F7F8FA] px-2.5 py-1.5 text-xs"
                >
                  <option value="Resignation">Resignation</option>
                  <option value="Termination">Termination</option>
                  <option value="Contract completion">Contract completion</option>
                  <option value="Mutual separation">Mutual separation</option>
                  <option value="Role redundancy">Role redundancy</option>
                  <option value="Absconding">Absconding</option>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-gray-700">Resignation date</label>
                  <DatePicker value={resignDate} onChange={setResignDate} className="mt-1" />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Notice (days)</label>
                  <input
                    type="number"
                    min={0}
                    value={resignNoticeDays}
                    onChange={e => setResignNoticeDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#E4E6EA] bg-[#F7F8FA] px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="rounded-lg bg-[#F7F8FA] px-3 py-2.5">
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Last working day</p>
                <p className="text-[13px] font-bold text-gray-900">{fmtDate(resignLastWorkingDay)}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setResignOpen(false)}
                className="rounded-lg border border-[#E4E6EA] px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-[#F7F8FA]"
              >
                Cancel
              </button>
              <button
                onClick={confirmResign}
                disabled={update.isPending}
                className="rounded-lg bg-accent-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-700 disabled:opacity-60"
              >
                Start notice period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonRow({ name, role, self }: { name: string; role: string; self?: boolean }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${
          self ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 ring-2 ring-emerald-200' : 'bg-gradient-to-br from-purple-500 to-purple-700'
        }`}
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-gray-900">{name}</p>
        <p className="truncate text-[11px] text-gray-500">{role}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#F7F8FA] text-accent-600">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="break-words text-[12px] font-medium text-gray-700">{value || '—'}</p>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-4 shadow-2xs">
      <h3 className="mb-3 flex items-center gap-1.5 border-b border-[#EDEEF1] pb-2 text-[12px] font-bold text-gray-900">
        <span className="text-accent-600">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-gray-400">{k}</p>
      <p className="text-[12px] font-medium text-gray-700">{v || '—'}</p>
    </div>
  );
}

function Detail({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[12px] text-gray-700">
      <span className="mt-0.5 text-accent-600">{icon}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
