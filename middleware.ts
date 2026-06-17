import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Host-based routing for the public careers site.
 *
 * The careers experience lives at `careers.optiminastic.com`. When a request
 * arrives on that subdomain we transparently rewrite its root to `/careers`
 * (the listing) so visitors see the careers page at the bare host. Job links
 * (`/jobs/[jobId]`) already resolve on the same host, so they work unchanged.
 *
 * In local dev (no subdomain) just open `/careers` directly.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const url = req.nextUrl;

  const isCareersHost = host.startsWith('careers.');
  if (isCareersHost && url.pathname === '/') {
    const rewritten = url.clone();
    rewritten.pathname = '/careers';
    return NextResponse.rewrite(rewritten);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes, and static assets.
  matcher: ['/((?!_next/|api/|favicon.ico|.*\\..*).*)'],
};
