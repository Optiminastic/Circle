/**
 * Dedicated candidates search/pagination endpoint — a separate contract
 * from the generic ResourceRepository.listPaginated() because
 * CandidateListView.tsx's stage-status/CTC-band/keyword-band filters are
 * cross-resource/derived, not stored fields. See
 * circle-be/app/services/candidate_search.py and
 * app/api/routes/candidate_search.py, and candidate_pipeline.py for the
 * stage-status derivation this mirrors exactly from lib/pipeline.ts.
 */

import { http } from '@/lib/http/client';
import { Pagination } from '@/lib/api/resource-repository';
import { Candidate } from '@/types';
import { StageStatus } from '@/lib/pipeline';

export interface CandidateSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  stageStatus?: string;
  source?: string;
  rejected?: 'all' | 'rejected';
  maxNoticePeriod?: number;
  minExperience?: number;
  ctcBand?: 'all' | 'lt5' | '5to10' | '10to20' | 'gte20' | 'custom';
  ctcMin?: string;
  ctcMax?: string;
  keywordBand?: 'all' | 'high' | 'medium' | 'low' | 'none';
  /** Scopes the result to one job's applicants (the Applicants tab). */
  jobId?: string;
}

/** A Candidate as returned by this endpoint — always carries the
 *  server-computed pipeline stage, so the frontend never needs the full
 *  schedules/interviews/iqTests/testInvites tables just to show it. */
export type CandidateWithStage = Candidate & { stageStatus: StageStatus };

export interface CandidateSearchResult {
  data: CandidateWithStage[];
  pagination: Pagination;
}

export function searchCandidates(
  params: CandidateSearchParams,
  signal?: AbortSignal,
): Promise<CandidateSearchResult> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.department && params.department !== 'All') qs.set('department', params.department);
  if (params.stageStatus && params.stageStatus !== 'All') qs.set('stageStatus', params.stageStatus);
  if (params.source && params.source !== 'All') qs.set('source', params.source);
  if (params.rejected) qs.set('rejected', params.rejected);
  if (params.maxNoticePeriod != null) qs.set('maxNoticePeriod', String(params.maxNoticePeriod));
  if (params.minExperience != null) qs.set('minExperience', String(params.minExperience));
  if (params.ctcBand) qs.set('ctcBand', params.ctcBand);
  if (params.ctcMin) qs.set('ctcMin', params.ctcMin);
  if (params.ctcMax) qs.set('ctcMax', params.ctcMax);
  if (params.keywordBand) qs.set('keywordBand', params.keywordBand);
  if (params.jobId) qs.set('jobId', params.jobId);
  return http.get<CandidateSearchResult>(`/candidates/search?${qs.toString()}`, signal);
}
