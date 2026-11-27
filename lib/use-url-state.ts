'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { deriveState, type Primitive } from './url-state';

/**
 * Whole-view filter/pagination state synced to the URL query string as one
 * object, instead of one hook call per field. A single object + a
 * microtask-batched writer means a filter change that also resets the page
 * number (the common case) becomes ONE write, not two racing ones (two
 * independent hooks would each read a stale snapshot and clobber each
 * other). Fields equal to their default are omitted from the URL entirely,
 * keeping it clean.
 *
 * Writes the URL with the raw History API (`replaceState`), not
 * `router.replace` — every view that reads this hook is 'use client' and
 * resolves its own data from the URL params client-side, so there is never
 * a server-rendered payload that depends on them. `router.replace` still
 * made Next's App Router fetch a fresh RSC payload on EVERY call regardless
 * (a framework-level "maybe something server-side changed" round trip) -
 * observed live taking LONGER than the real data fetch it was paired with
 * (1.25s vs 700ms for one "next page" click). `history.replaceState` updates
 * the address bar (refresh/share/bookmark-safe, same as before) with none of
 * that cost. `replaceState` (not `pushState`) is kept deliberately: filtering
 * still never spams browser history, so "back" from a detail page lands on
 * exactly the list state you left - unchanged from before. See
 * docs/PRODUCTION_PERFORMANCE_FIX_REPORT.md.
 *
 * Because this bypasses Next's router, `useSearchParams()` itself never
 * updates for a write this hook makes - so `state` below is OUR OWN
 * reactive copy, updated synchronously on every `setState` call. It still
 * re-derives from `useSearchParams()` whenever that genuinely changes from
 * a real Next.js navigation (a `<Link>` click elsewhere landing on this
 * URL, browser back/forward crossing a page history DID push, or the
 * initial load) - `lastWrittenRef` is how it tells "a navigation happened"
 * apart from "we just wrote this ourselves".
 *
 * Pass `enabled: false` for a view instance that shouldn't touch the URL at
 * all (e.g. a compact widget embedding a list with its filter UI hidden) —
 * it falls back to plain in-memory state, isolated from whatever query
 * string happens to be on the host page. Both branches call every hook
 * unconditionally (only the returned value differs), so `enabled` is safe to
 * pass a prop that's constant for the component's lifetime.
 */
export function useUrlState<T extends Record<string, Primitive>>(
  defaults: T,
  opts?: { enabled?: boolean },
): [T, (patch: Partial<T>) => void] {
  const enabled = opts?.enabled ?? true;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingRef = useRef<T | null>(null);
  const lastWrittenRef = useRef<string | null>(null);

  const [state, setState_] = useState<T>(() => (enabled ? deriveState(defaults, searchParams) : defaults));

  useEffect(() => {
    if (!enabled) return;
    const qs = searchParams.toString();
    if (qs === lastWrittenRef.current) return; // our own shallow write, not a real navigation
    setState_(deriveState(defaults, searchParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, searchParams]);

  const setState = useCallback(
    (patch: Partial<T>) => {
      const merged = { ...(pendingRef.current ?? state), ...patch };
      pendingRef.current = merged;
      queueMicrotask(() => {
        if (pendingRef.current !== merged) return; // superseded by a later call this tick
        pendingRef.current = null;
        const params = new URLSearchParams(searchParams.toString());
        for (const k of Object.keys(defaults) as (keyof T)[]) {
          const v = merged[k];
          if (v === defaults[k] || v === '') params.delete(k as string);
          else params.set(k as string, String(v));
        }
        const qs = params.toString();
        lastWrittenRef.current = qs;
        window.history.replaceState(window.history.state, '', qs ? `${pathname}?${qs}` : pathname);
        setState_(merged);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, searchParams, pathname],
  );

  const setLocal = useCallback((patch: Partial<T>) => {
    setState_(prev => ({ ...prev, ...patch }));
  }, []);

  return enabled ? [state, setState] : [state, setLocal];
}
