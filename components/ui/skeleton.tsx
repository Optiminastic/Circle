import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A content-shaped loading placeholder.
 *
 * Preferred over a spinner wherever the shape of what is coming is known: it
 * holds the layout still, so the page does not jump when data lands, and it
 * reads as "this is loading" rather than "this is empty".
 *
 * The sheen is a single travelling highlight rather than a pulse, which stays
 * legible on both the cream and charcoal themes. `prefers-reduced-motion` stops
 * it via the global guard in globals.css, leaving a plain block.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-muted',
        // The sheen rides a pseudo-element so the base colour stays a token.
        'after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r',
        'after:from-transparent after:via-surface/70 after:to-transparent',
        'after:animate-[skeleton-sheen_1.6s_infinite]',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Several lines of text, the last one short, the way a paragraph actually ends.
 */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

/**
 * Rows shaped like a table body. `columns` widths are percentages so it lines
 * up with whatever table it stands in for.
 */
function SkeletonRows({
  rows = 6,
  columns = [28, 22, 18, 16, 16],
  className,
}: {
  rows?: number;
  columns?: number[];
  className?: string;
}) {
  return (
    <div
      className={cn('divide-y divide-line-soft', className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-3 px-3 py-2.5">
          {columns.map((width, col) => (
            <Skeleton key={col} className="h-3" style={{ width: `${width}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonRows };
