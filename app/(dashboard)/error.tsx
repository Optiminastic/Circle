'use client';

import { useEffect } from 'react';
import { QueryError } from '@/components/ui/query-error';

/**
 * The dashboard's last line of defence.
 *
 * Next needs an `error.tsx` per segment to contain a render-time crash; without
 * one it escalates to the root and replaces the whole application with a blank
 * page, taking the sidebar and navigation with it. There was no error boundary
 * anywhere in the app, so any thrown render put the user at a dead end with no
 * way back other than reloading by hand.
 *
 * Scoped to the dashboard group so the chrome survives: the failure stays
 * inside the page area and every other section remains reachable.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Without this the digest is the only trace, and that is server-side only.
    console.error('Dashboard render failed:', error);
  }, [error]);

  return (
    <div className="py-10">
      <QueryError
        title="This page ran into a problem"
        description="The page could not be displayed. Trying again usually works; if it keeps happening, the detail is in the browser console."
        onRetry={reset}
      />
    </div>
  );
}
