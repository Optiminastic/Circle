'use client';

/**
 * Public password-setup page, opened from an invite email.
 *
 * Unauthenticated by design: the unguessable, expiring token in the URL is the
 * credential, exactly like the joining-confirmation and sign-offer portals. The
 * email is fetched from the token and shown read-only -- an invitee cannot
 * retarget their invite at another address.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  UserRound,
} from 'lucide-react';

import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { apiBase } from '@/lib/api-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PASSWORD_MIN = 8;

type Phase = 'loading' | 'ready' | 'invalid' | 'done';

export default function SetPasswordPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setPhase('invalid');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase()}/api/auth/setup/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('invalid');
        const data = await res.json();
        if (cancelled) return;
        setEmail(data.email ?? '');
        setName(data.name ?? '');
        setTitle(data.title ?? '');
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const problem =
    password.length > 0 && password.length < PASSWORD_MIN
      ? `Use at least ${PASSWORD_MIN} characters.`
      : confirm.length > 0 && confirm !== password
        ? 'Those two passwords do not match.'
        : '';

  const canSubmit =
    name.trim().length > 0 && password.length >= PASSWORD_MIN && confirm === password && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${apiBase()}/api/auth/setup/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, name: name.trim(), title: title.trim() }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Could not set your password.');
      }
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="h-1.5 bg-gradient-to-r from-accent-500 via-accent-600 to-accent-800" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center text-center">
            <Logo size={44} />
            <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-gray-900">
              {BRAND.name}
            </h1>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              HR Operating System
            </p>
          </div>

          <div className="rounded-md border border-line bg-surface p-6">
            {phase === 'loading' && (
              <p className="flex items-center justify-center gap-2 py-6 text-[13px] text-gray-500">
                <Loader2 className="animate-spin" size={16} /> Checking your invitation…
              </p>
            )}

            {phase === 'invalid' && (
              <div className="space-y-2 py-2 text-center">
                <AlertTriangle className="mx-auto text-amber-600" size={22} />
                <p className="text-[13px] font-semibold text-gray-900">This link is no longer valid</p>
                <p className="text-[12.5px] text-gray-500">
                  Invitations expire after 72 hours, and each one can only be used once. Ask your
                  administrator to send a new invite.
                </p>
              </div>
            )}

            {phase === 'done' && (
              <div className="space-y-3 py-2 text-center">
                <CheckCircle2 className="mx-auto text-accent-600" size={22} />
                <p className="text-[13px] font-semibold text-gray-900">Your password is set</p>
                <p className="text-[12.5px] text-gray-500">You can sign in with {email} now.</p>
                <Button className="w-full" onClick={() => router.push('/login')}>
                  Go to sign in
                </Button>
              </div>
            )}

            {phase === 'ready' && (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Set up your profile</h2>
                  <p className="mt-1 text-[12.5px] text-gray-500">
                    Your name and title appear on the emails you send, so teammates and
                    candidates know who they are hearing from.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-600">Your sign-in email</Label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    {/* Read-only: the address is bound to the invite token. */}
                    <Input value={email} readOnly disabled className="pl-9" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sp-name" className="text-[11px] font-semibold text-gray-600">
                    Full name
                  </Label>
                  <div className="relative">
                    <UserRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      id="sp-name"
                      autoFocus
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Aditi Rao"
                      maxLength={120}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sp-title" className="text-[11px] font-semibold text-gray-600">
                    Job title <span className="font-normal text-gray-400">(optional)</span>
                  </Label>
                  <div className="relative">
                    <BriefcaseBusiness
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      id="sp-title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="HR Business Partner"
                      maxLength={120}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sp-password" className="text-[11px] font-semibold text-gray-600">
                    New password
                  </Label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      id="sp-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">At least {PASSWORD_MIN} characters.</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sp-confirm" className="text-[11px] font-semibold text-gray-600">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      id="sp-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {(problem || error) && (
                  <p className="rounded-sm border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-600">
                    {error || problem}
                  </p>
                )}

                <Button type="submit" disabled={!canSubmit} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Saving…
                    </>
                  ) : (
                    'Set password'
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
