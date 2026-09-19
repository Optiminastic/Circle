'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Primitive = string | number;

/**
 * Whole-view filter/pagination state synced to the URL query string as one
 * object, instead of one hook call per field. A single object + a
 * microtask-batched writer means a filter change that also resets the page
 * number (the common case) becomes ONE `router.replace`, not two racing ones
 * (two independent hooks would each read a stale `useSearchParams()` snapshot
 * and clobber each other). Fields equal to their default are omitted from the
 * URL entirely, keeping it clean. Uses `router.replace` (not `push`) — so
 * filtering never spams browser history: "back" from a detail page lands on
 * exactly the list state you left, and the URL itself is refresh/share/
 * bookmark-safe.
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingRef = useRef<T | null>(null);
  const [localState, setLocalState] = useState<T>(defaults);

  const state = useMemo(() => {
    const result = {} as T;
    for (const k of Object.keys(defaults) as (keyof T)[]) {
      const raw = searchParams.get(k as string);
      result[k] =
        raw === null
          ? defaults[k]
          : ((typeof defaults[k] === 'number' ? Number(raw) : raw) as T[keyof T]);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

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
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, searchParams, pathname, router],
  );

  const setLocal = useCallback((patch: Partial<T>) => {
    setLocalState(prev => ({ ...prev, ...patch }));
  }, []);

  return enabled ? [state, setState] : [localState, setLocal];
}
