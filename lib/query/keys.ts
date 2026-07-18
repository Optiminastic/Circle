/** Centralized query-key factory — avoids stringly-typed keys scattered in hooks. */
export const qk = {
  jobs: { all: ['jobs'] as const, detail: (id: string) => ['jobs', id] as const },
  schedules: { all: ['schedules'] as const },
  candidates: { all: ['candidates'] as const, detail: (id: string) => ['candidates', id] as const },
  testInvites: {
    all: ['test-invites'] as const,
    detail: (id: string) => ['test-invites', id] as const,
  },
  docRequests: {
    all: ['doc-requests'] as const,
    detail: (id: string) => ['doc-requests', id] as const,
  },
  interviews: { all: ['interviews'] as const },
  iqTests: { all: ['iq-tests'] as const },
  assignments: { all: ['assignments'] as const },
  bgvs: { all: ['bgvs'] as const },
  onboarding: { all: ['onboarding'] as const },
  employees: { all: ['employees'] as const, detail: (id: string) => ['employees', id] as const },
  assets: { all: ['assets'] as const },
  emailTemplates: { all: ['email-templates'] as const },
  emailTemplateOverrides: { all: ['email-template-overrides'] as const },
  sentEmails: { all: ['sent-emails'] as const },
  offboarding: { all: ['offboarding'] as const },
  assessmentBanks: {
    all: ['assessment-banks'] as const,
    detail: (id: string) => ['assessment-banks', id] as const,
  },
  interviewBanks: {
    all: ['interview-banks'] as const,
    detail: (id: string) => ['interview-banks', id] as const,
  },
  screeningBanks: {
    all: ['screening-banks'] as const,
    detail: (id: string) => ['screening-banks', id] as const,
  },
  iqBank: { all: ['iq-bank'] as const },
} as const;
