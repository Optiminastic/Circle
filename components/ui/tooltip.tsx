'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';

/** Mounted once near the root so any <Tip> works app-wide. */
export function TooltipProvider({
  delayDuration = 250,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} {...props}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

/**
 * Bespoke Radix tooltip. Wrap any trigger: `<Tip label="Delete"><button/></Tip>`.
 * Renders nothing extra when `label` is empty, so it's safe to use everywhere.
 */
export function Tip({
  label,
  side = 'top',
  children,
}: {
  label?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
}) {
  if (!label) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            ui.motion,
            'z-[250] rounded-sm bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-md',
          )}
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-gray-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
