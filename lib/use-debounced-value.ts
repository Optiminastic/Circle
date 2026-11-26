import { useEffect, useState } from 'react';

/** Delays reflecting `value` until it stops changing for `delayMs` — used so
 *  a search input stays instantly responsive to type into while the actual
 *  server request (debounced) doesn't fire on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
