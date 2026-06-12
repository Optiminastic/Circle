/**
 * Self-contained payload for the interviewer's public question sheet.
 *
 * The interview question banks live in the HR user's browser (localStorage), so
 * the link emailed to an external interviewer carries everything it needs encoded
 * in the URL — candidate basics, the resume link, and the questions (without
 * revealing correct answers).
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
  questions: { text: string; options: string[] }[];
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
