'use client';

import { useCallback, useState } from 'react';

/**
 * Like `useState`, but the value survives a component unmount/remount within the
 * same SPA session by mirroring it into a module-level store (keyed). This lets
 * the candidate list keep its filters when you open a candidate and navigate
 * back — until you change them (a full page reload resets it). It is in-memory
 * only (no localStorage). Pass a `null` key to opt out (plain `useState`).
 */
const store = new Map<string, unknown>();

export function usePersistentState<T>(
  key: string | null,
  initial: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() =>
    key !== null && store.has(key) ? (store.get(key) as T) : initial,
  );

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue(prev => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (key !== null) store.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
