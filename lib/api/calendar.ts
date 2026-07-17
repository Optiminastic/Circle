/**
 * Google Calendar sync endpoints. One-way push: scheduling an event in the app
 * creates/updates it on the shared HR Google Calendar. Delivery is best-effort
 * on the backend — the response says whether the event was pushed ({pushed:true})
 * or why it was skipped.
 */

import { http } from '@/lib/http/client';
import { ScheduleType } from '@/types';

export interface CalendarPushResult {
  pushed: boolean;
  reason?: 'not_configured' | 'not_connected' | 'error';
  meetLink?: string | null;
  googleEventId?: string | null;
}

export interface CalendarStatus {
  configured: boolean;
  connected: boolean;
  connectedEmail?: string | null;
  calendarId: string;
}

/** Create or update the Google Calendar event for an app schedule/interview. */
export function pushCalendarEvent(input: {
  appEventId: string;
  type: ScheduleType;
  title: string;
  dateTimeIso: string;
  durationMin?: number;
  notes?: string;
  attendeeEmail?: string;
  /** Extra attendees (candidate / interviewer / HR) invited via Google. */
  attendees?: string[];
  /** Office address (offline) or meeting link (online). */
  location?: string;
  /** True → attach a real Google Meet link to the event; False → none. */
  online?: boolean;
}): Promise<CalendarPushResult> {
  return http.post<CalendarPushResult>('/calendar/events', input);
}

/** Remove the Google Calendar event linked to an app event (cancellation). */
export function deleteCalendarEvent(appEventId: string): Promise<{ deleted: boolean; reason?: string }> {
  return http.delete<{ deleted: boolean; reason?: string }>(`/calendar/events/${appEventId}`);
}

/** Whether Google is configured (env) and the shared account is connected. */
export function getCalendarStatus(): Promise<CalendarStatus> {
  return http.get<CalendarStatus>('/calendar/status');
}

/** Forget the connected Google account — deletes its stored refresh token. */
export function disconnectCalendar(): Promise<{ disconnected: boolean; reason?: string }> {
  return http.delete<{ disconnected: boolean; reason?: string }>('/calendar/connection');
}

/** The Google consent URL used to connect the shared HR account (admin, one-time). */
export function getCalendarAuthUrl(): Promise<{ url: string | null; reason?: string }> {
  return http.get<{ url: string | null; reason?: string }>('/calendar/oauth/url');
}
