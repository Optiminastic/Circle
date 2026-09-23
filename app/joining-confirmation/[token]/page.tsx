'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format, parse, isValid } from 'date-fns';
import { CheckCircle2, AlertTriangle, Loader2, CalendarCheck, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import {
  getJoiningConfirmation,
  submitJoiningConfirmationResponse,
  uploadJoiningPhoto,
} from '@/lib/api/joining-confirmation-public';
import type { JoiningConfirmation } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Phase = 'loading' | 'ready' | 'expired' | 'error' | 'done';

const PLANTS: { value: NonNullable<JoiningConfirmation['plantChoice']>; label: string; src: string }[] = [
  { value: 'Bamboo', label: 'Bamboo Plant', src: '/plant-bamboo.jpg' },
  { value: 'Jade', label: 'Jade Plant', src: '/plant-jade.jpg' },
  { value: 'Money', label: 'Money Plant', src: '/plant-money.jpg' },
  { value: 'Red China', label: 'Red China Plant', src: '/plant-red-china.jpg' },
];

/** Date broken into parts for the day-block panel. Null when unparseable. */
function dateParts(value?: string): { weekday: string; day: string; month: string; year: string } | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = parse(m[1], 'yyyy-MM-dd', new Date());
  if (!isValid(d)) return null;
  return {
    weekday: format(d, 'EEE'),
    day: format(d, 'd'),
    month: format(d, 'MMMM'),
    year: format(d, 'yyyy'),
  };
}

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

  const [dish, setDish] = useState<'Pizza' | 'Pasta' | ''>('');
  const [mealPref, setMealPref] = useState<'Vegetarian' | 'Non-Vegetarian' | ''>('');
  const [notes, setNotes] = useState('');
  const [plant, setPlant] = useState<JoiningConfirmation['plantChoice'] | ''>('');
  const [submitting, setSubmitting] = useState(false);
  // Introduction + welcome photo. The photo uploads on pick (its own endpoint),
  // so `photoName` reflects what the server actually stored, not what was chosen.
  const [introduction, setIntroduction] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

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
    Boolean(dish) && Boolean(mealPref) && Boolean(plant);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await submitJoiningConfirmationResponse(token, {
        meal: { dish: dish as 'Pizza' | 'Pasta', preference: mealPref as 'Vegetarian' | 'Non-Vegetarian', notes: notes.trim() || undefined },
        plantChoice: plant as JoiningConfirmation['plantChoice'],
        introduction: introduction.trim() || undefined,
        respondedAt: new Date().toISOString(),
      });
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your response — the link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    setPhotoBusy(true);
    try {
      const saved = await uploadJoiningPhoto(token, file);
      setPhotoName(saved.fileName);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not upload your photo.');
    } finally {
      setPhotoBusy(false);
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
            <h1 className="text-lg font-bold text-gray-900">Let&apos;s lock in your first day</h1>
            <p className="mt-1 text-[13px] text-gray-500">For {record.candidateName}</p>
          </div>

          {/* 1. Joining date */}
          <section className="space-y-3">
            {/* Someone's first day is a milestone, so give the date real
                presence: a dark forest panel with the lime highlight, which is
                the one surface in the product dark enough to carry it. */}
            {(() => {
              const parts = dateParts(record.proposedDate);
              if (!parts) {
                return (
                  <div className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-4 py-3">
                    <CalendarCheck size={18} className="shrink-0 text-accent-600" />
                    <p className="text-[13.5px] font-semibold text-gray-800">
                      We&apos;ve pencilled you in for {formatDate(record.proposedDate)}
                    </p>
                  </div>
                );
              }
              return (
                <div className="flex items-stretch gap-4 overflow-hidden rounded-md bg-accent-800 p-4 text-white">
                  <div
                    aria-hidden="true"
                    className="flex shrink-0 flex-col items-center justify-center rounded-sm bg-highlight px-3 py-2 text-highlight-foreground"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                      {parts.weekday}
                    </span>
                    <span className="font-display text-3xl font-bold leading-none tracking-tight tabular-nums">
                      {parts.day}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col justify-center">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-highlight">
                      Your first day
                    </p>
                    <p className="font-display text-lg font-bold leading-tight tracking-tight">
                      {parts.month} {parts.year}
                    </p>
                    <p className="mt-0.5 text-[12px] text-white/70">
                      {formatDate(record.proposedDate)} &mdash; the countdown starts now.
                    </p>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* 2. Introduction + welcome photo */}
          <section className="space-y-3 border-t border-line-soft pt-6">
            <h2 className="text-[13px] font-bold text-gray-900">👋 Introduce yourself to the team</h2>
            <p className="text-[12.5px] leading-relaxed text-gray-600">
              Share a photo and a few lines about yourself. We&apos;ll pass it on to the team so they
              know a little about you before day one. Keep it simple and fun &mdash; there are no rules.
            </p>
            <ul className="ml-4 list-disc space-y-0.5 text-[12px] text-gray-500">
              <li>Hobbies or interests</li>
              <li>A fun fact about you</li>
              <li>Something you enjoy outside work</li>
              <li>A favourite film, show, food or place you&apos;d love to share</li>
            </ul>

            <div>
              <Label className="mb-1.5 block text-[12.5px] font-semibold text-gray-700">Your photo</Label>
              <input
                type="file"
                accept="image/*"
                disabled={photoBusy}
                onChange={e => pickPhoto(e.target.files?.[0])}
                className="block w-full text-[12.5px] text-gray-600 file:mr-3 file:rounded-sm file:border file:border-line file:bg-surface-sunken file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-gray-700 hover:file:bg-surface-hover"
              />
              {photoBusy && <p className="mt-1 text-[11.5px] text-gray-500">Uploading…</p>}
              {photoName && !photoBusy && (
                <p className="mt-1 flex items-center gap-1 text-[11.5px] text-accent-700">
                  <Check size={12} /> {photoName}
                </p>
              )}
              {photoError && <p className="mt-1 text-[11.5px] text-red-600">{photoError}</p>}
            </div>

            <div>
              <Label
                htmlFor="jc-intro"
                className="mb-1.5 block text-[12.5px] font-semibold text-gray-700"
              >
                A little about you
              </Label>
              <Textarea
                id="jc-intro"
                value={introduction}
                onChange={e => setIntroduction(e.target.value)}
                rows={5}
                maxLength={1500}
                placeholder="I'm a filter-coffee obsessive who once cycled from Pune to Goa…"
              />
              <p className="mt-1 text-right text-[11px] text-gray-400 tabular-nums">
                {introduction.length}/1500
              </p>
            </div>
          </section>

          {/* 3. Meal preference */}
          <section className="space-y-3 border-t border-line-soft pt-6">
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
          <section className="space-y-3 border-t border-line-soft pt-6">
            <h2 className="text-[13px] font-bold text-gray-900">🌱 Choose your welcome plant!</h2>
            <RadioGroup value={plant} onValueChange={v => setPlant(v as JoiningConfirmation['plantChoice'])}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PLANTS.map(p => {
                  const selected = plant === p.value;
                  return (
                    <label
                      key={p.value}
                      className={`relative cursor-pointer overflow-hidden rounded-md border-2 transition ${
                        selected ? 'border-accent-500' : 'border-line hover:border-accent-300'
                      }`}
                    >
                      <RadioGroupItem value={p.value} className="sr-only" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt={p.label} className="aspect-square w-full object-cover" />
                      <div
                        className={`flex items-center justify-center gap-1 px-1.5 py-1.5 text-[11px] font-semibold ${
                          selected ? 'bg-accent-500 text-white' : 'bg-surface-muted text-gray-700'
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
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
    <div className="min-h-screen bg-surface-sunken px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-5 flex items-center gap-2">
          <Logo size={26} />
          <span className="text-sm font-bold text-gray-800">{BRAND.name}</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-6">{children}</div>
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
