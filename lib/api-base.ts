/**
 * Resolve the backend API origin.
 *
 * Priority:
 *  1. `NEXT_PUBLIC_API_URL` if set — REQUIRED in production (the backend lives on
 *     a different domain there, e.g. https://api.example.com). Set it in your host's
 *     env (on Vercel: Project → Settings → Environment Variables) and redeploy.
 *  2. Development only: derive `http://<page-host>:8000` so the app works on
 *     localhost AND from a phone/other device over the LAN without any config.
 *  3. Production with no explicit URL: fall back to the SAME origin (relative
 *     `/api/...`). This is correct only if the API is reverse-proxied under the
 *     web domain; for a separate API domain you MUST set NEXT_PUBLIC_API_URL.
 *
 * Returns an origin with no trailing slash, or '' for same-origin (the HTTP
 * client always appends `/api/...`).
 */
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '8000';

export function apiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    // "localhost" resolves to ::1 before 127.0.0.1. uvicorn binds 0.0.0.0 only
    // (IPv4), so every request tries IPv6 first, fails, then falls back --
    // measured at ~210ms of dead time per request against ~3ms via the IPv4
    // literal. Next's dev server binds both stacks, which is why only API calls
    // were slow. Target the IPv4 address directly; any other hostname (a LAN IP
    // from a phone, an ngrok host) is passed through untouched.
    const host =
      window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    return `${window.location.protocol}//${host}:${API_PORT}`;
  }

  // Same-origin fallback (relative). Set NEXT_PUBLIC_API_URL for a separate API host.
  return '';
}
