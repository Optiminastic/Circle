/**
 * Notification endpoints — candidate-facing emails triggered by HR actions.
 * Delivery is best-effort on the backend; the response says whether the email
 * was queued ({sent:true}) or why it was skipped.
 */

import { http } from '@/lib/http/client';
import { ScheduleType } from '@/types';

export interface ScheduleEmailResult {
  sent: boolean;
  reason?: 'not_configured' | 'no_recipient';
}

export function sendScheduleEmail(input: {
  to: string;
  candidateName: string;
  type: ScheduleType;
  dateTimeIso: string;
  notes?: string;
}): Promise<ScheduleEmailResult> {
  return http.post<ScheduleEmailResult>('/notifications/schedule-email', input);
}

export type TestEmailTemplate =
  | 'iq_invite'
  | 'iq_passed'
  | 'iq_failed'
  | 'assignment_invite'
  | 'assessment_invite'
  | 'assessment_passed'
  | 'assessment_failed'
  | 'doc_request'
  | 'offer_shortlisted'
  | 'offer_selected'
  | 'offer_letter'
  | 'office_invite'
  | 'appointment_letter';

/**
 * Send an HR-composed (and possibly edited) email — e.g. an interview invitation.
 * When event fields are provided, a Google Calendar invite (.ics) is attached so
 * the event lands on every attendee's calendar (organizer = HR account).
 */
export function sendCustomEmail(input: {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  eventStartIso?: string;
  eventDurationMin?: number;
  eventSummary?: string;
  eventLocation?: string;
  eventDescription?: string;
  organizerEmail?: string;
  organizerName?: string;
  attendees?: string[];
  eventUid?: string;
}): Promise<ScheduleEmailResult> {
  return http.post<ScheduleEmailResult>('/notifications/custom-email', input);
}

/** Send one of the online-test pipeline emails (invite links, pass/fail results). */
export function sendTestEmail(input: {
  to: string;
  candidateName: string;
  template: TestEmailTemplate;
  testUrl?: string;
  position?: string;
  score?: string;
  durationMin?: number;
  dateTimeIso?: string;
}): Promise<ScheduleEmailResult> {
  return http.post<ScheduleEmailResult>('/notifications/test-email', input);
}
