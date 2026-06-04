'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
  leaving?: boolean;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_STYLE: Record<Kind, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 size={15} className="text-emerald-500" />, accent: 'border-l-emerald-500' },
  error: { icon: <AlertCircle size={15} className="text-red-500" />, accent: 'border-l-red-500' },
  info: { icon: <Info size={15} className="text-accent-500" />, accent: 'border-l-accent-500' },
};

const AUTO_DISMISS_MS = 3800;

/**
 * Non-blocking toast notifications (top-right stack, auto-dismiss) — replaces
 * window.alert so feedback never interrupts the user's flow.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.map(x => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 200);
  }, []);

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = ++idRef.current;
      setToasts(t => [...t.slice(-3), { id, kind, message }]); // cap stack at 4
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: m => push('success', m),
      error: m => push('error', m),
      info: m => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map(t => {
          const s = KIND_STYLE[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2.5 bg-white border border-[#E1D6BC] border-l-[3px] ${s.accent} rounded-lg shadow-lg px-3.5 py-3 text-xs text-gray-700 transition-all duration-200 ${
                t.leaving ? 'opacity-0 translate-x-3' : 'toast-enter'
              }`}
            >
              <span className="shrink-0 mt-px">{s.icon}</span>
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-300 hover:text-gray-600 shrink-0 cursor-pointer p-0.5"
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
