'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CandidateListView } from '@/components/CandidateListView';
import { PageLoading } from '@/components/PageLoading';
import { useScheduler } from '@/store/schedule-store';
import { useJob } from '@/features/jobs/hooks';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';
import { ArrowLeft, MapPin } from 'lucide-react';

/** Dedicated page listing everyone who applied to one job posting — the same
 *  full candidates experience (search, filters, profile, shortlist) scoped to
 *  that role. */
export default function JobApplicantsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? '';

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates();
  const router = useRouter();
  const { openSchedule } = useScheduler();
  const { create, remove } = useCandidateMutations();

  if (jobLoading || candidatesLoading) return <PageLoading />;

  if (!job) {
    return (
      <div className="bg-[#FFFFFF] border border-dashed border-[#D7DAE0] rounded-2xl py-16 flex flex-col items-center gap-3 text-center px-6 text-xs">
        <p className="font-bold text-gray-700 text-sm">Job posting not found</p>
        <p className="text-[11px] text-gray-500">It may have been deleted.</p>
        <Link
          href="/jobs"
          className="mt-1 bg-accent-600 hover:bg-accent-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition font-medium"
        >
          <ArrowLeft size={14} /> Back to Job Postings
        </Link>
      </div>
    );
  }

  const applicants = candidates.filter(c => c.jobId === jobId);

  return (
    <div className="space-y-4">
      {/* Compact job context (global breadcrumb is rendered by the shell) */}
      <div className="space-y-2 select-none">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-bold text-gray-900 text-base">{job.title}</h1>
          <span className="text-[10px] font-mono font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
            {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
          </span>
          <span className="text-[10px] text-gray-500 font-mono flex items-center gap-2 flex-wrap">
            <span>{job.department}</span>
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {job.location}
            </span>
            <span>{job.employmentType}</span>
            <span>{job.workMode}</span>
          </span>
        </div>
      </div>

      {/* Same candidates experience, scoped to this job's applicants */}
      <CandidateListView
        showHeader={false}
        candidates={applicants}
        onSelectCandidate={id => router.push(`/candidates/${id}`)}
        onAddCandidate={candidate =>
          create.mutate({
            ...candidate,
            jobId,
            appliedRole: job.title,
            department: job.department,
            sourceOfApplication: 'Job Posting',
          })
        }
        onDeleteCandidate={id => remove.mutate(id)}
        onShortlistCandidate={(id, name) => openSchedule(id, name, 'HR Call')}
      />
    </div>
  );
}
