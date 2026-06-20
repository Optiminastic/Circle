/**
 * SERVER-ONLY backend caller for the careers server actions.
 *
 * This runs on the Next.js server (never the browser). It talks to the FastAPI
 * backend and forwards the real applicant IP, so the backend's per-IP rate limit
 * keys on the actual visitor (not this server). Routing public calls through the
 * server also keeps the backend URL out of the browser's Network tab. Abuse is
 * stopped server-side by rate limiting (per-IP + per-email), not a shared secret.
 *
 * Import this module only from `'use server'` code.
 */
import { headers } from 'next/headers';

const BACKEND_URL = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

/** Best-effort real client IP, forwarded so backend rate limiting stays per-visitor. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return h.get('x-real-ip') ?? '';
}

interface BackendInit {
  /** JSON body — serialized and sent as application/json. */
  json?: unknown;
  /** Multipart body (e.g. resume upload) — sent as-is. */
  form?: FormData;
}

/** POST to a backend path with the internal token + forwarded client IP. */
export async function backendPost(path: string, init: BackendInit = {}): Promise<Response> {
  const headersInit: Record<string, string> = {};
  const ip = await clientIp();
  if (ip) headersInit['X-Forwarded-For'] = ip;

  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headersInit['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init.form) {
    body = init.form;
  }

  return fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: headersInit,
    body,
    cache: 'no-store',
  });
}
