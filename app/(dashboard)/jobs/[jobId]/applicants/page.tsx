'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CandidateListView } from '@/components/CandidateListView';
import { PageLoading } from '@/components/PageLoading';
import { useUiStore } from '@/store/ui-store';
import { useScheduler } from '@/store/schedule-store';
import { useJob } from '@/features/jobs/hooks';
import { useCandidates, useCandidateMutations } from '@/features/candidates/hooks';
import { ArrowLeft, Briefcase, MapPin } from 'lucide-react';

/** Dedicated page listing everyone who applied to one job posting — the same
 *  full candidates experience (search, filters, profile, shortlist) scoped to
 *  that role. */
export default function JobApplicantsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? '';

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates();
  const { setSelectedCandidateId } = useUiStore();
  const { openSchedule } = useScheduler();
  const { create, remove } = useCandidateMutations();

  if (jobLoading || candidatesLoading) return <PageLoading />;

  if (!job) {
    return (
      <div className="bg-[#F7F4EE] border border-dashed border-[#CFC8BA] rounded-2xl py-16 flex flex-col items-center gap-3 text-center px-6 text-xs">
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
      {/* Job context banner */}
      <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-2xl px-4 py-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-3 text-xs select-none">
        <Link
          href="/jobs"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-accent-700 transition shrink-0"
        >
          <ArrowLeft size={14} /> Job Postings
        </Link>
        <span className="hidden sm:block w-px h-8 bg-[#E6E1D8]" />
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
            <Briefcase size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-[13px] truncate">
              {job.title}
              <span className="ml-2 text-[10px] font-mono font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full align-middle">
                {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
              </span>
            </h2>
            <p className="text-[10px] text-gray-500 font-mono flex items-center gap-2 flex-wrap">
              <span>
                {job.id} · {job.department}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {job.location}
              </span>
              <span>{job.employmentType}</span>
              <span>{job.workMode}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Same candidates experience, scoped to this job's applicants */}
      <CandidateListView
        showHeader={false}
        candidates={applicants}
        onSelectCandidate={setSelectedCandidateId}
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
