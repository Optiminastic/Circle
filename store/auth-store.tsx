'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser } from '@/types';
import { http, ApiError } from '@/lib/http/client';

/**
 * Access control for the HR dashboard. Authentication is enforced SERVER-SIDE:
 * `POST /api/auth/login` verifies a hashed password and sets an httpOnly session
 * cookie (the browser can neither read nor forge it). The session is restored via
 * `GET /api/auth/me`. No password ever reaches the browser, and there is no
 * client-stored session to tamper with. Public job pages are not gated.
 */

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
  changeEmail: (currentEmail: string, newEmail: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthState | null>(null);

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.detail || fallback;
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the session from the httpOnly cookie (server-verified) on mount.
  useEffect(() => {
    http
      .get<SessionUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const session = await http.post<SessionUser>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      setUser(session);
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        return { ok: false, error: err.detail || 'Invalid email or password.' };
      }
      if (err instanceof ApiError && err.status === 429) {
        return { ok: false, error: 'Too many attempts. Please wait a minute and try again.' };
      }
      return { ok: false, error: 'Could not reach the server. Please try again.' };
    }
  };

  const logout = () => {
    http.post('/auth/logout', {}).catch(() => {});
    setUser(null);
  };

  const listUsers = () => http.get<AuthUser[]>('/auth/users');

  const changePassword = async (targetEmail: string, newPassword: string) => {
    if (newPassword.trim().length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    try {
      await http.patch(`/auth/users/${encodeURIComponent(targetEmail.toLowerCase())}/password`, {
        password: newPassword,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorText(err, 'Could not update the password. Please try again.') };
    }
  };

  const changeEmail = async (currentEmail: string, newEmail: string) => {
    try {
      const moved = await http.patch<{ email: string; role: 'admin' | 'hr'; name: string }>(
        `/auth/users/${encodeURIComponent(currentEmail.toLowerCase())}/email`,
        { newEmail: newEmail.trim().toLowerCase() },
      );
      // If the admin changed their own email, reflect it in the live session.
      if (user && user.email === currentEmail.trim().toLowerCase()) {
        setUser({ email: moved.email, role: moved.role, name: moved.name });
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorText(err, 'Could not update the email. Please try again.') };
    }
  };

  const value = useMemo<AuthState>(
    () => ({ user, ready, isAdmin: user?.role === 'admin', login, logout, listUsers, changePassword, changeEmail }),
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
