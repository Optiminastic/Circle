/**
 * Client-side resource registry — mirrors the backend's `domain/registry.py`.
 * One declaration per resource (slug + primary-key field).
 */

export const RESOURCES = {
  authUsers: { slug: 'auth-users', idField: 'id' },
  schedules: { slug: 'schedules', idField: 'id' },
  jobs: { slug: 'jobs', idField: 'id' },
  candidates: { slug: 'candidates', idField: 'id' },
  interviews: { slug: 'interviews', idField: 'id' },
  iqTests: { slug: 'iq-tests', idField: 'id' },
  assignments: { slug: 'assignments', idField: 'id' },
  bgvs: { slug: 'bgvs', idField: 'candidateId' },
  onboarding: { slug: 'onboarding', idField: 'candidateId' },
  employees: { slug: 'employees', idField: 'id' },
  assets: { slug: 'assets', idField: 'id' },
  emailTemplates: { slug: 'email-templates', idField: 'id' },
  sentEmails: { slug: 'sent-emails', idField: 'id' },
  offboarding: { slug: 'offboarding', idField: 'employeeId' },
} as const;

export type ResourceKey = keyof typeof RESOURCES;
export type ResourceSlug = (typeof RESOURCES)[ResourceKey]['slug'];
