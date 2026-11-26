/**
 * Dedicated job-postings search/pagination endpoint — a separate contract
 * from the generic ResourceRepository.listPaginated() because two of
 * JobListView.tsx's sort options (applicant count, parsed salary) are
 * derived server-side, not stored fields. See
 * circle-be/app/services/job_search.py and app/api/routes/job_search.py.
 */

import { http } from '@/lib/http/client';
import { Pagination } from '@/lib/api/resource-repository';
import { Job } from '@/types';

export type JobSortKey = 'title' | 'exp' | 'salary' | 'status' | 'applicants';

export interface JobSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: JobSortKey;
  sortOrder?: 'asc' | 'desc';
}

/** A Job as returned by this endpoint — always carries the computed
 *  applicant count, so the frontend never needs the full candidates table
 *  just to show "N applicants" on a row. */
export type JobWithApplicantCount = Job & { applicantCount: number };

export interface JobSearchSummary {
  totalJobs: number;
  openCount: number;
  closedCount: number;
  totalApplicants: number;
}

export interface JobSearchResult {
  data: JobWithApplicantCount[];
  pagination: Pagination;
  summary: JobSearchSummary;
}

export function searchJobs(params: JobSearchParams, signal?: AbortSignal): Promise<JobSearchResult> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  return http.get<JobSearchResult>(`/jobs/search?${qs.toString()}`, signal);
}
