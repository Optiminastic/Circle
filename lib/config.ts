/**
 * Workspace configuration — sourced from env (set in .env.local), not hardcoded.
 * Leave the env vars unset to show blank fields instead of placeholder identity.
 */
export const workspace = {
  name: process.env.NEXT_PUBLIC_WORKSPACE_NAME ?? '',
  domain: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? '',
};

/** Fixed office location for in-person (offline) interviews. */
export const OFFICE_LOCATION_URL =
  process.env.NEXT_PUBLIC_OFFICE_LOCATION_URL ?? 'https://maps.app.goo.gl/BHh8HKAkVyUT6syT8';

/** Shared HR account — used as the organizer on interview calendar invites. */
export const HR_EMAIL = process.env.NEXT_PUBLIC_HR_EMAIL ?? 'tech5@optiminastic.com';
