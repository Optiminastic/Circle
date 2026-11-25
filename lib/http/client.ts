/**
 * Low-level HTTP boundary. Single responsibility: talk to the backend API and
 * surface typed errors. Nothing above this layer knows about `fetch`.
 */

import { apiBase } from '@/lib/api-base';
import { readErrorDetail } from './error-detail';

// Phase-0 performance observability: console-only request timing, no network
// calls, no bodies/headers logged. Set NEXT_PUBLIC_PERF_LOG=0 to silence.
// See docs/PERFORMANCE_BASELINE.md.
const PERF_LOG_ENABLED = process.env.NEXT_PUBLIC_PERF_LOG !== '0';
const SLOW_REQUEST_MS = 1000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    // The message is what gets rendered when a page shows `err.message`,
    // and some of those pages are public. Prefixing the status put
    // "422: ..." in front of a candidate; `status` is still a property
    // for the code that needs it.
    super(detail);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const start = PERF_LOG_ENABLED ? performance.now() : 0;
  let status = 0;
  try {
    const res = await fetch(`${apiBase()}/api${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      // Send/receive the httpOnly session cookie so the backend can authenticate
      // the dashboard user. Harmless for the public token-gated pages.
      credentials: 'include',
    });
    status = res.status;

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
      throw new ApiError(res.status, await readErrorDetail(res, res.statusText));
    }

    return (await res.json()) as T;
  } finally {
    if (PERF_LOG_ENABLED) {
      const durationMs = performance.now() - start;
      const slow = durationMs >= SLOW_REQUEST_MS;
      // eslint-disable-next-line no-console
      console[slow ? 'warn' : 'debug'](
        `[perf] api_request method=${method} path=${path} status=${status || 'ERROR'} duration_ms=${durationMs.toFixed(1)}${slow ? ' SLOW' : ''}`,
      );
    }
  }
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};
