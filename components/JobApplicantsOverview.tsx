'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Candidate, Job } from '@/types';
import { useInterviews } from '@/features/interviews/hooks';
import { MapPin, Briefcase, Wallet, Clock4, User, CalendarDays } from 'lucide-react';

type DateRange = 'today' | 'week' | 'month';

const RANGE_LABEL: Record<DateRange, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WINDOW_MS: Record<DateRange, number> = { today: DAY_MS, week: 7 * DAY_MS, month: 30 * DAY_MS };
const BUCKETS = 7;

const bucketLabel = (start: number, range: DateRange): string => {
  const d = new Date(start);
  if (range === 'today') return d.toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', '');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

interface Series {
  key: string;
  label: string;
  values: number[];
  stroke: string;
  dotCls: string;
  textCls: string;
}

/** Count of `dates` falling into each of BUCKETS equal-width windows spanning
 *  `range` up to now — the per-series trend line's y-values. */
function toBuckets(dates: (string | undefined)[], range: DateRange): number[] {
  const now = Date.now();
  const windowMs = WINDOW_MS[range];
  const bucketMs = windowMs / BUCKETS;
  const counts = new Array(BUCKETS).fill(0);
  for (const iso of dates) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t) || t < now - windowMs || t > now) continue;
    const idx = Math.min(BUCKETS - 1, Math.floor((t - (now - windowMs)) / bucketMs));
    counts[idx] += 1;
  }
  return counts;
}

// Fixed viewBox — the <svg> scales to its container via w-full while keeping
// these coordinates, so all geometry below is just arithmetic on W/H.
const W = 700;
const H = 170;
const PAD_X = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 24;

/** Smooth curve through `points` (Catmull-Rom → cubic Bezier, tension 1/6) —
 *  the gentle wave look, instead of straight segments between data points. */
function smoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Sits above the Evaluation Filters bar on a job's Applicants page — a small
 *  Applied/Interviewed/Rejected trend line (date-range filterable) on the
 *  left, and a compact job-details card on the right. */
