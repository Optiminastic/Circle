'use client';

/**
 * Self-service profile editor.
 *
 * With more than one HR account, "who sent this?" stops being obvious: the
 * header title was hardcoded to "HR Specialist" for everyone, and an account an
 * admin created carries whatever name that admin typed. This lets each person
 * own their own name and title.
 *
 * Writes through PATCH /api/auth/me, which accepts display fields only --
 * role, email and password are not editable there by design, so this can never
 * be used to self-promote.
 */

import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, Loader2, Mail, Phone, UserRound } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/store/auth-store';
import { useToast } from './Toaster';

const iconCls = 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500';

export function MyProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Re-seed on open so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    setTitle(user?.title ?? '');
    setPhone(user?.phone ?? '');
  }, [open, user?.name, user?.title, user?.phone]);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const res = await updateProfile({
      name: name.trim(),
      title: title.trim(),
      phone: phone.trim(),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Profile updated.');
      onClose();
    } else {
      toast.error(res.error ?? 'Could not save your profile.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My profile</DialogTitle>
          <DialogDescription>
            Your name and title appear in the app and on the emails you send.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-gray-600">Email</Label>
            <div className="relative">
              <Mail size={15} className={iconCls} />
              {/* Changing a sign-in address is an admin action, not a profile edit. */}
              <Input value={user?.email ?? ''} readOnly disabled className="pl-9" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="mp-name" className="text-[11px] font-semibold text-gray-600">
              Full name
            </Label>
            <div className="relative">
              <UserRound size={15} className={iconCls} />
              <Input
                id="mp-name"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Aditi Rao"
                maxLength={120}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="mp-title" className="text-[11px] font-semibold text-gray-600">
              Job title <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <div className="relative">
              <BriefcaseBusiness size={15} className={iconCls} />
              <Input
                id="mp-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="HR Business Partner"
                maxLength={120}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="mp-phone" className="text-[11px] font-semibold text-gray-600">
              Phone <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <div className="relative">
              <Phone size={15} className={iconCls} />
              <Input
                id="mp-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98200 11223"
                maxLength={120}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving…
              </>
            ) : (
              'Save profile'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
