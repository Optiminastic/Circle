/**
 * Client-side resource registry — mirrors the backend's `domain/registry.py`.
 * One declaration per resource (slug + primary-key field).
 */

export const RESOURCES = {
  authUsers: { slug: 'auth-users', idField: 'id' },
  schedules: { slug: 'schedules', idField: 'id' },
  jobs: { slug: 'jobs', idField: 'id' },
  candidates: { slug: 'candidates', idField: 'id' },
  testInvites: { slug: 'test-invites', idField: 'id' },
  docRequests: { slug: 'doc-requests', idField: 'id' },
  interviews: { slug: 'interviews', idField: 'id' },
  iqTests: { slug: 'iq-tests', idField: 'id' },
  assignments: { slug: 'assignments', idField: 'id' },
  bgvs: { slug: 'bgvs', idField: 'candidateId' },
  onboarding: { slug: 'onboarding', idField: 'candidateId' },
  employees: { slug: 'employees', idField: 'id' },
  assets: { slug: 'assets', idField: 'id' },
  emailTemplates: { slug: 'email-templates', idField: 'id' },
  // HR's edits to the built-in transactional emails, keyed by template id. Only
  // edited templates get a row; the rest fall back to the built-in copy.
  emailTemplateOverrides: { slug: 'email-template-overrides', idField: 'id' },
  sentEmails: { slug: 'sent-emails', idField: 'id' },
  offboarding: { slug: 'offboarding', idField: 'employeeId' },
  exitHandovers: { slug: 'exit-handovers', idField: 'employeeId' },
  candidateHandoffs: { slug: 'candidate-handoffs', idField: 'candidateId' },
  // Question Library banks (shared across devices via the backend, not localStorage).
  assessmentBanks: { slug: 'assessment-banks', idField: 'id' },
  interviewBanks: { slug: 'interview-banks', idField: 'id' },
  screeningBanks: { slug: 'screening-banks', idField: 'id' },
  iqBank: { slug: 'iq-bank', idField: 'id' },
} as const;

export type ResourceKey = keyof typeof RESOURCES;
export type ResourceSlug = (typeof RESOURCES)[ResourceKey]['slug'];
