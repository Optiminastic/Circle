'use client';

/**
 * The claims background verification checks.
 *
 * Everything here is something the candidate states about themselves that a
 * third party then confirms: the institute confirms the degree, the employer
 * confirms the employment, a field agent visits the address, and EPFO answers
 * for the UAN. None of it is taken on trust, which is why the candidate can
 * write it all and why overstating anything is self-defeating.
 *
 * Every section is optional and saves on its own. A candidate who only has a
 * UAN fills that and leaves the rest - each section gates only its own check,
 * and none of them gate finishing onboarding.
 */

import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import {
  EDUCATION_LEVELS,
  EducationLevel,
  EducationRecord,
  EmploymentRecord,
  PermanentAddress,
} from '@/types';
import {
  saveDocRequestEducation,
  saveDocRequestEmployment,
  saveDocRequestPermanentAddress,
  saveDocRequestUan,
} from '@/lib/api/doc-requests';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UAN_LENGTH = 12;
const PINCODE_LENGTH = 6;

/** Fields the check cannot run without, so the section can say what is left. */
const REQUIRED_EDUCATION: (keyof EducationRecord)[] = [
  'level',
  'institute',
  'degree',
  'nameAsPerDocument',
  'registrationNumber',
  'issueDate',
];
const REQUIRED_EMPLOYMENT: (keyof EmploymentRecord)[] = [
  'employerName',
  'nameAsPerEmployerRecords',
];
const REQUIRED_ADDRESS: (keyof PermanentAddress)[] = ['line1', 'city', 'state', 'pincode'];

const isFilled = <T,>(record: T, keys: (keyof T)[]): boolean =>
  keys.every(key => String(record[key] ?? '').trim().length > 0);

const digitsOnly = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);

/* -------------------------------- layout -------------------------------- */

