import { BGVRequirement, Candidate, OnboardingChecklist } from '@/types';
import { randomId, todayISO } from '@/lib/utils';

/**
 * Business rule: every new candidate gets a pre-registered BGV record.
 * `services` are the rate-card shortforms HR selected (e.g. ["IDV", "PAV"]).
 */
export function buildBgvForCandidate(candidate: Candidate, services: string[] = []): BGVRequirement {
  return {
    id: randomId('BGV'),
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    appliedRole: candidate.appliedRole,
    services,
    documents: [
      { type: 'Aadhaar card', status: 'Pending' },
      { type: 'PAN card', status: 'Pending' },
      { type: 'Address proof', status: 'Pending' },
      { type: 'NDA', status: 'Pending' },
      { type: 'Employment agreement', status: 'Pending' },
    ],
    overallStatus: 'Pending',
    verificationTimeline: [
      {
        date: todayISO(),
        action: services.length
          ? `BGV started — checks requested: ${services.join(', ')}`
          : 'BGV instance pre-registered in pipeline',
        performedBy: 'Circle Engine Automation',
      },
    ],
  };
}

/** Business rule: shortlisting a candidate spins up an onboarding checklist. */
export function buildOnboardingForCandidate(candidate: Candidate): OnboardingChecklist {
  return {
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    candidateEmail: candidate.email,
    onboardingStatus: 'Offer Accepted',
    progressPercentage: 40,
    tasks: [
      {
        id: randomId('T', 10000, 0),
        title: 'Verify core identity documents (Aadhaar/PAN)',
        isChecked: true,
        category: 'Documentation',
      },
      {
        id: randomId('T', 10000, 0),
        title: 'Gather previous company reference verification letters',
        isChecked: false,
        category: 'Documentation',
      },
      {
        id: randomId('T', 10000, 0),
        title: 'Sign Master Employment Agreement & NDA',
        isChecked: false,
        category: 'Documentation',
      },
      {
        id: randomId('T', 10000, 0),
        title: 'Provision workstation laptop',
        isChecked: false,
        category: 'Admin & Assets',
      },
      {
        id: randomId('T', 10000, 0),
        title: 'Generate corporate G-Suite Gmail identity',
        isChecked: false,
        category: 'IT Setup',
      },
    ],
  };
}
