import {
  AssetRecord,
  Assignment,
  AuthUser,
  BGVRequirement,
  Candidate,
  EmailTemplate,
  Employee,
  IQTest,
  Interview,
  Job,
  OffboardingWorkflow,
  OnboardingChecklist,
  ScheduleEvent,
  SentEmailLog,
} from '@/types';
import { RESOURCES } from './resources';
import { ResourceRepository } from './resource-repository';

/** Typed repository instances — the single place HTTP resources are bound to models. */
export const repositories = {
  authUsers: new ResourceRepository<AuthUser>(RESOURCES.authUsers.slug),
  schedules: new ResourceRepository<ScheduleEvent>(RESOURCES.schedules.slug),
  jobs: new ResourceRepository<Job>(RESOURCES.jobs.slug),
  candidates: new ResourceRepository<Candidate>(RESOURCES.candidates.slug),
  interviews: new ResourceRepository<Interview>(RESOURCES.interviews.slug),
  iqTests: new ResourceRepository<IQTest>(RESOURCES.iqTests.slug),
  assignments: new ResourceRepository<Assignment>(RESOURCES.assignments.slug),
  bgvs: new ResourceRepository<BGVRequirement>(RESOURCES.bgvs.slug),
  onboarding: new ResourceRepository<OnboardingChecklist>(RESOURCES.onboarding.slug),
  employees: new ResourceRepository<Employee>(RESOURCES.employees.slug),
  assets: new ResourceRepository<AssetRecord>(RESOURCES.assets.slug),
  emailTemplates: new ResourceRepository<EmailTemplate>(RESOURCES.emailTemplates.slug),
  sentEmails: new ResourceRepository<SentEmailLog>(RESOURCES.sentEmails.slug),
  offboarding: new ResourceRepository<OffboardingWorkflow>(RESOURCES.offboarding.slug),
} as const;
