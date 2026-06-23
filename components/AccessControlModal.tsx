'use client';

import React, { useEffect, useState } from 'react';
import { AuthUser } from '@/types';
import { useAuth, displayName } from '@/store/auth-store';
import { ShieldCheck, KeyRound, Loader2, Check, Eye, EyeOff, User, AtSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

/**
 * Admin-only panel: lists dashboard accounts and lets an administrator reset any
 * account's password (e.g. the HR login). Rendered from the header profile menu.
 */
export function AccessControlModal({ onClose }: { onClose: () => void }) {
  const { user, listUsers, changePassword, changeEmail } = useAuth();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [target, setTarget] = useState<string>('');
  const [newEmail, setNewEmail] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = () => listUsers().then(setUsers).catch(() => setUsers([]));

  useEffect(() => {
    listUsers()
      .then(list => {
        setUsers(list);
        // Default the target to the first non-admin (HR) account.
        const hr = list.find(u => u.role !== 'admin') ?? list[0];
        if (hr) setTarget(hr.email);
      })
      .catch(() => setUsers([]));
  }, [listUsers]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const wantsEmail = newEmail.trim().length > 0 && newEmail.trim().toLowerCase() !== target.toLowerCase();
    const wantsPw = newPw.trim().length > 0;
    if (!wantsEmail && !wantsPw) {
      setMsg({ ok: false, text: 'Enter a new email or a new password.' });
      return;
    }

    setSaving(true);
    const done: string[] = [];

    // Change the password first (while the account still has its old email).
    if (wantsPw) {
      const res = await changePassword(target, newPw);
      if (!res.ok) {
        setSaving(false);
        setMsg({ ok: false, text: res.error ?? 'Could not update password.' });
        return;
      }
      done.push('password');
    }

    let finalEmail = target;
    if (wantsEmail) {
      const res = await changeEmail(target, newEmail);
      if (!res.ok) {
        setSaving(false);
        setMsg({ ok: false, text: res.error ?? 'Could not update email.' });
        // A password change may already have applied — refresh + report it.
        if (done.length) await refresh();
        return;
      }
      finalEmail = newEmail.trim().toLowerCase();
      done.push('email');
    }

    await refresh();
    setSaving(false);
    setTarget(finalEmail);
    setNewEmail('');
    setNewPw('');
    setMsg({ ok: true, text: `Updated ${done.join(' & ')} for ${finalEmail}.` });
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] gap-0 overflow-y-auto p-0">
        <DialogHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-border px-5 py-4 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <ShieldCheck size={17} />
          </span>
          <div>
            <DialogTitle className="text-sm font-bold text-gray-900">Access Control</DialogTitle>
            <DialogDescription className="text-[11px]">
              Manage dashboard logins &amp; passwords.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Accounts list */}
        <div className="space-y-2 px-5 py-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Accounts</p>
          {users === null ? (
            <div className="flex items-center gap-2 py-3 text-xs text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Loading accounts…
            </div>
          ) : (
            users.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-accent-500 to-accent-700 text-[11px] font-bold text-white">
                    <User size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">
                      {u.name || displayName(u.email)}
                    </p>
                    <p className="truncate font-mono text-[10px] text-gray-500">{u.email}</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={`shrink-0 font-mono text-[9px] font-bold ${
                    u.role === 'admin'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-accent-50 text-accent-600'
                  }`}
                >
                  {u.role === 'admin' ? 'ADMIN' : 'HR'}
                </Badge>
              </div>
            ))
          )}
        </div>

        {/* Reset password */}
        <form onSubmit={submit} className="space-y-3 border-t border-border px-5 pt-3 pb-5">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
            <KeyRound size={12} /> Update an account
          </p>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-gray-600">Account</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {(users ?? []).map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.email}
                    {u.email === user?.email ? ' (you)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-email" className="text-[11px] font-semibold text-gray-600">
              New email <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder={target || 'name@optiminastic.com'}
                className="pl-9"
                autoComplete="off"
              />
              <AtSign
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-password" className="text-[11px] font-semibold text-gray-600">
              New password <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                className="pr-10"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPw(s => !s)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </Button>
            </div>
          </div>

          {msg && (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${
                msg.ok
                  ? 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                  : 'border border-red-100 bg-red-50 text-red-600'
              }`}
            >
              {msg.ok && <Check size={13} />}
              {msg.text}
            </div>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AccessControlModal;
