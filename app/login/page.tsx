'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { useAuth } from '@/store/auth-store';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → skip the login screen.
  useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    if (result.ok) {
      router.replace('/');
    } else {
      setError(result.error ?? 'Could not sign in.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-sunken flex flex-col">
      {/* Brand strip */}
      <div className="h-1.5 bg-gradient-to-r from-accent-500 via-accent-600 to-accent-800" />

      <div className="grid flex-1 lg:grid-cols-2">
        {/* LEFT: sign-in form */}
        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            {/* Brand */}
            <div className="flex flex-col items-center text-center mb-7">
              <Logo size={44} />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight font-display mt-3">
                {BRAND.name}
              </h1>
              <p className="text-[11px] text-gray-500 uppercase font-mono font-semibold tracking-wider">
                HR Operating System
              </p>
            </div>

            {/* Card */}
            <Card className="border-line bg-surface">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">Sign in</CardTitle>
                <p className="text-xs text-gray-500">Authorized HR team members only.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="login-email" className="text-[11px] font-semibold text-gray-600">
                      Work email
                    </Label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <Input
                        id="login-email"
                        type="email"
                        autoFocus
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@optiminastic.com"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="login-password" className="text-[11px] font-semibold text-gray-600">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <Input
                        id="login-password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowPw(s => !s)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Signing in…
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-[11px] text-gray-500 mt-5">
              Trouble signing in? Contact your {BRAND.short} administrator.
            </p>
          </div>
        </div>

        {/* RIGHT: brand panel. Decorative, so it is aria-hidden and carries an
            empty alt -- a screen reader gains nothing from it. `priority` since
            it is above the fold on the first screen users ever see. */}
        <div
          aria-hidden="true"
          className="relative hidden overflow-hidden border-l border-line bg-surface lg:block"
        >
          <Image
            src="/login-hero.png"
            alt=""
            fill
            sizes="50vw"
            priority
            className="object-cover"
          />
          {/* No colour scrim: the photograph is high-key, almost white at the
              bottom, so a tinted overlay muddied it and the type reads fine as
              dark text directly on the image. */}
          <div className="absolute inset-x-0 bottom-0 p-10">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent-600">
              {BRAND.name}
            </p>
            <p className="mt-2 max-w-sm font-display text-2xl font-bold leading-tight tracking-tight text-gray-900">
              Everything from first application to final handover, in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
