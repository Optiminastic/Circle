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

/**
 * The name of whoever referred this candidate, or null when they did not come
 * through a referral.
 *
 * `referralDetails` is NOT always a person: for a public application from any
 * other source it carries a provenance note ("Applied via public posting
 * JOB-1875"), so it only reads as a name once the source itself says Referral.
 * Matched case-insensitively — HR can type their own source values, and the
 * public apply form stores the exact string "Referral".
 */
export function referrerName(
  candidate: Pick<Candidate, 'sourceOfApplication' | 'referralDetails'>,
): string | null {
  if (candidate.sourceOfApplication?.trim().toLowerCase() !== 'referral') return null;
  return candidate.referralDetails?.trim() || null;
}

/**
 * Bring a rejected candidate back into the active pipeline, returning the
 * patched record for the caller to persist.
 *
 * Clears EVERY stage decision set to 'Rejected' and drops `decidedAt`, so the
 * pipeline stage re-derives from their remaining (untouched) stage decisions and
 * schedules instead of reading as decided. Clearing all of them matters: the
 * candidate detail page stops the stepper at the first stage whose decision is
 * 'Rejected', so a single leftover entry would keep showing them as stopped
 * there even though their status is active again.
 */
export function revertCandidateRejection(candidate: Candidate): Candidate {
  const stageDecisions = Object.fromEntries(
    Object.entries(candidate.stageDecisions ?? {}).filter(([, d]) => d !== 'Rejected'),
  );
  return { ...candidate, status: 'Under Review', decidedAt: undefined, stageDecisions };
}
