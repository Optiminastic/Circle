/**
 * AI screening calls — the voice agent interviews a candidate on the job's own
 * screening questions and reports back whether they are a fit.
 *
 * Not a generic resource: `screening-calls` is deliberately absent from the
 * backend's resource registry and served by its own router, so an AI verdict
 * cannot be hand-edited through a generic PATCH. It therefore lives here
 * rather than in `repositories.ts`, the same way `handoff.ts` does.
 */

import { http } from '@/lib/http/client';
import type { FitRating, QuestionImportance, QuestionType } from '@/types';

export type ScreeningCallMode = 'phone' | 'web';

export type ScreeningCallStatus =
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'no-answer'
  | 'declined';

/** Still with the voice provider — the only states worth polling through. */
export const ACTIVE_CALL_STATUSES: readonly ScreeningCallStatus[] = [
  'queued',
  'ringing',
  'in-progress',
];

export const isCallActive = (status: ScreeningCallStatus): boolean =>
  ACTIVE_CALL_STATUSES.includes(status);

/**
 * One question as the call answered it.
 *
 * Deliberately not `ScreeningAnswer` from `@/types`: the backend's
 * `ScreeningCallAnswerOut` omits `category` and allows a null `importance`, so
 * reusing that type would promise fields that are not sent.
 */
export interface ScreeningCallAnswer {
  questionId: string;
  text: string;
  importance?: QuestionImportance | null;
  type: QuestionType;
  /** What the candidate said, normalised to the question's own vocabulary. */
  answer: string;
  passed: boolean;
  /** The candidate's own words, quoted. Empty when the model gave none. */
  evidence: string;
  followUpStrength: 'strong' | 'weak' | 'n/a';
  /** What they put on the application form, for comparison. */
  formAnswer?: string | null;
  /** The call and the form disagree on this question. */
  contradictsForm: boolean;
}

export interface ScreeningCall {
  id: string;
  candidateId: string;
  mode: ScreeningCallMode;
  status: ScreeningCallStatus;
  /** Browser-mode only: where the candidate (or HR, testing) joins. */
  webCallUrl?: string | null;
  startedBy?: { email?: string; name?: string } | null;
  startedAt: string;
  endedAt?: string | null;
  endedReason?: string | null;
  durationSeconds?: number | null;
  transcript?: string | null;
  recordingUrl?: string | null;
  answers: ScreeningCallAnswer[];
  /** Scored by the same rule as the application form, never written onto the
   *  candidate — this is the call's verdict, not HR's. */
  fitRating?: FitRating | null;
  /** The model could not make out at least one answer. */
  needsReview: boolean;
  costUsd?: number | null;
}

/** Start a call. The server owns every precondition (phone shape, whether the
 *  job has questions, whether one is already running) and answers with a
 *  message written for HR, so none of that is re-checked here. */
export const startScreeningCall = (candidateId: string, mode: ScreeningCallMode) =>
  http.post<ScreeningCall>('/screening-calls', { candidateId, mode });

/** This candidate's calls, newest first. */
export const listScreeningCalls = (candidateId: string) =>
  http.get<ScreeningCall[]>(`/screening-calls?candidateId=${encodeURIComponent(candidateId)}`);
