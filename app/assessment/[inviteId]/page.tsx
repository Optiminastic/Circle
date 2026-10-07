import { redirect } from 'next/navigation';

/**
 * Old assessment links. Assessments now run on the shared test page, where the
 * server holds the answer key and grades the attempt; this page used to grade
 * in the browser. Kept only so links already sent to candidates still work.
 */
export default async function LegacyAssessmentPage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  redirect(`/test/${encodeURIComponent(inviteId)}`);
}
