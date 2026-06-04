'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/store/auth-store';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F6F6F7] flex flex-col">
      {/* Brand strip */}
      <div className="h-1.5 bg-gradient-to-r from-accent-500 via-accent-600 to-accent-800" />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-7">
            <Logo size={44} />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight font-display mt-3">
              Curcle
            </h1>
            <p className="text-[11px] text-gray-400 uppercase font-mono font-semibold tracking-wider">
              HR Operating System
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-[#EAEAEC] rounded-2xl shadow-2xs p-6 sm:p-7">
            <h2 className="text-base font-bold text-gray-900">Sign in</h2>
            <p className="text-xs text-gray-400 mt-0.5 mb-5">
              Authorized HR team members only.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-gray-600">Work email</span>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@optiminastic.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-[#EAEAEC] rounded-lg text-sm bg-[#F6F6F7] focus:bg-white focus:outline-none focus:border-accent-400 transition"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-gray-600">Password</span>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 border border-[#EAEAEC] rounded-lg text-sm bg-[#F6F6F7] focus:bg-white focus:outline-none focus:border-accent-400 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                    tabIndex={-1}
                    title={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5">
            Trouble signing in? Contact your Curcle administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
