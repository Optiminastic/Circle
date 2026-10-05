'use server';

/**
 * Revalidation for the PUBLIC job pages (`/careers`, `/jobs/[jobId]`).
 *
 * Those pages fetch job data server-side with `next: { revalidate: 60 }`
 * (see lib/api/server.ts) for fast, cacheable public pages — but that only
 * refreshes on a timer, so an HR edit (status, extra questions, anything)
 * could sit stale for up to a minute, or longer on a page that isn't
 * revisited often enough to trigger the background refresh. Call this right
 * after any job create/update/status-change/delete so the public pages pick
 * it up immediately instead of waiting out the window.
 */
import { revalidatePath } from 'next/cache';

export async function revalidatePublicJobAction(jobId?: string): Promise<void> {
  revalidatePath('/careers');
  if (jobId) revalidatePath(`/jobs/${jobId}`);
}
