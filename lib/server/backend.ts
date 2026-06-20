/**
 * SERVER-ONLY backend caller for the careers server actions.
 *
 * This runs on the Next.js server (never the browser). It talks to the FastAPI
 * backend and attaches the shared `X-Internal-Token` secret, so the public
 * careers endpoints (OTP / applied-check / apply) can be locked down to reject
 * any direct browser/cURL call. The real applicant IP is forwarded so the
 * backend's per-IP rate limit still keys on the visitor, not this server.
 *
 * `INTERNAL_API_TOKEN` has no NEXT_PUBLIC_ prefix, so Next never inlines it into
 * a client bundle. Import this module only from `'use server'` code.
 */
import { headers } from 'next/headers';

const BACKEND_URL = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || '';

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
  if (INTERNAL_TOKEN) headersInit['X-Internal-Token'] = INTERNAL_TOKEN;
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
