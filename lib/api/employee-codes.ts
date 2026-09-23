/**
 * Employee code allocation.
 *
 * Codes are the primary key of the `employees` table, so they are minted
 * server-side from a Postgres sequence rather than generated in the browser.
 * The old client-side `randomId('EMP', 9000, 1000)` drew a random number with
 * no uniqueness check, which silently overwrote an existing employee on a
 * collision.
 */

import { http } from '@/lib/http/client';

export interface AllocatedEmployeeCode {
  employeeCode: string;
}

/** Reserve the next employee code. Each call returns a distinct, unused code. */
export function allocateEmployeeCode(): Promise<AllocatedEmployeeCode> {
  return http.post<AllocatedEmployeeCode>('/employee-codes/allocate', {});
}
