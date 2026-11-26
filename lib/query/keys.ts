import type { PageParams } from '@/lib/api/resource-repository';

/** Query key for a paginated list — includes every param that changes what
 *  comes back (page, page size, search, sort), so two different pages/
 *  filters are never confused for the same cached data, and changing any of
 *  them (e.g. a new search term) is itself a cache-key change rather than a
 *  manual invalidation. See docs/PERFORMANCE_AUDIT.md P0-2. There is no
 *  per-org/user context to include — this app has no multi-tenant concept
 *  (see docs/PERFORMANCE_AUDIT.md's "Not a problem" section). */
function pageKey(resource: string, params: PageParams) {
  return [
    resource,
    'page',
    params.page ?? 1,
    params.limit,
    params.search ?? '',
    params.sortBy ?? '',
    params.sortOrder ?? 'asc',
  ] as const;
}

/** Centralized query-key factory — avoids stringly-typed keys scattered in hooks. */
export const qk = {
  jobs: {
    all: ['jobs'] as const,
    detail: (id: string) => ['jobs', id] as const,
    page: (params: PageParams) => pageKey('jobs', params),
  },
  schedules: { all: ['schedules'] as const },
  candidates: {
    all: ['candidates'] as const,
    detail: (id: string) => ['candidates', id] as const,
    page: (params: PageParams) => pageKey('candidates', params),
  },
  testInvites: {
    all: ['test-invites'] as const,
    detail: (id: string) => ['test-invites', id] as const,
  },
  docRequests: {
    all: ['doc-requests'] as const,
    detail: (id: string) => ['doc-requests', id] as const,
    page: (params: PageParams) => pageKey('doc-requests', params),
  },
  interviews: {
    all: ['interviews'] as const,
    page: (params: PageParams) => pageKey('interviews', params),
  },
  iqTests: { all: ['iq-tests'] as const },
  assignments: { all: ['assignments'] as const },
  bgvs: { all: ['bgvs'] as const },
  onboarding: { all: ['onboarding'] as const },
  employees: {
    all: ['employees'] as const,
    detail: (id: string) => ['employees', id] as const,
    page: (params: PageParams) => pageKey('employees', params),
  },
  assets: { all: ['assets'] as const },
  emailTemplates: { all: ['email-templates'] as const },
  emailTemplateOverrides: { all: ['email-template-overrides'] as const },
  sentEmails: { all: ['sent-emails'] as const },
  // Per candidate rather than a single list: a call carries its whole
  // transcript, so the UI must never pull everyone's at once.
  screeningCalls: { forCandidate: (id: string) => ['screening-calls', id] as const },
  offboarding: { all: ['offboarding'] as const },
  assessmentBanks: {
    all: ['assessment-banks'] as const,
    detail: (id: string) => ['assessment-banks', id] as const,
  },
  interviewKitSends: { all: ['interview-kit-sends'] as const },
  interviewBanks: {
    all: ['interview-banks'] as const,
    detail: (id: string) => ['interview-banks', id] as const,
  },
  screeningBanks: {
    all: ['screening-banks'] as const,
    detail: (id: string) => ['screening-banks', id] as const,
  },
  iqBank: { all: ['iq-bank'] as const },
  assignmentBanks: {
    all: ['assignment-banks'] as const,
    detail: (id: string) => ['assignment-banks', id] as const,
  },
  joiningConfirmations: { all: ['joining-confirmations'] as const },
} as const;
