'use client';

import * as React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * What a view shows when its data could not be loaded.
 *
 * The app had no such state. Every list destructured `data = []` and ignored
 * `isError`, so a failed request rendered the empty state instead: a 500 on
 * /jobs read as "No job postings yet", which is not just unhelpful but wrong -
 * it says the opposite of what happened, and invites someone to re-create
 * records that already exist.
 *
 * Deliberately shaped like EmptyState so the two read as one family, and
 * deliberately not shaped like it in colour, so the difference is visible at a
 * glance without reading the text.
 */
export function QueryError({
  title = 'Could not load this',
  description = 'Something went wrong fetching this data. It may be a temporary network problem.',
  onRetry,
  retrying,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex animate-in flex-col items-center justify-center rounded-lg border border-dashed border-red-300 bg-surface px-6 py-16 text-center fade-in-0 zoom-in-95 duration-300',
        className,
      )}
    >
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-red-50 text-red-500">
        <AlertTriangle size={26} />
      </span>
      <p className="text-sm font-bold text-gray-700">{title}</p>
      <p className="mt-1 max-w-sm text-[11px] text-gray-500">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:border-accent-400 hover:text-accent-600 disabled:opacity-60"
        >
          <RotateCw size={13} className={retrying ? 'animate-spin' : undefined} />
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  );
}

export default QueryError;
