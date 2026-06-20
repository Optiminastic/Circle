import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BRAND } from '@/lib/brand';

const CAREERS_HOST = BRAND.careersHost; // careers.optiminastic.com

// The backend API origin (from NEXT_PUBLIC_API_URL). In production this is an
// https URL already covered by the `https:` source; in local dev it's the http
// backend (e.g. http://localhost:8000), which the browser would otherwise block
// — so it's added to connect-src explicitly. Empty/same-origin needs nothing.
const API_ORIGIN = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_API_URL;
    return url ? new URL(url).origin : '';
  } catch {
    return '';
  }
})();

// Security headers for the PUBLIC, world-facing pages (careers + job postings).
// Hardens against clickjacking, MIME sniffing, referrer leakage and XSS. Applied
// here (not next.config) so they also cover the rewritten careers-host root.
// 'unsafe-inline'/'unsafe-eval' are required by Next's runtime; React escapes
// output and the backend strips angle brackets, so stored XSS is neutralised.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Allow XHR/fetch to self, any https API, and the configured backend origin
  // (lets the public apply page reach the http dev backend; harmless in prod).
  `connect-src ${["'self'", 'https:', API_ORIGIN].filter(Boolean).join(' ')}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('Content-Security-Policy', CSP);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  return res;
}

/**
 * Host-based routing + security hardening for the public careers site.
 *
 * The careers experience lives at `careers.optiminastic.com`. On that subdomain:
 *  - the bare host (`/`) is rewritten to `/careers` (the listing);
 *  - only the public careers pages and job postings (`/careers`, `/jobs/[id]`)
 *    are reachable — everything else (the HR dashboard, login, etc.) redirects
 *    back to `/careers`, so the internal app is never exposed on this host.
 *
 * On the HR host (e.g. `circle.optiminastic.com`) the careers pages have a single
 * canonical home: `/careers` there permanently redirects to the careers subdomain.
 *
 * Public page responses additionally carry strict security headers (CSP etc.).
 * In local dev (no subdomain) the redirect is skipped, so `/careers` opens directly.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const url = req.nextUrl;
  const { pathname } = url;

  const isCareersHost = host.startsWith('careers.');
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  // A public, world-facing page — gets the hardened headers regardless of host.
  const isPublicPath =
    pathname === '/careers' || pathname.startsWith('/careers/') || pathname.startsWith('/jobs/');

  // On any non-careers production host (e.g. circle.optiminastic.com), the
  // careers page's canonical home is the careers subdomain — send it there.
  if (!isCareersHost && !isLocal) {
    if (pathname === '/careers' || pathname.startsWith('/careers/')) {
      return NextResponse.redirect(`https://${CAREERS_HOST}/`, 308);
    }
  }

  if (!isCareersHost) {
    return isPublicPath ? withSecurityHeaders(NextResponse.next()) : NextResponse.next();
  }

  // --- Careers host below: everything here is the public site. ---

  // Bare host -> careers listing.
  if (pathname === '/') {
    const rewritten = url.clone();
    rewritten.pathname = '/careers';
    return withSecurityHeaders(NextResponse.rewrite(rewritten));
  }

  // Public pages allowed on the careers subdomain: the listing and job postings
  // (each posting doubles as its application page).
  const isPublic =
    pathname === '/careers' ||
    pathname.startsWith('/careers/') ||
    pathname === '/jobs' ||
    pathname.startsWith('/jobs/');
  if (isPublic) return withSecurityHeaders(NextResponse.next());

  // Anything else isn't part of the public careers site — bounce to the listing.
  const redirect = url.clone();
  redirect.pathname = '/careers';
  redirect.search = '';
  return NextResponse.redirect(redirect);
}

export const config = {
  // Skip Next internals, API routes, and static assets.
  matcher: ['/((?!_next/|api/|favicon.ico|.*\\..*).*)'],
};
