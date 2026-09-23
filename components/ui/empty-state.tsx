'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Themed empty state for data views with no records — icon, title, optional
 * description + action. One consistent empty pattern across the app.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex animate-in flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-16 text-center fade-in-0 zoom-in-95 duration-300',
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-50 text-accent-500">
          <Icon size={26} />
        </span>
      )}
      <p className="text-sm font-bold text-gray-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[11px] text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
