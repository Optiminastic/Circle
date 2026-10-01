'use client';

/**
 * The claims background verification checks.
 *
 * Everything here is something the candidate states about themselves that a
 * third party then confirms: the institute confirms the degree, the employer
 * confirms the employment, a field agent visits the address, EPFO answers for
 * the UAN. None of it is taken on trust, which is why the candidate can write
 * it all and why overstating anything is self-defeating.
 *
 * Every section is optional and saves on its own. Each gates only its own
 * check, and none of them gate finishing onboarding, so a candidate with just a
 * UAN fills that and leaves the rest. Whatever is left blank HR can fill in
 * when they run the checks.
 *
 * The fields themselves come from `lib/bgv-claim-fields`, shared with HR's
 * dialog so the two screens ask for exactly the same things.
 */

import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import {
  CLAIM_SECTIONS,
  isSectionComplete,
  toClaimValue,
  type ClaimSection,
  type ClaimValue,
} from '@/lib/bgv-claim-fields';
import { ClaimFields, MissingNote } from '@/components/bgv/ClaimFields';
import {
  saveDocRequestEducation,
  saveDocRequestIsFresher,
  saveDocRequestEmployment,
  saveDocRequestPermanentAddress,
  saveDocRequestUan,
} from '@/lib/api/doc-requests';
import { EducationRecord, EmploymentRecord, PermanentAddress } from '@/types';

export interface BackgroundCheckTabProps {
  token: string;
  /** Invalidated after each save so the portal reflects what was stored. */
  queryKey: readonly unknown[];
  uan?: string;
  /** Declared by the candidate: they have never been employed. */
  isFresher?: boolean;
  education?: EducationRecord;
  employment?: EmploymentRecord;
  permanentAddress?: PermanentAddress;
  onError: (message: string) => void;
}

export function BackgroundCheckTab({
  token,
  queryKey,
  uan: savedUan,
  isFresher: savedIsFresher,
  education: savedEducation,
  employment: savedEmployment,
  permanentAddress: savedAddress,
  onError,
}: BackgroundCheckTabProps) {
  const qc = useQueryClient();
  const [fresher, setFresher] = useState(false);
  const [values, setValues] = useState<Record<ClaimSection, ClaimValue>>({
    uan: {},
    education: {},
    employment: {},
    permanentAddress: {},
  });

  // Seed each section from whatever was saved before, once it arrives. Guarded
  // on the saved value so a later refetch can't overwrite what is being typed.
  const seed = (section: ClaimSection, saved: object | undefined) =>
    setValues(prev => ({ ...prev, [section]: toClaimValue(saved) }));
  useEffect(() => {
    if (savedUan) seed('uan', { uan: savedUan });
  }, [savedUan]);
  useEffect(() => {
    if (savedIsFresher !== undefined) setFresher(savedIsFresher);
  }, [savedIsFresher]);
  useEffect(() => {
    if (savedEducation) seed('education', savedEducation);
  }, [savedEducation]);
  useEffect(() => {
    if (savedEmployment) seed('employment', savedEmployment);
  }, [savedEmployment]);
  useEffect(() => {
    if (savedAddress) seed('permanentAddress', savedAddress);
  }, [savedAddress]);

  const fail = (fallback: string) => (e: unknown) =>
    onError(e instanceof Error ? e.message : fallback);
  const settled = () => qc.invalidateQueries({ queryKey });

  const savers: Record<ClaimSection, () => Promise<unknown>> = {
    uan: () => saveDocRequestUan(token, String(values.uan.uan ?? '').trim()),
    education: () => saveDocRequestEducation(token, values.education as EducationRecord),
    employment: () => saveDocRequestEmployment(token, values.employment as EmploymentRecord),
    permanentAddress: () =>
      saveDocRequestPermanentAddress(token, values.permanentAddress as PermanentAddress),
  };
  const savedAlready: Record<ClaimSection, boolean> = {
    uan: Boolean(savedUan),
    education: Boolean(savedEducation?.registrationNumber),
    employment: Boolean(savedEmployment?.employerName),
    permanentAddress: Boolean(savedAddress?.pincode),
  };

  const declareFresher = useMutation({
    mutationFn: (next: boolean) => saveDocRequestIsFresher(token, next),
    onError: fail('Could not save your answer.'),
    onSuccess: settled,
  });

  // A first job means no EPFO number and no previous employer, so asking for
  // either is asking for something that cannot exist. Both sections come out
  // rather than being shown empty with a required marker on them.
  const order: ClaimSection[] = fresher
    ? ['education', 'permanentAddress']
    : ['uan', 'education', 'employment', 'permanentAddress'];

  return (
    <div className="space-y-3">
      <p className="rounded-md border border-line-soft bg-surface-muted px-3 py-2 text-[11px] leading-relaxed text-gray-600">
        All of this is optional and none of it holds up your onboarding. Each section is only
        needed for its own background check, so fill in what applies to you and leave the rest.
      </p>

      {/* Asked first, because the answer decides whether two of the sections
          below are shown at all. */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5">
        <input
          type="checkbox"
          checked={fresher}
          onChange={e => {
            setFresher(e.target.checked);
            declareFresher.mutate(e.target.checked);
          }}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent-600"
        />
        <span className="text-[11.5px] leading-snug text-gray-700">
          This is my first job — I have not been employed before.
          <span className="mt-0.5 block text-[11px] text-gray-500">
            Tick this and we will stop asking for your EPFO number and previous employer. Both
            are created by your first employer, so you will not have either yet.
          </span>
        </span>
        {declareFresher.isPending && <Loader2 size={13} className="mt-0.5 animate-spin text-gray-400" />}
      </label>

      {order.map(section => (
        <Section
          key={section}
          section={section}
          value={values[section]}
          onChange={next => setValues(prev => ({ ...prev, [section]: next }))}
          save={savers[section]}
          saved={savedAlready[section]}
          onError={fail(`Could not save your ${CLAIM_SECTIONS[section].title.toLowerCase()}.`)}
          onSaved={settled}
        />
      ))}
    </div>
  );
}

function Section({
  section,
  value,
  onChange,
  save,
  saved,
  onError,
  onSaved,
}: {
  section: ClaimSection;
  value: ClaimValue;
  onChange: (next: ClaimValue) => void;
  save: () => Promise<unknown>;
  saved: boolean;
  onError: (e: unknown) => void;
  onSaved: () => void;
}) {
  const def = CLAIM_SECTIONS[section];
  const mutation = useMutation({ mutationFn: save, onError, onSuccess: onSaved });
  const complete = isSectionComplete(section, value);

  return (
    <section className="space-y-3 rounded-md border border-line bg-surface p-4">
      <header className="space-y-0.5">
        <h3 className="text-[13px] font-bold text-gray-900">{def.title}</h3>
        <p className="text-[11px] leading-relaxed text-gray-500">{def.explains}</p>
      </header>

      <ClaimFields section={section} value={value} onChange={onChange} idPrefix="portal" />

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          disabled={!complete || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save {def.title.toLowerCase()}
        </button>
        {saved && !mutation.isPending && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 size={13} /> Saved
          </span>
        )}
        {!complete && <MissingNote section={section} value={value} />}
      </div>
    </section>
  );
}
