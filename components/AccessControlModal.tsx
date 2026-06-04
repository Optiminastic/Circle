'use client';

import React, { useEffect, useState } from 'react';
import { AuthUser } from '@/types';
import { useAuth, displayName } from '@/store/auth-store';
import { X, ShieldCheck, KeyRound, Loader2, Check, Eye, EyeOff, User } from 'lucide-react';

/**
 * Admin-only panel: lists dashboard accounts and lets an administrator reset any
 * account's password (e.g. the HR login). Rendered from the header profile menu.
 */
export function AccessControlModal({ onClose }: { onClose: () => void }) {
  const { user, listUsers, changePassword } = useAuth();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [target, setTarget] = useState<string>('');
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
    setSaving(true);
    const res = await changePassword(target, newPw);
    setSaving(false);
    if (res.ok) {
      setMsg({ ok: true, text: `Password updated for ${target}.` });
      setNewPw('');
    } else {
      setMsg({ ok: false, text: res.error ?? 'Could not update password.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/45 backdrop-blur-xs flex items-center justify-center z-[120] px-4">
      <div className="bg-white rounded-2xl border border-[#EAEAEC] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAEAEC]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck size={17} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Access Control</h3>
              <p className="text-[11px] text-gray-400">Manage dashboard logins & passwords.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Accounts list */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Accounts</p>
          {users === null ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
              <Loader2 size={14} className="animate-spin" /> Loading accounts…
            </div>
          ) : (
            users.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between border border-[#EAEAEC] rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-500 to-accent-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    <User size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {u.name || displayName(u.email)}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{u.email}</p>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    u.role === 'admin'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-accent-50 text-accent-600'
                  }`}
                >
                  {u.role === 'admin' ? 'ADMIN' : 'HR'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Reset password */}
        <form onSubmit={submit} className="px-5 pb-5 pt-1 space-y-3 border-t border-[#EAEAEC]">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400 pt-3 flex items-center gap-1.5">
            <KeyRound size={12} /> Reset a password
          </p>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-gray-600">Account</span>
            <select
              value={target}
              onChange={e => setTarget(e.target.value)}
              className="w-full px-3 py-2 border border-[#EAEAEC] rounded-lg text-sm bg-[#F6F6F7] focus:bg-white focus:outline-none focus:border-accent-400 transition"
            >
              {(users ?? []).map(u => (
                <option key={u.id} value={u.email}>
                  {u.email}
                  {u.email === user?.email ? ' (you)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-gray-600">New password</span>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pr-10 px-3 py-2 border border-[#EAEAEC] rounded-lg text-sm bg-[#F6F6F7] focus:bg-white focus:outline-none focus:border-accent-400 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {msg && (
            <div
              className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 ${
                msg.ok
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}
            >
              {msg.ok && <Check size={13} />}
              {msg.text}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#EAEAEC] hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer font-semibold text-sm"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-60 text-white rounded-lg cursor-pointer font-semibold text-sm flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccessControlModal;
