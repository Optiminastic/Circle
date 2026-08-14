// Same candidate detail page as /candidates/[id], rendered under a job's
// applicants list so the browser back button (and the not-found state's
// "Back" link) return to /jobs/[jobId]/applicants instead of the generic
// candidates list. The component reads params.candidateId itself (see
// candidates/[id]/page.tsx) — no wrapping/props needed.
export { default } from '../../../../candidates/[id]/page';
