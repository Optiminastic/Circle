'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';

/**
 * Bespoke Radix tabs — an underline tab bar matching the app's crimson accent.
 * The single tabs implementation used across every tab UI.
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex items-center gap-4 overflow-x-auto border-b border-border', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        '-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent pb-2 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900',
        'data-[state=active]:border-primary data-[state=active]:text-primary',
        ui.focusRing,
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'outline-none',
        // Panels used to swap with no transition at all, which made a tab
        // change read as a page reload. A short fade and 2px rise is enough to
        // connect the click to the result; the global reduced-motion guard
        // removes it. Only the entrance animates - Radix unmounts the outgoing
        // panel immediately, so an exit would never be seen.
        'data-[state=active]:animate-in data-[state=active]:fade-in-0',
        'data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200',
        ui.focusRing,
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
