/**
 * Public (no-login) candidate test actions. The invite token is the credential.
 *
 * The server owns the questions AND the grading: `getTest` returns the question
 * set WITHOUT the answer key, and `submitTest` sends only the candidate's chosen
 * options — the score comes back from the server. Nothing score-related is
 * computed or asserted here, so a tampered request can't manufacture a pass.
 */
import { http, ApiError } from '@/lib/http/client';
import { apiBase } from '@/lib/api-base';

/** One question as served to the candidate — no `answer` field, by design. */
export interface PublicTestQuestion {
  key: string;
  text: string;
  options: string[];
}

export interface PublicTest {
  id: string;
  kind: 'iq' | 'assessment' | 'assignment' | 'take-home';
  status: string;
  candidateName?: string;
  position?: string;
  department?: string;
  durationMin: number;
  startedAt?: string | null;
  completedAt?: string | null;
  violations: number;
  instructions?: string | null;
  deadlineIso?: string | null;
  // Take-home only — the brief file to download, and (once submitted) what
  // the candidate uploaded back.
  briefDocId?: string | null;
  briefFileName?: string | null;
  submissionDocId?: string | null;
  submissionFileName?: string | null;
  score?: number | null;
  passed?: boolean | null;
  disqualified?: boolean | null;
  questions: PublicTestQuestion[];
  passMark: number;
  maxViolations: number;
}

/** Server-graded outcome returned by `submitTest`. */
export interface PublicTestResult {
  ok: boolean;
  status: string;
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  disqualified: boolean;
}

export const getTest = (token: string) =>
  http.get<PublicTest>(`/public/test/${encodeURIComponent(token)}`);

export const startTest = (token: string) =>
  http.post(`/public/test/${encodeURIComponent(token)}/start`, {});

export const flagTestViolation = (token: string) =>
  http.post<{ violations: number }>(`/public/test/${encodeURIComponent(token)}/violation`, {});

/**
 * Submit the attempt. `answers` maps question `key` -> chosen option index.
 * The server grades it and returns the outcome. Throws (409) if already
 * submitted.
 */
export const submitTest = (
  token: string,
  answers: Record<string, number>,
  timeTakenMinutes?: number,
) =>
  http.post<PublicTestResult>(`/public/test/${encodeURIComponent(token)}/submit`, {
    answers,
    timeTakenMinutes,
  });

/**
 * Take-home only: upload the candidate's completed work. Write-once and
 * time-boxed server-side (rejects once `deadlineIso` has passed) — the
 * `http` JSON client can't carry a file, so this talks to the backend
 * directly with FormData (same pattern as the rest of this public,
 * unauthenticated test-taking flow).
 */
export async function submitAssignmentFile(
  token: string,
  file: File,
): Promise<{ ok: boolean; status: string; fileName: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${apiBase()}/api/public/test/${encodeURIComponent(token)}/submit-file`, {
    method: 'POST',
    body: fd,
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const parsed = await res.json();
      detail = parsed?.detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}
