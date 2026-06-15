import { Employee } from '@/types';
import { BRAND } from '@/lib/brand';

/**
 * The "acting HR" identity the system speaks as — derived from the Employee
 * Directory (no seed data). Whoever is added with an HR department/role becomes
 * the face of the recruitment system: their initials/photo show on the pipeline,
 * and their name signs the candidate-facing emails.
 *
 * Falls back to the generic "{Brand} HR Team" until an HR employee exists.
 */
export interface HrIdentity {
  employee: Employee | null;
  name: string;
  role: string;
  initials: string;
  avatarUrl?: string;
  /** Multi-line e-mail sign-off (name + role line, or the generic team name). */
  signoff: string;
}

const isHrEmployee = (e: Employee) =>
  /human\s*resources|\bhr\b|people\s*ops|talent/i.test(e.department) ||
  /human\s*resources|\bhr\b|recruit|talent/i.test(e.role);

const initialsOf = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'HR';

export function resolveHr(employees: Employee[]): HrIdentity {
  const matches = employees.filter(isHrEmployee);
  const emp = matches.find(e => e.status === 'Active') ?? matches[0] ?? null;

  if (!emp) {
    return {
      employee: null,
      name: `${BRAND.name} HR Team`,
      role: 'HR Team',
      initials: 'HR',
      signoff: `${BRAND.company} HR Team`,
    };
  }

  const role = emp.role?.trim() || 'HR';
  return {
    employee: emp,
    name: emp.fullName,
    role,
    initials: initialsOf(emp.fullName),
    avatarUrl: emp.avatarUrl,
    signoff: `${emp.fullName}\n${role}, ${BRAND.company}`,
  };
}