function Section({
  title,
  explains,
  children,
}: {
  title: string;
  explains: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-md border border-line bg-surface p-4">
      <header className="space-y-0.5">
        <h3 className="text-[13px] font-bold text-gray-900">{title}</h3>
        <p className="text-[11px] leading-relaxed text-gray-500">{explains}</p>
      </header>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Save button plus a "Saved" marker, shared by every section. */
function SaveRow({
  label,
  disabled,
  saving,
  saved,
  onSave,
  hint,
}: {
  label: string;
  disabled: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <button
        type="button"
        disabled={disabled || saving}
        onClick={onSave}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        {label}
      </button>
      {saved && !saving && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <CheckCircle2 size={13} /> Saved
        </span>
      )}
      {hint && !saved && <span className="text-[11px] text-gray-500">{hint}</span>}
    </div>
  );
}

/* -------------------------------- the tab ------------------------------- */

export interface BackgroundCheckTabProps {
  token: string;
  /** Invalidated after each save so the portal reflects what was stored. */
  queryKey: readonly unknown[];
  uan?: string;
  education?: EducationRecord;
  employment?: EmploymentRecord;
  permanentAddress?: PermanentAddress;
  onError: (message: string) => void;
}

export function BackgroundCheckTab({
  token,
  queryKey,
  uan: savedUan,
  education: savedEducation,
  employment: savedEmployment,
  permanentAddress: savedAddress,
  onError,
}: BackgroundCheckTabProps) {
  const qc = useQueryClient();

  const [uan, setUan] = useState('');
  const [education, setEducation] = useState<EducationRecord>({});
  const [employment, setEmployment] = useState<EmploymentRecord>({});
  const [address, setAddress] = useState<PermanentAddress>({});

  // Seed from whatever was saved before, once it arrives. Guarded on the saved
  // value so a later refetch can't overwrite what is being typed right now.
  useEffect(() => {
    if (savedUan) setUan(savedUan);
  }, [savedUan]);
  useEffect(() => {
    if (savedEducation) setEducation(savedEducation);
  }, [savedEducation]);
  useEffect(() => {
    if (savedEmployment) setEmployment(savedEmployment);
  }, [savedEmployment]);
  useEffect(() => {
    if (savedAddress) setAddress(savedAddress);
  }, [savedAddress]);

  const fail = (fallback: string) => (e: unknown) =>
    onError(e instanceof Error ? e.message : fallback);
  const settled = () => qc.invalidateQueries({ queryKey });

  const saveUan = useMutation({
    mutationFn: () => saveDocRequestUan(token, uan.trim()),
    onError: fail('Could not save your UAN.'),
    onSuccess: settled,
  });
  const saveEducation = useMutation({
    mutationFn: () => saveDocRequestEducation(token, education),
    onError: fail('Could not save your qualification.'),
    onSuccess: settled,
  });
  const saveEmployment = useMutation({
    mutationFn: () => saveDocRequestEmployment(token, employment),
    onError: fail('Could not save your employment details.'),
    onSuccess: settled,
  });
  const saveAddress = useMutation({
    mutationFn: () => saveDocRequestPermanentAddress(token, address),
    onError: fail('Could not save your permanent address.'),
    onSuccess: settled,
  });

  const edu = <K extends keyof EducationRecord>(key: K) => (value: EducationRecord[K]) =>
    setEducation(prev => ({ ...prev, [key]: value }));
  const emp = <K extends keyof EmploymentRecord>(key: K) => (value: EmploymentRecord[K]) =>
    setEmployment(prev => ({ ...prev, [key]: value }));
  const addr = <K extends keyof PermanentAddress>(key: K) => (value: PermanentAddress[K]) =>
    setAddress(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-3">
      <p className="rounded-md border border-line-soft bg-surface-muted px-3 py-2 text-[11px] leading-relaxed text-gray-600">
        All of this is optional and none of it holds up your onboarding. Each section is only
        needed for its own background check, so fill in what applies to you and leave the rest.
      </p>

      <Section
        title="EPFO account"
        explains="Your Universal Account Number, on your payslip or the EPFO member portal. It lets your employment history be confirmed from EPFO records, without anyone contacting your past employers."
      >
        <Field id="uan" label={`UAN (${UAN_LENGTH} digits)`}>
          <Input
            id="uan"
            inputMode="numeric"
            value={uan}
            onChange={e => setUan(digitsOnly(e.target.value, UAN_LENGTH))}
            placeholder="Universal Account Number"
          />
        </Field>
        <SaveRow
          label="Save UAN"
          disabled={uan.length !== UAN_LENGTH}
          saving={saveUan.isPending}
          saved={Boolean(savedUan) && savedUan === uan}
          onSave={() => saveUan.mutate()}
          hint={uan.length > 0 && uan.length !== UAN_LENGTH ? `${UAN_LENGTH} digits needed` : undefined}
        />
      </Section>

      <Section
        title="Your highest qualification"
        explains="Checked with the institute directly, so these need to match your certificate exactly. Upload the certificate itself under Documents."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="edu-level" label="Level of education">
            <select
              id="edu-level"
              value={education.level ?? ''}
              onChange={e => edu('level')((e.target.value || undefined) as EducationLevel)}
              className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <option value="">Select…</option>
              {EDUCATION_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="edu-degree" label="Degree or course">
            <Input
              id="edu-degree"
              value={education.degree ?? ''}
              onChange={e => edu('degree')(e.target.value)}
              placeholder="e.g. MA Economics"
            />
          </Field>
          <Field id="edu-institute" label="Name of institute">
            <Input
              id="edu-institute"
              value={education.institute ?? ''}
              onChange={e => edu('institute')(e.target.value)}
              placeholder="e.g. St. Xavier's College"
            />
          </Field>
          <Field id="edu-board" label="Board or university">
            <Input
              id="edu-board"
              value={education.boardUniversity ?? ''}
              onChange={e => edu('boardUniversity')(e.target.value)}
              placeholder="e.g. University of Mumbai"
            />
          </Field>
          <Field id="edu-name" label="Name as printed on the certificate">
            <Input
              id="edu-name"
              value={education.nameAsPerDocument ?? ''}
              onChange={e => edu('nameAsPerDocument')(e.target.value)}
              placeholder="Exactly as it appears"
            />
          </Field>
          <Field id="edu-reg" label="Registration or roll number">
            <Input
              id="edu-reg"
              value={education.registrationNumber ?? ''}
              onChange={e => edu('registrationNumber')(e.target.value)}
              placeholder="As printed on the certificate"
            />
          </Field>
          <Field id="edu-issued" label="Date of issue">
            <Input
              id="edu-issued"
              type="date"
              value={education.issueDate ?? ''}
              onChange={e => edu('issueDate')(e.target.value)}
            />
          </Field>
          <Field id="edu-year" label="Year of passing">
            <Input
              id="edu-year"
              inputMode="numeric"
              value={education.yearOfPassing ?? ''}
              onChange={e => edu('yearOfPassing')(digitsOnly(e.target.value, 4))}
              placeholder="e.g. 2019"
            />
          </Field>
          <Field id="edu-field" label="Field of study">
            <Input
              id="edu-field"
              value={education.fieldOfStudy ?? ''}
              onChange={e => edu('fieldOfStudy')(e.target.value)}
              placeholder="e.g. Economics"
            />
          </Field>
          <Field id="edu-grade" label="Grade or percentage">
            <Input
              id="edu-grade"
              value={education.grade ?? ''}
              onChange={e => edu('grade')(e.target.value)}
              placeholder="e.g. First class"
            />
          </Field>
        </div>
        <SaveRow
          label="Save qualification"
          disabled={!isFilled(education, REQUIRED_EDUCATION)}
          saving={saveEducation.isPending}
          saved={Boolean(savedEducation?.registrationNumber)}
          onSave={() => saveEducation.mutate()}
          hint="Level, degree, institute, name, registration number and issue date are needed."
        />
      </Section>

      <Section
        title="Your most recent past employer"
        explains="Confirmed with that employer, so an email that still works matters more than a complete address. This check also needs proof: upload an experience letter, offer letter or salary slip under Documents, or it cannot run."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="emp-employer" label="Employer name">
            <Input
              id="emp-employer"
              value={employment.employerName ?? ''}
              onChange={e => emp('employerName')(e.target.value)}
              placeholder="e.g. Acme Technologies Pvt Ltd"
            />
          </Field>
          <Field id="emp-name" label="Your name on their records">
            <Input
              id="emp-name"
              value={employment.nameAsPerEmployerRecords ?? ''}
              onChange={e => emp('nameAsPerEmployerRecords')(e.target.value)}
              placeholder="If different from your legal name"
            />
          </Field>
          <Field id="emp-id" label="Employee ID">
            <Input
              id="emp-id"
              value={employment.employeeId ?? ''}
              onChange={e => emp('employeeId')(e.target.value)}
              placeholder="As on your payslip"
            />
          </Field>
          <Field id="emp-designation" label="Last designation">
            <Input
              id="emp-designation"
              value={employment.designation ?? ''}
              onChange={e => emp('designation')(e.target.value)}
              placeholder="e.g. Senior Analyst"
            />
          </Field>
          <Field id="emp-joined" label="Joining date">
            <Input
              id="emp-joined"
              type="date"
              value={employment.joiningDate ?? ''}
              onChange={e => emp('joiningDate')(e.target.value)}
            />
          </Field>
          <Field id="emp-left" label="Last working day">
            <Input
              id="emp-left"
              type="date"
              value={employment.lastWorkingDate ?? ''}
              onChange={e => emp('lastWorkingDate')(e.target.value)}
            />
          </Field>
          <Field id="emp-city" label="Work location">
            <Input
              id="emp-city"
              value={employment.city ?? ''}
              onChange={e => emp('city')(e.target.value)}
              placeholder="City you worked in"
            />
          </Field>
          <Field id="emp-mgr" label="Reporting manager's name">
            <Input
              id="emp-mgr"
              value={employment.managerName ?? ''}
              onChange={e => emp('managerName')(e.target.value)}
              placeholder="Who you reported to"
            />
          </Field>
          <Field id="emp-mgr-email" label="Manager's email">
            <Input
              id="emp-mgr-email"
              type="email"
              value={employment.managerEmail ?? ''}
              onChange={e => emp('managerEmail')(e.target.value)}
              placeholder="name@company.com"
            />
          </Field>
          <Field id="emp-mgr-phone" label="Manager's phone">
            <Input
              id="emp-mgr-phone"
              inputMode="numeric"
              value={employment.managerPhone ?? ''}
              onChange={e => emp('managerPhone')(digitsOnly(e.target.value, 10))}
              placeholder="10 digits"
            />
          </Field>
          <Field id="emp-hr" label="HR contact's name">
            <Input
              id="emp-hr"
              value={employment.hrName ?? ''}
              onChange={e => emp('hrName')(e.target.value)}
              placeholder="If you have one"
            />
          </Field>
          <Field id="emp-hr-email" label="HR email">
            <Input
              id="emp-hr-email"
              type="email"
              value={employment.hrEmail ?? ''}
              onChange={e => emp('hrEmail')(e.target.value)}
              placeholder="hr@company.com"
            />
          </Field>
          <Field id="emp-hr-phone" label="HR phone">
            <Input
              id="emp-hr-phone"
              inputMode="numeric"
              value={employment.hrPhone ?? ''}
              onChange={e => emp('hrPhone')(digitsOnly(e.target.value, 10))}
              placeholder="10 digits"
            />
          </Field>
        </div>
        <SaveRow
          label="Save employment"
          disabled={!isFilled(employment, REQUIRED_EMPLOYMENT)}
          saving={saveEmployment.isPending}
          saved={Boolean(savedEmployment?.employerName)}
          onSave={() => saveEmployment.mutate()}
          hint="Employer name and your name on their records are needed."
        />
      </Section>

      <Section
        title="Permanent address"
        explains="Where you permanently live, which may not be where you live now. Someone may visit it, so a landmark helps them find it."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="addr-1" label="House number and street">
            <Input
              id="addr-1"
              value={address.line1 ?? ''}
              onChange={e => addr('line1')(e.target.value)}
              placeholder="e.g. 12, MG Road"
            />
          </Field>
          <Field id="addr-2" label="Apartment, building or floor">
            <Input
              id="addr-2"
              value={address.line2 ?? ''}
              onChange={e => addr('line2')(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field id="addr-locality" label="Locality or area">
            <Input
              id="addr-locality"
              value={address.locality ?? ''}
              onChange={e => addr('locality')(e.target.value)}
              placeholder="e.g. Andheri East"
            />
          </Field>
          <Field id="addr-landmark" label="Landmark">
            <Input
              id="addr-landmark"
              value={address.landmark ?? ''}
              onChange={e => addr('landmark')(e.target.value)}
              placeholder="e.g. opposite the post office"
            />
          </Field>
          <Field id="addr-city" label="Village, town or city">
            <Input
              id="addr-city"
              value={address.city ?? ''}
              onChange={e => addr('city')(e.target.value)}
              placeholder="e.g. Pune"
            />
          </Field>
          <Field id="addr-district" label="District">
            <Input
              id="addr-district"
              value={address.district ?? ''}
              onChange={e => addr('district')(e.target.value)}
              placeholder="e.g. Pune"
            />
          </Field>
          <Field id="addr-state" label="State">
            <Input
              id="addr-state"
              value={address.state ?? ''}
              onChange={e => addr('state')(e.target.value)}
              placeholder="e.g. Maharashtra"
            />
          </Field>
          <Field id="addr-pin" label={`Pincode (${PINCODE_LENGTH} digits)`}>
            <Input
              id="addr-pin"
              inputMode="numeric"
              value={address.pincode ?? ''}
              onChange={e => addr('pincode')(digitsOnly(e.target.value, PINCODE_LENGTH))}
              placeholder="e.g. 411001"
            />
          </Field>
        </div>
        <SaveRow
          label="Save address"
          disabled={
            !isFilled(address, REQUIRED_ADDRESS) ||
            (address.pincode ?? '').length !== PINCODE_LENGTH
          }
          saving={saveAddress.isPending}
          saved={Boolean(savedAddress?.pincode)}
          onSave={() => saveAddress.mutate()}
          hint="Street, town, state and a 6-digit pincode are needed."
        />
      </Section>
    </div>
  );
}
