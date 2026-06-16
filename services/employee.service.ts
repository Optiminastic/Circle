import { Candidate, CredentialRecord, Employee } from '@/types';
import { randomId, todayISO } from '@/lib/utils';

/** Build a new employee record when a candidate finishes onboarding. */
export function buildEmployeeFromCandidate(candidate: Candidate): Employee {
  const mailbox = `${candidate.fullName.toLowerCase().replace(/\s+/g, '')}@optiprime.io`;
  return {
    id: randomId('EMP', 9000, 1000),
    fullName: candidate.fullName,
    email: candidate.email,
    phone: candidate.phone,
    department: candidate.department,
    role: candidate.appliedRole,
    reportingManager: 'Richard Feynman (CEO)',
    joiningDate: todayISO(),
    workLocation: candidate.location || 'Mumbai, India',
    status: 'Active',
    // Keep the link + agreed pay so the employee file can show BGV/docs/offer history.
    candidateId: candidate.id,
    annualCtc: candidate.expectedCtc || candidate.currentCtc || '',
    personalDetails: {
      address: candidate.location,
      emergencyContact: 'Notified on day 1 form',
      bankAccount: 'Bank details verification cleared',
    },
    credentials: [
      {
        id: randomId('CRE'),
        systemName: 'G-Suite Workspace',
        assignedEmail: mailbox,
        accessLevel: 'Standard',
        dateGranted: todayISO(),
        grantedBy: 'Sarah Jenkins',
        status: 'Active',
      },
      {
        id: randomId('CRE'),
        systemName: 'Figma Team',
        assignedEmail: mailbox,
        accessLevel: 'Standard',
        dateGranted: todayISO(),
        grantedBy: 'Sarah Jenkins',
        status: 'Active',
      },
    ],
  };
}

export function suspendAllCredentials(employee: Employee): Employee {
  const credentials: CredentialRecord[] = (employee.credentials || []).map(c => ({
    ...c,
    status: 'Suspended',
  }));
  return { ...employee, status: 'Offboarded', credentials };
}

export function setCredentialStatus(employee: Employee, credId: string, status: string): Employee {
  return {
    ...employee,
    credentials: (employee.credentials || []).map(c =>
      c.id === credId ? { ...c, status: status as any } : c,
    ),
  };
}
