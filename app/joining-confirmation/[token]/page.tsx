'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format, parse, isValid } from 'date-fns';
import { CheckCircle2, AlertTriangle, Loader2, CalendarCheck, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { getJoiningConfirmation, submitJoiningConfirmationResponse } from '@/lib/api/joining-confirmation-public';
import type { JoiningConfirmation } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';

type Phase = 'loading' | 'ready' | 'expired' | 'error' | 'done';

const PLANTS: { value: NonNullable<JoiningConfirmation['plantChoice']>; label: string; src: string }[] = [
  { value: 'Bamboo', label: 'Bamboo Plant', src: '/plant-bamboo.jpg' },
  { value: 'Jade', label: 'Jade Plant', src: '/plant-jade.jpg' },
  { value: 'Money', label: 'Money Plant', src: '/plant-money.jpg' },
  { value: 'Red China', label: 'Red China Plant', src: '/plant-red-china.jpg' },
];

function formatDate(value?: string): string {
  if (!value) return '';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d = parse(m[1], 'yyyy-MM-dd', new Date());
    if (isValid(d)) return format(d, 'EEEE, do MMMM yyyy');
  }
  return value;
}

export default function JoiningConfirmationPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';

  const [record, setRecord] = useState<JoiningConfirmation | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');

  const [canJoin, setCanJoin] = useState<'yes' | 'no' | ''>('');
  const [suggestedDate, setSuggestedDate] = useState('');
  const [dish, setDish] = useState<'Pizza' | 'Pasta' | ''>('');
  const [mealPref, setMealPref] = useState<'Vegetarian' | 'Non-Vegetarian' | ''>('');
  const [notes, setNotes] = useState('');
  const [plant, setPlant] = useState<JoiningConfirmation['plantChoice'] | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    getJoiningConfirmation(token)
      .then(r => {
        setRecord(r);
        const expired = new Date(r.expiresAt).getTime() < Date.now();
        setPhase(r.respondedAt ? 'done' : expired ? 'expired' : 'ready');
      })
      .catch(() => setPhase('error'));
  }, [token]);

  const canSubmit =
    (canJoin === 'yes' || (canJoin === 'no' && Boolean(suggestedDate))) && Boolean(dish) && Boolean(mealPref) && Boolean(plant);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await submitJoiningConfirmationResponse(token, {
        canJoin: canJoin === 'yes',
        suggestedDate: canJoin === 'no' ? suggestedDate : undefined,
        meal: { dish: dish as 'Pizza' | 'Pasta', preference: mealPref as 'Vegetarian' | 'Non-Vegetarian', notes: notes.trim() || undefined },
        plantChoice: plant as JoiningConfirmation['plantChoice'],
        respondedAt: new Date().toISOString(),
      });
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your response — the link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      {phase === 'loading' && (
        <p className="flex items-center gap-2 py-10 text-[13px] text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </p>
      )}

      {phase === 'error' && (
        <Notice
          icon={<AlertTriangle className="text-amber-500" size={28} />}
          title="This link is invalid"
          body="Please ask HR for a fresh confirmation link."
        />
      )}

      {phase === 'expired' && (
        <Notice
          icon={<AlertTriangle className="text-amber-500" size={28} />}
          title="This link has expired"
          body="Please ask HR to resend your joining-date confirmation."
        />
      )}

      {phase === 'done' && (
        <Notice
          icon={<CheckCircle2 className="text-emerald-500" size={30} />}
          title="Thank you!"
          body="We've got your preferences. You can close this page — see you soon!"
        />
      )}

      {phase === 'ready' && record && (
        <div className="space-y-7">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Confirm your joining date</h1>
            <p className="mt-1 text-[13px] text-gray-500">For {record.candidateName}</p>
          </div>

          {/* 1. Joining date */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
              <CalendarCheck size={18} className="shrink-0 text-accent-600" />
              <p className="text-[13.5px] font-semibold text-gray-800">
                We've pencilled you in for <span className="text-accent-700">{formatDate(record.proposedDate)}</span>
              </p>
            </div>
            <Label className="text-[12.5px] font-semibold text-gray-700">Can you join on this date?</Label>
            <RadioGroup value={canJoin} onValueChange={v => setCanJoin(v as 'yes' | 'no')} className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <RadioGroupItem value="yes" /> Yes, I can join
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <RadioGroupItem value="no" /> No, I need a different date
              </label>
            </RadioGroup>
            {canJoin === 'no' && (
              <div>
                <Label className="mb-1.5 block text-[12px] font-semibold text-gray-500">
                  When can you join instead?
                </Label>
                <DatePicker value={suggestedDate} onChange={setSuggestedDate} className="w-[220px]" />
              </div>
            )}
          </section>

          {/* 2. Meal preference */}
          <section className="space-y-3 border-t border-[#ECEDF0] pt-6">
            <h2 className="text-[13px] font-bold text-gray-900">🍕 Your first meal is on us!</h2>
            <div>
              <Label className="mb-1.5 block text-[12.5px] font-semibold text-gray-700">Pizza or Pasta?</Label>
              <RadioGroup value={dish} onValueChange={v => setDish(v as 'Pizza' | 'Pasta')} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                  <RadioGroupItem value="Pizza" /> Pizza
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                  <RadioGroupItem value="Pasta" /> Pasta
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-1.5 block text-[12.5px] font-semibold text-gray-700">
                Vegetarian or Non-Vegetarian?
              </Label>
              <RadioGroup
                value={mealPref}
                onValueChange={v => setMealPref(v as 'Vegetarian' | 'Non-Vegetarian')}
                className="flex gap-4"
              >
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                  <RadioGroupItem value="Vegetarian" /> Vegetarian
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                  <RadioGroupItem value="Non-Vegetarian" /> Non-Vegetarian
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-1.5 block text-[12px] font-semibold text-gray-500">
                Any dietary restrictions or allergies? (optional)
              </Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. nut allergy" />
            </div>
          </section>

          {/* 3. Plant choice */}
          <section className="space-y-3 border-t border-[#ECEDF0] pt-6">
            <h2 className="text-[13px] font-bold text-gray-900">🌱 Choose your welcome plant!</h2>
            <RadioGroup value={plant} onValueChange={v => setPlant(v as JoiningConfirmation['plantChoice'])}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PLANTS.map(p => {
                  const selected = plant === p.value;
                  return (
                    <label
                      key={p.value}
                      className={`relative cursor-pointer overflow-hidden rounded-xl border-2 transition ${
                        selected ? 'border-accent-500' : 'border-[#E4E6EA] hover:border-accent-300'
                      }`}
                    >
                      <RadioGroupItem value={p.value} className="sr-only" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt={p.label} className="aspect-square w-full object-cover" />
                      <div
                        className={`flex items-center justify-center gap-1 px-1.5 py-1.5 text-[11px] font-semibold ${
                          selected ? 'bg-accent-500 text-white' : 'bg-[#F7F8FA] text-gray-700'
                        }`}
                      >
                        {selected && <Check size={11} />} {p.label}
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </section>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      )}
    </Shell>
  );
}

/* ------------------------------ chrome ------------------------------ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F1F3F5] px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-5 flex items-center gap-2">
          <Logo size={26} />
          <span className="text-sm font-bold text-gray-800">{BRAND.name}</span>
        </div>
        <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5 shadow-sm sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function Notice({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {icon}
      <p className="text-base font-bold text-gray-900">{title}</p>
      <p className="max-w-sm text-[12.5px] text-gray-500">{body}</p>
    </div>
  );
}
