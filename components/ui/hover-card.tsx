'use client';

/**
 * HoverCard — Radix primitive, themed to the app's tokens.
 *
 * Radix's HoverCard opens on hover and on keyboard focus of the trigger, but it
 * is explicitly a sighted-user affordance: screen readers are not notified when
 * it opens. So it must only ever *summarise* information that already exists on
 * the page, never carry anything exclusive to it. Both current usages (the
 * candidate pipeline and the onboarding checklist) restate data that is already
 * in the row and on the record's detail page.
 */

import * as React from 'react';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function HoverCard({ openDelay = 220, closeDelay = 90, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" openDelay={openDelay} closeDelay={closeDelay} {...props} />;
}

function HoverCardTrigger({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({
  className,
  align = 'start',
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        // The card is portaled out of the DOM, but React still propagates
        // events along the React tree - so a click on a link in here would
        // otherwise also fire the table row's onClick and navigate away.
        onClick={e => e.stopPropagation()}
        className={cn(
          'z-50 w-72 rounded-md border border-line bg-surface p-3 text-gray-700 shadow-lg outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
          'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
