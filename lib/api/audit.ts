/**
 * Audit Trails API client (admin-only on the backend).
 *
 * The backend returns the event descriptor fields as-is (snake_case) - the
 * dashboard's fetch layer does no case conversion - so the wire shape is mirrored
 * here exactly. Query-param names match the FastAPI route (`date_from`, `date_to`).
 */

import { http } from '@/lib/http/client';

export interface AuditEvent {
  id: string;
  at: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  summary: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditFeed {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditActorCount {
  email: string;
  name: string;
  count: number;
}

export interface AuditSummary {
  total: number;
  byActor: AuditActorCount[];
  byAction: { action: string; count: number }[];
}

export interface AuditQuery {
  actor?: string;
  action?: string;
  /** ISO 8601 UTC lower bound (inclusive). */
  dateFrom?: string;
  /** ISO 8601 UTC upper bound (inclusive). */
  dateTo?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

function toParams(q: AuditQuery): string {
  const p = new URLSearchParams();
  if (q.actor) p.set('actor', q.actor);
  if (q.action) p.set('action', q.action);
  if (q.dateFrom) p.set('date_from', q.dateFrom);
  if (q.dateTo) p.set('date_to', q.dateTo);
  if (q.q) p.set('q', q.q);
  if (q.limit != null) p.set('limit', String(q.limit));
  if (q.offset != null) p.set('offset', String(q.offset));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function getAuditEvents(query: AuditQuery = {}): Promise<AuditFeed> {
  return http.get<AuditFeed>(`/audit/events${toParams(query)}`);
}

export function getAuditSummary(range: { dateFrom?: string; dateTo?: string } = {}): Promise<AuditSummary> {
  return http.get<AuditSummary>(`/audit/summary${toParams(range)}`);
}
