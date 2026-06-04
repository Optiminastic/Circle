'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser } from '@/types';
import { repositories } from '@/lib/api/repositories';
import { ApiError } from '@/lib/http/client';

/**
 * Access control for the HR dashboard. Accounts live in the backend `auth-users`
 * resource so password changes persist and apply across devices. Public job pages
 * (/jobs/[id]) are intentionally NOT gated.
 *
 * NOTE: the backend has no real auth layer yet, so passwords are stored as plain
 * data. This is a pragmatic gate for an internal/demo tool — for production, move
 * verification server-side and hash passwords.
 */
const STORAGE_KEY = 'curcle.auth.session';

/** Seed accounts created on first run if the resource is empty. */
const SEED_USERS: AuthUser[] = [
  {
    id: 'akshae@optiminastic.com',
    email: 'akshae@optiminastic.com',
    password: 'Admin@2026',
    role: 'admin',
    name: 'Akshae',
  },
  {
    id: 'hr@optiminastic.com',
    email: 'hr@optiminastic.com',
    password: 'opti@100',
    role: 'hr',
    name: 'HR Team',
  },
];

export interface SessionUser {
  email: string;
  role: 'admin' | 'hr';
  name: string;
}

interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  listUsers: () => Promise<AuthUser[]>;
  changePassword: (targetEmail: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Ensure both seed accounts exist (create any that are missing). Idempotent. */
async function ensureSeeded(): Promise<void> {
  const existing = await repositories.authUsers.list().catch(() => [] as AuthUser[]);
  const have = new Set(existing.map(u => u.email));
  await Promise.all(
    SEED_USERS.filter(u => !have.has(u.email)).map(u => repositories.authUsers.create(u)),
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a prior session once on mount (client-only — avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as SessionUser);
    } catch {
      /* corrupt or unavailable */
    }
    setReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    try {
      await ensureSeeded();
      let account: AuthUser;
      try {
        account = await repositories.authUsers.get(e);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return { ok: false, error: 'This email is not authorized to access Curcle.' };
        }
        throw err;
      }
      if (account.password !== password) {
        return { ok: false, error: 'Incorrect password. Please try again.' };
      }
      const session: SessionUser = { email: account.email, role: account.role, name: account.name };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        /* ignore */
      }
      setUser(session);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the server. Please try again.' };
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  };

  const listUsers = () => repositories.authUsers.list();

  const changePassword = async (targetEmail: string, newPassword: string) => {
    if (!user || user.role !== 'admin') {
      return { ok: false, error: 'Only an administrator can change passwords.' };
    }
    if (newPassword.trim().length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    try {
      await repositories.authUsers.patch(targetEmail.toLowerCase(), { password: newPassword });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not update the password. Please try again.' };
    }
  };

  const value = useMemo<AuthState>(
    () => ({ user, ready, isAdmin: user?.role === 'admin', login, logout, listUsers, changePassword }),
    [user, ready],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/** Display helpers derived from the logged-in email. */
export function displayName(email: string | null | undefined): string {
  if (!email) return 'Guest';
  const handle = email.split('@')[0];
  return handle
    .split(/[._-]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function initials(email: string | null | undefined): string {
  const name = displayName(email);
  const parts = name.split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'HR';
}
