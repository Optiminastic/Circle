/**
 * Pure URL-query <-> typed-state parsing, split out from use-url-state.ts so
 * it can be unit-tested with plain Node (that file imports next/navigation,
 * which only resolves inside Next's own build/runtime).
 */

export type Primitive = string | number;

export function deriveState<T extends Record<string, Primitive>>(defaults: T, params: URLSearchParams): T {
  const result = {} as T;
  for (const k of Object.keys(defaults) as (keyof T)[]) {
    const raw = params.get(k as string);
    result[k] =
      raw === null ? defaults[k] : ((typeof defaults[k] === 'number' ? Number(raw) : raw) as T[keyof T]);
  }
  return result;
}
