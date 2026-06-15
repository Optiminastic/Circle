'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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
  captionLayout = 'label',
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn('p-1', className)}
      classNames={{
        root: cn('w-fit', defaults.root),
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex w-full flex-col gap-3',
        month_caption: 'relative flex h-8 items-center justify-center px-8',
        // Month/year dropdown navigation (captionLayout="dropdown"): the native
        // <select> is a transparent overlay over the styled label, so only one
        // value shows (no duplicate text) and the whole pill opens the dropdown.
        dropdowns: 'flex h-8 items-center justify-center gap-1.5 text-sm font-medium',
        dropdown_root:
          'relative inline-flex items-center rounded-md border border-border bg-white shadow-2xs transition hover:border-accent-400 focus-within:ring-2 focus-within:ring-accent-500',
        dropdown: 'absolute inset-0 cursor-pointer opacity-0',
        caption_label: cn(
          'select-none font-semibold text-gray-900',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex h-8 items-center gap-1 rounded-md pl-2.5 pr-1.5 text-sm [&>svg]:size-3.5 [&>svg]:text-gray-400',
        ),
        // The nav overlays the caption row; make the container click-through so it
        // never swallows clicks meant for the centered dropdowns, and raise the
        // two buttons (pointer-events + z-index) so prev/next reliably register.
        nav: 'pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between',
        button_previous:
          'pointer-events-auto inline-flex size-7 items-center justify-center rounded-md border border-border bg-white text-gray-600 transition hover:bg-[#F1F3F5] hover:text-accent-700 disabled:opacity-40',
        button_next:
          'pointer-events-auto inline-flex size-7 items-center justify-center rounded-md border border-border bg-white text-gray-600 transition hover:bg-[#F1F3F5] hover:text-accent-700 disabled:opacity-40',
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
          const Icon =
            orientation === 'left'
              ? ChevronLeft
              : orientation === 'right'
                ? ChevronRight
                : ChevronDown;
          return <Icon className={cn('size-4', chevClassName)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
