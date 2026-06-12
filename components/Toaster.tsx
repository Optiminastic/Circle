'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  /** Headline question, e.g. "Delete this posting?". */
  title: string;
  /** Optional supporting line, e.g. "This cannot be undone.". */
  description?: string;
  /** Action button label (default "Confirm"). */
  confirmLabel?: string;
  /** Runs when the user confirms. */
  onConfirm: () => void;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Centered confirmation dialog (replaces window.confirm). Nothing happens
   *  unless the user clicks the action — the safe default for destructive ops. */
  confirm: (options: ConfirmOptions) => void;
}

// Bridge between the imperative `toast.confirm()` API and the React-rendered
// dialog hosted in ToastProvider. Registered while the provider is mounted.
let confirmHandler: ((options: ConfirmOptions) => void) | null = null;

/**
 * Non-blocking toast notifications, backed by sonner, plus a centered, on-theme
 * confirmation dialog. The `useToast()` API is preserved so existing call sites
 * (`toast.success/error/info/confirm`) are unchanged.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    confirmHandler = options => setPending(options);
    return () => {
      confirmHandler = null;
    };
  }, []);

  return (
    <>
      {children}
      <SonnerToaster position="bottom-left" />

      <Dialog open={!!pending} onOpenChange={open => !open && setPending(null)}>
        <DialogContent className="w-[min(92vw,26rem)] max-w-[26rem] sm:max-w-[26rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-600">
                <AlertTriangle size={16} />
              </span>
              {pending?.title}
            </DialogTitle>
            {pending?.description && (
              <DialogDescription className="pl-[42px]">{pending.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                pending?.onConfirm();
                setPending(null);
              }}
            >
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const api: ToastApi = {
  success: message => sonnerToast.success(message),
  error: message => sonnerToast.error(message),
  info: message => sonnerToast.info(message),
  confirm: options => {
    if (confirmHandler) {
      confirmHandler(options);
    } else if (typeof window !== 'undefined' && window.confirm(options.title)) {
      // Fallback if the provider isn't mounted yet.
      options.onConfirm();
    }
  },
};

export function useToast(): ToastApi {
  return api;
}
