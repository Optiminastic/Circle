'use client';

import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/query/query-client';
import { UiStateProvider } from '@/store/ui-store';
import { AuthProvider } from '@/store/auth-store';

/** Composition of client-side providers: auth gate + server-state (Query) + UI state. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  // Render page content only after mount. The app is client-rendered anyway
  // (auth gate + React Query), and this avoids hydration-mismatch warnings from
  // browser extensions (e.g. Bitdefender injecting `bis_skin_checked` attributes
  // into the server HTML before React hydrates).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UiStateProvider>{mounted ? children : null}</UiStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
