# CLAUDE.md — Frontend (circle-fe)

Conventions for the Next.js (App Router) careers + HR frontend. Read this before
changing the public careers/apply flow or anything that talks to the backend.

## Golden rules

1. **The browser is untrusted.** All validation, authorization, and trust-
   sensitive fields are enforced by the FastAPI backend (see `circle-be/CLAUDE.md`).
   Never put a security decision in client code — it's fully readable.
2. **No secrets in the client bundle.** Only `NEXT_PUBLIC_*` env vars reach the
   browser. Anything sensitive (e.g. `INTERNAL_API_TOKEN`) must stay server-side.

## Public careers / apply flow (hardened)

The public apply page must not expose backend endpoints to the browser. Every
public operation goes through a **Next.js server action**, never a client fetch:

- UI: `components/jobs/ApplyForm.tsx` (a `'use client'` component) calls the
  actions — it never calls `/api/public/*` directly.
- Actions: `lib/actions/public.ts` (`'use server'`) — `checkAppliedAction`,
  `requestOtpAction`, `verifyOtpAction`, `submitApplicationAction`.
- Server caller: `lib/server/backend.ts` (server-only) — adds the shared
  `X-Internal-Token` secret and forwards the real client IP, then calls FastAPI.
- `lib/api/public.ts` is **types only** — no client-side endpoint calls live there.

Why: the browser's Network tab shows only same-origin server-action calls, and
the backend rejects any direct `/api/public/*` call that lacks the internal
token (so a copied cURL can't replay it). This is the server-side-enforcement
rule from the backend CLAUDE.md, applied at the edge.

**When adding a new public/unauthenticated operation:** add a server action +
a gated backend endpoint. Do not call the backend from a client component, and
do not rely on origin/CSRF checks alone.

## Env

- `NEXT_PUBLIC_API_URL` — backend origin used by the **browser**.
- `INTERNAL_API_TOKEN` — server-only; must equal the backend's value. Set it in
  the host env (Vercel) in production, never commit it.
- `API_INTERNAL_URL` — optional server-only backend URL override.

## Before done

Run `pnpm build` (type-check + build) and confirm no `console.log` of user data
or secrets ships in client code.
