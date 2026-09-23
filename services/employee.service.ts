import { Candidate, CredentialRecord, Employee } from '@/types';
import { randomId, todayISO } from '@/lib/utils';

/** Everything the new employee record needs that the candidate record cannot supply. */
export interface EmployeeProvisioning {
  /** Company mailbox HR created in Google Admin and entered at onboarding step 6. */
  companyEmail: string;
  /** Server-allocated code, used as the employee's primary key. */
  employeeCode: string;
  /** The HR user performing the conversion, recorded on credentials they grant. */
  grantedBy: string;
}

/** Build a new employee record when a candidate finishes onboarding.
 *
 * Fields with no trustworthy source are left empty for HR to fill rather than
 * guessed — an invented reporting manager or work location reads as real data
 * and is worse than a blank.
 */
export function buildEmployeeFromCandidate(
  candidate: Candidate,
  provisioning: EmployeeProvisioning,
): Employee {
  const companyEmail = provisioning.companyEmail.trim().toLowerCase();
  return {
    id: provisioning.employeeCode,
    fullName: candidate.fullName,
    email: companyEmail,
    personalEmail: candidate.email,
    phone: candidate.phone,
    department: candidate.department,
    role: candidate.appliedRole,
    reportingManager: '',
    joiningDate: todayISO(),
    workLocation: candidate.location || '',
    status: 'Active',
    // Keep the link + agreed pay so the employee file can show BGV/docs/offer history.
    candidateId: candidate.id,
    annualCtc: candidate.expectedCtc || candidate.currentCtc || '',
    personalDetails: {
      address: candidate.location,
      emergencyContact: '',
      bankAccount: '',
    },
    // Only the mailbox HR actually created. Every other system is granted
    // explicitly from the employee profile, which records the real grantor.
    credentials: [
      {
        id: randomId('CRE'),
        systemName: 'Google Workspace',
        assignedEmail: companyEmail,
        accessLevel: 'Standard',
        dateGranted: todayISO(),
        grantedBy: provisioning.grantedBy,
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
