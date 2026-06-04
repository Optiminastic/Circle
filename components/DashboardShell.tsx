'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ModalHost } from './ModalHost';
import { useUiStore } from '@/store/ui-store';
import { useAuth } from '@/store/auth-store';
import { useCandidates } from '@/features/candidates/hooks';
import { useEmployees } from '@/features/employees/hooks';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { userRole, setUserRole, setSearchQuery, setSelectedCandidateId } = useUiStore();

  // Access gate: bounce unauthenticated visitors to the login screen.
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  // Bootstrap status comes from the primary queries — no manual loading flags.
  const candidates = useCandidates();
  const employees = useEmployees();
  const loading = candidates.isLoading || employees.isLoading;
  const error = candidates.isError || employees.isError;

  // Hold rendering until we know the auth state (avoids a flash of the dashboard).
  if (!ready || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F6F6F7]">
        <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onAddCandidateClick = () => {
    router.push('/candidates');
    setTimeout(() => document.getElementById('btn-add-candidate-directory')?.click(), 150);
  };

  const onQuickSelectCandidate = (id: string) => {
    setSelectedCandidateId(id);
    router.push('/candidates');
  };

  return (
    <div
      id="master-viewport"
      className="flex h-screen overflow-hidden bg-[#F6F6F7] font-sans antialiased text-gray-950"
    >
      <Sidebar userRole={userRole} setUserRole={setUserRole} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header
          onSearch={setSearchQuery}
          onAddCandidateClick={onAddCandidateClick}
          userRole={userRole}
          candidatesList={candidates.data ?? []}
          onQuickSelectCandidate={onQuickSelectCandidate}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-[#F6F6F7]">
          {error ? (
            <div className="max-w-md mx-auto mt-20 text-center">
              <div className="bg-white border border-red-200 rounded-xl p-6">
                <p className="text-sm font-semibold text-red-600">Backend unavailable</p>
                <p className="text-xs text-gray-500 mt-2">
                  Could not reach {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                </p>
                <p className="text-[11px] text-gray-400 mt-3 font-mono">
                  Start it: <span className="text-gray-600">uvicorn app.main:app --port 8000</span>
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">Loading from backend…</span>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <ModalHost />
    </div>
  );
}

export default DashboardShell;
