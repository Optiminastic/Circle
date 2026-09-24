'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, ShieldAlert, Search } from 'lucide-react';

import { PageLoading } from '@/components/PageLoading';
import { useAuth } from '@/store/auth-store';
import { getAuditEvents, getAuditSummary, type AuditEvent } from '@/lib/api/audit';

// Human labels for the machine action keys the backend records.
const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'user.invited': 'User invited',
  'user.created': 'User created',
  'user.deleted': 'User deleted',
  'user.password_reset': 'Password reset',
  'user.email_changed': 'Email changed',
  'candidate.created': 'Candidate added',
  'candidate.stage_changed': 'Stage changed',
  'candidate.rejected': 'Candidate rejected',
  'candidate.deleted': 'Candidate deleted',
  'schedule.created': 'Round scheduled',
  'employee.created': 'Employee onboarded',
  'offboarding.started': 'Offboarding started',
  'email.sent': 'Email sent',
};

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;

const RANGES = [
  { key: '1', label: 'Today', days: 0 },
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: null as number | null },
];

/** Start of the day `days` ago, in the local timezone, as a UTC ISO string. */
function sinceIso(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'HR';
}

export default function AuditPage() {
  const { isAdmin, ready } = useAuth();

  const [rangeKey, setRangeKey] = useState('7');
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const dateFrom = useMemo(() => {
    const r = RANGES.find(x => x.key === rangeKey);
    return r && r.days != null ? sinceIso(r.days) : undefined;
  }, [rangeKey]);

  const summaryQuery = useQuery({
    queryKey: ['audit', 'summary', dateFrom ?? 'all'],
    queryFn: () => getAuditSummary({ dateFrom }),
    enabled: ready && isAdmin,
  });

  const feedQuery = useQuery({
    queryKey: ['audit', 'events', { dateFrom: dateFrom ?? 'all', actor, action }],
    queryFn: () => getAuditEvents({ dateFrom, actor: actor || undefined, action: action || undefined, limit: 200 }),
    enabled: ready && isAdmin,
  });

  // Free-text search is applied client-side over the loaded page for instant
  // feedback (the server already scoped by date / actor / action).
  const events = useMemo(() => {
    const all = feedQuery.data?.events ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(e =>
      [e.summary, e.actor_name, e.actor_email, e.entity_label]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q)),
    );
  }, [feedQuery.data, search]);

  if (!ready) return <PageLoading />;

  if (!isAdmin) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <div className="rounded-md border border-line bg-surface p-6">
          <ShieldAlert size={22} className="mx-auto text-gray-400" />
          <p className="mt-3 text-sm font-semibold text-gray-900">Administrator access required</p>
          <p className="mt-1 text-xs text-gray-500">
            The audit trail of HR activity is visible to administrators only.
          </p>
        </div>
      </div>
    );
  }

  const summary = summaryQuery.data;
  const total = feedQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600">
          <ScrollText size={17} />
        </span>
        <div>
          <h2 className="font-display text-sm font-bold tracking-tight text-gray-900">Audit Trails</h2>
          <p className="text-xs text-gray-500">
            A record of key actions HR performs in Circle - additions, stage changes, emails, onboarding,
            offboarding and account changes. Recording started when this feature went live.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
          {RANGES.map(r => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRangeKey(r.key)}
              className={`rounded-[5px] px-2.5 py-1 text-xs font-semibold transition ${
                rangeKey === r.key ? 'bg-accent-600 text-white' : 'text-gray-600 hover:bg-surface-sunken'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            aria-label="Filter by HR person"
            value={actor}
            onChange={e => setActor(e.target.value)}
            className="h-9 rounded-md border border-line bg-surface px-2.5 text-xs text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
          >
            <option value="">All people</option>
            {(summary?.byActor ?? []).map(a => (
              <option key={a.email} value={a.email}>
                {a.name} ({a.count})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by action"
            value={action}
            onChange={e => setAction(e.target.value)}
            className="h-9 rounded-md border border-line bg-surface px-2.5 text-xs text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
          >
            <option value="">All actions</option>
            {(summary?.byAction ?? []).map(a => (
              <option key={a.action} value={a.action}>
                {actionLabel(a.action)} ({a.count})
              </option>
            ))}
          </select>

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search this list"
              className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-2.5 text-xs text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Summary cards: total + per-HR activity */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-md border border-line bg-surface p-4">
          <p className="font-mono text-2xl font-bold leading-none text-gray-900">{summary?.total ?? 0}</p>
          <p className="mt-2 text-[11px] font-medium leading-tight text-gray-500">Total actions in range</p>
        </div>
        {(summary?.byActor ?? []).slice(0, 4).map(a => (
          <button
            key={a.email}
            type="button"
            onClick={() => setActor(actor === a.email ? '' : a.email)}
            className={`rounded-md border bg-surface p-4 text-left transition hover:border-accent-400 ${
              actor === a.email ? 'border-accent-500 ring-1 ring-accent-500/40' : 'border-line'
            }`}
          >
            <p className="font-mono text-2xl font-bold leading-none text-gray-900">{a.count}</p>
            <p className="mt-2 truncate text-[11px] font-medium leading-tight text-gray-600" title={a.name}>
              {a.name}
            </p>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Activity</p>
          <p className="text-[11px] text-gray-400">
            {feedQuery.isFetching ? 'Loading…' : `${events.length}${total > 200 ? ` of ${total}` : ''} shown`}
          </p>
        </div>

        {feedQuery.isError ? (
          <div className="px-4 py-10 text-center text-xs text-red-600">Could not load the audit trail.</div>
        ) : feedQuery.isLoading ? (
          <div className="px-4 py-10 text-center text-xs text-gray-500">Loading activity…</div>
        ) : events.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-gray-500">No activity for these filters.</div>
        ) : (
          <ul className="divide-y divide-line">
            {events.map((e: AuditEvent) => (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-accent-500 to-accent-700 text-[10px] font-bold text-white">
                  {initials(e.actor_name || e.actor_email || 'HR')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-gray-900">
                    <span className="font-semibold">{e.actor_name || e.actor_email || 'Someone'}</span>{' '}
                    <span className="text-gray-600">{e.summary}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-surface-sunken px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                      {actionLabel(e.action)}
                    </span>
                    <span className="text-[11px] text-gray-400">{formatWhen(e.at)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
