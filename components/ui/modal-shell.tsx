'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * The backdrop and panel for the app's hand-rolled modals.
 *
 * These were written as a pair of plain divs - a `fixed inset-0` backdrop with
 * `onClick={onClose}` and a panel calling `stopPropagation` - repeated across
 * ~15 files. That shape works with a mouse and fails everywhere else: no
 * `role="dialog"`, so a screen reader announces nothing; no focus trap, so Tab
 * walks out into the page behind; no Escape; and on most of them no height cap,
 * which puts the submit button off-screen on a phone.
 *
 * Radix's `ui/dialog` solves all of this, but each modal has its own header,
 * close button and layout, so moving them would mean rewriting their internals.
 * This keeps those untouched and replaces only the two wrapper divs.
 *
 * Every modal needs an accessible name: pass `label`, or `labelledBy` with the
 * id of the heading it already renders.
 */

const panel = cva(
  // A column so a modal can give its own body `overflow-y-auto` and keep a
  // header or footer pinned; `max-h` is what stops tall content from running
  // off a phone screen.
  'relative flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-lg bg-surface shadow-xl outline-none',
  {
    variants: {
      // Named for the widths the app already uses, so migrating a modal is a
      // rename and not a redesign.
      size: {
        xs: 'max-w-sm',
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-xl',
        xl: 'max-w-2xl',
        full: 'max-w-4xl',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalShellProps
  extends VariantProps<typeof panel>,
    Omit<React.ComponentProps<'div'>, 'onClick'> {
  onClose: () => void;
  /** Accessible name, when the modal has no visible heading to point at. */
  label?: string;
  /** Id of the modal's own heading. Preferred when one exists. */
  labelledBy?: string;
  /** Clicking the backdrop closes by default; off for destructive forms. */
  dismissOnBackdrop?: boolean;
  children: React.ReactNode;
}

export function ModalShell({
  onClose,
  label,
  labelledBy,
  size,
  dismissOnBackdrop = true,
  className,
  children,
  ...props
}: ModalShellProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Send focus into the dialog, and put it back where it came from on close.
  // Without the restore, closing a modal drops focus to the top of the page.
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
    return () => previous?.focus?.();
  }, []);

  // The page behind must not scroll while a modal is open - on touch devices
  // it otherwise scrolls instead of the modal body.
  React.useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    // Keep Tab inside the dialog. Queried per keystroke rather than cached,
    // because these modals add and remove fields as they are filled in.
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    ).filter(el => el.offsetParent !== null);
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in-0 duration-150"
      onClick={dismissOnBackdrop ? onClose : undefined}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={cn(
          panel({ size }),
          'animate-in fade-in-0 zoom-in-95 duration-150',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
