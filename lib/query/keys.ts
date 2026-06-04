/** Centralized query-key factory — avoids stringly-typed keys scattered in hooks. */
export const qk = {
  jobs: { all: ['jobs'] as const, detail: (id: string) => ['jobs', id] as const },
  schedules: { all: ['schedules'] as const },
  candidates: { all: ['candidates'] as const, detail: (id: string) => ['candidates', id] as const },
  interviews: { all: ['interviews'] as const },
  iqTests: { all: ['iq-tests'] as const },
  assignments: { all: ['assignments'] as const },
  bgvs: { all: ['bgvs'] as const },
  onboarding: { all: ['onboarding'] as const },
  employees: { all: ['employees'] as const, detail: (id: string) => ['employees', id] as const },
  assets: { all: ['assets'] as const },
  emailTemplates: { all: ['email-templates'] as const },
  sentEmails: { all: ['sent-emails'] as const },
  offboarding: { all: ['offboarding'] as const },
} as const;
