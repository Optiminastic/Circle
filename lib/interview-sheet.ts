import { http } from '@/lib/http/client';
import { randomToken } from '@/lib/utils';

/**
 * Payload for the interviewer's public question sheet — candidate basics, the
 * resume link, and the questions (without revealing correct answers).
 *
 * It is persisted server-side under a short unguessable token, and the link
 * emailed to the interviewer carries only that token (`?id=IVS-…`). Older links
 * that inlined the whole payload as base64 (`?d=…`) still resolve via
 * encode/decode below.
 */
export interface InterviewSheetPayload {
  /** Interview record id — lets the interviewer submit answers back to it. */
  interviewId?: string;
  candidateName: string;
  role: string;
  department?: string;
  experienceYears?: number;
  relevantExperienceYears?: number;
  email?: string;
  phone?: string;
  currentCompany?: string;
  currentDesignation?: string;
  resumeUrl?: string;
  interviewerName?: string;
  whenIso?: string;
  mode?: string;
  roleLabel?: string;
  questions: { text: string; options: string[]; module?: string }[];
}

/** Base64-encode the payload (unicode-safe) for use as a URL query value. */
export function encodeInterviewSheet(payload: InterviewSheetPayload): string {
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

/** Decode a sheet payload; returns null if the string is missing/corrupt. */
export function decodeInterviewSheet(encoded: string): InterviewSheetPayload | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(encoded)));
    if (parsed && Array.isArray(parsed.questions)) return parsed as InterviewSheetPayload;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the sheet payload server-side and return a short unguessable token to
 * put in the link (`/interview-sheet?id=<token>`). Throws if the save fails so
 * the caller can avoid emailing a broken link.
 */
export async function saveInterviewSheet(payload: InterviewSheetPayload): Promise<string> {
  const id = randomToken('IVS');
  await http.post('/interview-sheets', { id, createdAt: new Date().toISOString(), ...payload });
  return id;
}

/** Load a previously-saved sheet payload by its token; null if missing/invalid.
 * Uses the PUBLIC endpoint (the generic resource API now requires a login). */
export async function loadInterviewSheet(id: string): Promise<InterviewSheetPayload | null> {
  try {
    const doc = await http.get<InterviewSheetPayload>(
      `/public/interview-sheet/${encodeURIComponent(id)}`,
    );
    return doc && Array.isArray(doc.questions) ? doc : null;
  } catch {
    return null;
  }
}

/**
 * Submit the interviewer's feedback via the PUBLIC endpoint. The backend derives
 * the target interview from the (unguessable) sheet token — the interviewer never
 * writes to `/api/interviews/{id}` directly.
 */
export async function submitInterviewFeedback(
  sheetId: string,
  feedback: { questionResponses: unknown[]; grading: unknown },
): Promise<void> {
  await http.post(`/public/interview-sheet/${encodeURIComponent(sheetId)}/feedback`, feedback);
}