export function JobApplicantsOverview({ job, applicants }: { job: Job; applicants: Candidate[] }) {
  const [range, setRange] = useState<DateRange>('week');
  const { data: interviews = [] } = useInterviews();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series: Series[] = useMemo(() => {
    const rejected = applicants.filter(c => c.status === 'Rejected');
    // One "interviewed" event per candidate — their most recent completed/graded interview.
    const interviewDates = applicants
      .map(c => {
        const done = interviews
          .filter(iv => iv.candidateId === c.id && (iv.status === 'Completed' || iv.status === 'Pending Feedback'))
          .sort((a, b) => (b.dateTime ?? '').localeCompare(a.dateTime ?? ''));
        return done[0]?.dateTime;
      })
      .filter((d): d is string => !!d);

    return [
      {
        key: 'applied',
        label: 'Applied',
        values: toBuckets(applicants.map(c => c.appliedAt ?? c.appliedDate), range),
        stroke: '#ca8a04',
        dotCls: 'bg-yellow-600',
        textCls: 'text-yellow-700',
      },
      {
        key: 'interviewed',
        label: 'Interviewed',
        values: toBuckets(interviewDates, range),
        stroke: '#10b981',
        dotCls: 'bg-emerald-500',
        textCls: 'text-emerald-600',
      },
      {
        key: 'rejected',
        label: 'Rejected',
        values: toBuckets(rejected.map(c => c.decidedAt ?? c.appliedAt ?? c.appliedDate), range),
        stroke: '#ef4444',
        dotCls: 'bg-red-500',
        textCls: 'text-red-600',
      },
    ];
  }, [applicants, interviews, range]);

  const max = Math.max(1, ...series.flatMap(s => s.values));
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const xAt = (i: number) => PAD_X + (i / (BUCKETS - 1)) * chartW;
  const yAt = (v: number) => PAD_TOP + (1 - v / max) * chartH;

  const now = Date.now();
  const windowMs = WINDOW_MS[range];
  const bucketMs = windowMs / BUCKETS;
  const labels = Array.from({ length: BUCKETS }, (_, i) => bucketLabel(now - windowMs + i * bucketMs, range));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[6fr_4fr]">
      {/* Left — Applied / Interviewed / Rejected trend line, date-filterable */}
      <div className="rounded-2xl border border-[#E4E6EA] bg-white p-4 shadow-2xs">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900">Applicant Overview</h3>
          <div className="flex items-center rounded-lg border border-[#E4E6EA] bg-[#F7F8FA] p-0.5 text-[11px] font-semibold">
            {(['today', 'week', 'month'] as DateRange[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 transition ${
                  range === r ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Legend — each series is named here, never identified by color alone */}
        <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map(s => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
              <span className={`size-2 rounded-full ${s.dotCls}`} />
              {s.label}
              <span className={`font-mono ${s.textCls}`}>{s.values.reduce((a, b) => a + b, 0)}</span>
            </span>
          ))}
        </div>

        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-[160px] w-full cursor-crosshair"
            preserveAspectRatio="none"
            onMouseMove={e => {
              const rect = svgRef.current?.getBoundingClientRect();
              if (!rect) return;
              const vx = ((e.clientX - rect.left) / rect.width) * W;
              const idx = Math.round(((vx - PAD_X) / chartW) * (BUCKETS - 1));
              setHoverIdx(Math.min(BUCKETS - 1, Math.max(0, idx)));
            }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {series.map(s => {
              const points = s.values.map((v, i) => [xAt(i), yAt(v)] as const);
              const last = points[points.length - 1];
              return (
                <g key={s.key}>
                  <path
                    d={smoothPath(points)}
                    fill="none"
                    stroke={s.stroke}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Open start-marker — the line's first value, always visible (no hover needed) */}
                  <circle cx={points[0][0]} cy={points[0][1]} r={3.5} fill="#FFFFFF" stroke={s.stroke} strokeWidth={2} />
                  {/* Direct end-label — the value at the line's tip, per series color as the mark (not the text) */}
                  <text x={last[0] + 6} y={last[1] + 3} fontSize={11} fontWeight={700} fill={s.stroke}>
                    {s.values[s.values.length - 1]}
                  </text>
                  {/* Hover dot — snaps to the crosshair position on this series' curve */}
                  {hoverIdx !== null && (
                    <circle cx={points[hoverIdx][0]} cy={points[hoverIdx][1]} r={4} fill={s.stroke} stroke="#FFFFFF" strokeWidth={2} />
                  )}
                </g>
              );
            })}

            {/* Crosshair — a vertical hairline tracking the pointer, snapped to the nearest bucket */}
            {hoverIdx !== null && (
              <line
                x1={xAt(hoverIdx)}
                y1={PAD_TOP}
                x2={xAt(hoverIdx)}
                y2={H - PAD_BOTTOM}
                stroke="#D1D5DB"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            )}

            {/* X-axis labels — selective (first, mid, last) to avoid crowding */}
            {labels.map((label, i) =>
              i === 0 || i === BUCKETS - 1 || i === Math.floor((BUCKETS - 1) / 2) ? (
                <text key={i} x={xAt(i)} y={H - 6} fontSize={10} textAnchor="middle" fill="#6B7280">
                  {label}
                </text>
              ) : null,
            )}
          </svg>

          {/* One tooltip, every series — the readout lists every line's value at this X. */}
          {hoverIdx !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-44 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2.5 text-white shadow-lg"
              style={{
                left: `${(xAt(hoverIdx) / W) * 100}%`,
                ...(xAt(hoverIdx) / W < 0.18 ? { left: '18%' } : {}),
                ...(xAt(hoverIdx) / W > 0.82 ? { left: '82%' } : {}),
              }}
            >
              <p className="mb-1.5 text-[11px] font-semibold text-gray-300">{labels[hoverIdx]}</p>
              <div className="space-y-1">
                {[...series]
                  .sort((a, b) => b.values[hoverIdx as number] - a.values[hoverIdx as number])
                  .map(s => (
                    <div key={s.key} className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.stroke }} />
                        {s.label}
                      </span>
                      <span className="font-mono font-bold text-white">{s.values[hoverIdx]}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right — compact job-details card */}
      <div className="rounded-2xl border border-[#E4E6EA] bg-white p-4 shadow-2xs">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900">Job Details</h3>
          <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-accent-700">
            {job.status}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <div className="col-span-2 flex items-center gap-1.5 text-gray-700">
            <Briefcase size={12} className="shrink-0 text-gray-400" />
            <dt className="sr-only">Department</dt>
            <dd className="truncate">{job.department}</dd>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700">
            <MapPin size={12} className="shrink-0 text-gray-400" />
            <dt className="sr-only">Location</dt>
            <dd className="truncate">{job.location}</dd>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700">
            <Clock4 size={12} className="shrink-0 text-gray-400" />
            <dt className="sr-only">Employment type</dt>
            <dd className="truncate">{job.employmentType}</dd>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700">
            <Wallet size={12} className="shrink-0 text-gray-400" />
            <dt className="sr-only">Salary range</dt>
            <dd className="truncate font-mono">
              {job.salaryMin || job.salaryMax ? `${job.salaryMin} – ${job.salaryMax}` : '—'}
            </dd>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700">
            <User size={12} className="shrink-0 text-gray-400" />
            <dt className="sr-only">Min. experience</dt>
            <dd className="truncate">{job.minExperienceYears}+ yrs experience</dd>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-gray-500">
            <CalendarDays size={12} className="shrink-0 text-gray-400" />
            <dt className="sr-only">Posted</dt>
            <dd className="truncate">
              Posted by {job.postedBy || 'HR'} on {job.postedDate}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
