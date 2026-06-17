'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Small icon button that re-fetches server data on demand. Pass the specific
 * query keys to refresh (e.g. just the candidate table), or omit `queryKeys`
 * to refresh every active query on the page. The icon spins while in flight.
 */
export function RefreshButton({
  queryKeys,
  title = 'Refresh',
  className = '',
}: {
  queryKeys?: readonly (readonly unknown[])[];
  title?: string;
  className?: string;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (queryKeys && queryKeys.length) {
        await Promise.all(queryKeys.map(key => qc.refetchQueries({ queryKey: key })));
      } else {
        await qc.refetchQueries({ type: 'active' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E6EA] bg-white text-gray-600 transition hover:bg-[#F1F3F5] hover:text-accent-600 disabled:opacity-60 ${className}`}
    >
      <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
    </button>
  );
}

export default RefreshButton;
