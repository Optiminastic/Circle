'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';

/**
 * Themed wrapper around react-day-picker (v10) — the shadcn-style Calendar
 * primitive, recoloured to the app's raspberry accent.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        root: cn('w-fit', defaults.root),
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex w-full flex-col gap-3',
        month_caption: 'relative flex h-8 items-center justify-center px-8',
        caption_label: 'text-sm font-semibold text-gray-900',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'inline-flex size-7 items-center justify-center rounded-md border border-border bg-white text-gray-600 transition hover:bg-[#F1F3F5] hover:text-accent-700 disabled:opacity-40',
        button_next:
          'inline-flex size-7 items-center justify-center rounded-md border border-border bg-white text-gray-600 transition hover:bg-[#F1F3F5] hover:text-accent-700 disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.7rem] font-medium uppercase tracking-wide text-gray-400',
        week: 'mt-1 flex w-full',
        day: cn(
          'relative size-9 p-0 text-center text-sm',
          '[&>button]:mx-auto [&>button]:inline-flex [&>button]:size-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:font-normal [&>button]:text-gray-700 [&>button]:transition [&>button:hover]:bg-[#F1F3F5]',
        ),
        selected:
          '[&>button]:bg-accent-600 [&>button]:font-semibold [&>button]:text-white [&>button:hover]:bg-accent-700',
        today: '[&>button]:font-semibold [&>button]:text-accent-700',
        outside: '[&>button]:text-gray-300',
        disabled: '[&>button]:cursor-not-allowed [&>button]:text-gray-300 [&>button]:opacity-50',
        range_start: '[&>button]:rounded-r-none',
        range_end: '[&>button]:rounded-l-none',
        range_middle:
          '[&>button]:rounded-none [&>button]:bg-accent-50 [&>button]:text-accent-700 [&>button:hover]:bg-accent-100',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevClassName, ...rest }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className={cn('size-4', chevClassName)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
