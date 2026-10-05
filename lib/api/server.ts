/**
 * Server-side data access for the PUBLIC pages (careers listing + job postings).
 *
 * These run only in Server Components, so the fetch happens server-to-server on
 * the host (e.g. Vercel) — the browser never sees the request, the backend URL
 * is never shipped in client JS, and there is no browser CORS round-trip.
 *
 * The base URL is read from `API_URL` (a server-only var — preferred, so it
 * stays out of every client bundle) and falls back to the public
 * `NEXT_PUBLIC_API_URL` used by the HR app. Returns no-trailing-slash origin.
 */
import { Job } from '@/types';

function serverApiBase(): string {
  const url = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  return url.replace(/\/$/, '');
}

/** All job postings. The caller filters to live openings for the public list. */
export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${serverApiBase()}/api/jobs`, {
    // Always fresh. This used to be a 60s ISR cache (`next: { revalidate: 60 }`)
    // — HR edits a posting (status, extra questions, anything) and expects the
    // apply page to reflect it immediately. revalidatePublicJobAction (see
    // features/jobs/hooks.ts) already fires on every job write to invalidate
    // this on demand, but relying on that alone still leaves a window where a
    // page genuinely IS stale (the revalidation race, a request that lands
    // mid-revalidation, etc.) — a confusing bug for something HR expects to be
    // immediate. These are low-traffic pages; a live backend hit per request
    // is a trivial cost next to that correctness guarantee.
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
  return (await res.json()) as Job[];
}

/** A single posting. Returns null when the id doesn't exist (renders not-found). */
export async function fetchJob(id: string): Promise<Job | null> {
  const res = await fetch(`${serverApiBase()}/api/jobs/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load job (${res.status})`);
  return (await res.json()) as Job;
}
