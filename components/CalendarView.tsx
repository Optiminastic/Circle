'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  BrainCircuit,
  Phone,
  CalendarDays,
} from 'lucide-react';
import { Interview, IQTest, Candidate, ScheduleEvent } from '../types';

interface CalendarViewProps {
  interviews: Interview[];
  iqTests: IQTest[];
  candidates: Candidate[];
  schedules?: ScheduleEvent[];
  onSelectCandidate: (id: string) => void;
}

type ViewMode = 'month' | 'week';
type CalType = 'Interview' | 'IQ Test' | 'HR Call' | 'Assessment';

interface CalEvent {
  id: string;
  candidateId: string;
  candidateName: string;
  subtitle: string;
  date: Date;
  hasTime: boolean;
  type: CalType;
  meetingMode?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_HEIGHT = 56;
const START_HOUR = 9; // 9 AM
const END_HOUR = 16; // 4 PM
const RANGE_HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const BOTTOM_BUFFER = 40;
const TOTAL_HEIGHT = GRID_HEIGHT + BOTTOM_BUFFER;
const MIN_EVENT_HEIGHT = 52;

function typeStyle(type: CalType) {
  switch (type) {
    case 'IQ Test':
      return {
        dot: 'bg-violet-500',
        pill: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200',
        Icon: BrainCircuit,
      };
    case 'Assessment':
      return {
        dot: 'bg-sky-500',
        pill: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200',
        Icon: BrainCircuit,
      };
    case 'HR Call':
      return {
        dot: 'bg-amber-500',
        pill: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
        Icon: Phone,
      };
    default:
      return {
        dot: 'bg-accent-500',
        pill: 'bg-accent-50 text-accent-700 hover:bg-accent-100 border-accent-200',
        Icon: Video,
      };
  }
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const hourLabel = (h: number) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
};
const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

interface TimedPlacement {
  ev: CalEvent;
  top: number;
  height: number;
  col: number;
  cols: number;
}

/**
 * Lay out a day's timed events so none overlap visually: events whose pixel
 * blocks intersect are grouped into a cluster and split into side-by-side
 * columns (Google Calendar style).
 */
function layoutTimed(timed: CalEvent[]): TimedPlacement[] {
  const blocks = timed
    .map(ev => {
      const startHrs = ev.date.getHours() + ev.date.getMinutes() / 60;
      const top = (startHrs - START_HOUR) * HOUR_HEIGHT;
      const height = Math.min(MIN_EVENT_HEIGHT, TOTAL_HEIGHT - top);
      return { ev, startHrs, top, bottom: top + height, height };
    })
    .filter(b => b.startHrs >= START_HOUR && b.startHrs < END_HOUR)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  const placements: TimedPlacement[] = [];
  let cluster: typeof blocks = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = []; // bottom of the last block in each column
    const colOf = new Map<string, number>();
    for (const b of cluster) {
      let placed = -1;
      for (let i = 0; i < colEnds.length; i++) {
        if (b.top >= colEnds[i]) {
          colEnds[i] = b.bottom;
          placed = i;
          break;
        }
      }
      if (placed === -1) {
        colEnds.push(b.bottom);
        placed = colEnds.length - 1;
      }
      colOf.set(b.ev.id, placed);
    }
    const cols = colEnds.length;
    for (const b of cluster) {
      placements.push({ ev: b.ev, top: b.top, height: b.height, col: colOf.get(b.ev.id) ?? 0, cols });
    }
    cluster = [];
  };

  for (const b of blocks) {
    if (cluster.length && b.top >= clusterEnd) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.bottom);
  }
  flush();
  return placements;
}

export function CalendarView({
  interviews,
  iqTests,
  candidates,
  schedules = [],
  onSelectCandidate,
}: CalendarViewProps) {
  const today = new Date();
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  // ---- merge all recruitment events ----
  const events = useMemo(() => {
    const list: CalEvent[] = [];
    for (const iv of interviews) {
      const d = new Date(iv.dateTime);
      if (isNaN(d.getTime())) continue;
      list.push({
        id: `iv-${iv.id}`,
        candidateId: iv.candidateId,
        candidateName: iv.candidateName,
        subtitle: iv.interviewRound,
        date: d,
        hasTime: true,
        type: 'Interview',
        meetingMode: iv.meetingMode,
      });
    }
    for (const t of iqTests) {
      const d = new Date(t.testDate);
      if (isNaN(d.getTime())) continue;
      list.push({
        id: `iq-${t.id}`,
        candidateId: t.candidateId,
        candidateName: t.candidateName,
        subtitle: `IQ Test · ${t.qualificationStatus}`,
        date: d,
        hasTime: false,
        type: 'IQ Test',
      });
    }
    for (const c of candidates) {
      if (c.hrCall?.completedDate) {
        const d = new Date(c.hrCall.completedDate);
        if (isNaN(d.getTime())) continue;
        list.push({
          id: `call-${c.id}`,
          candidateId: c.id,
          candidateName: c.fullName,
          subtitle: `HR Call · ${c.hrCall.nextStep}`,
          date: d,
          hasTime: false,
          type: 'HR Call',
        });
      }
    }
    for (const s of schedules) {
      if (s.status === 'Cancelled') continue;
      const d = new Date(s.dateTime);
      if (isNaN(d.getTime())) continue;
      list.push({
        id: `sch-${s.id}`,
        candidateId: s.candidateId,
        candidateName: s.candidateName,
        subtitle: `${s.type} (scheduled)`,
        date: d,
        hasTime: true,
        type: s.type,
      });
    }
    return list;
  }, [interviews, iqTests, candidates, schedules]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const ev of events) (map[dayKey(ev.date)] ||= []).push(ev);
    Object.values(map).forEach(l =>
      l.sort((a, b) => {
        if (a.hasTime !== b.hasTime) return a.hasTime ? 1 : -1; // all-day first
        return +a.date - +b.date;
      }),
    );
    return map;
  }, [events]);

  // ---- week computation ----
  const weekStart = useMemo(() => {
    const s = new Date(anchor);
    s.setDate(anchor.getDate() - anchor.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  }, [anchor]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const goPrev = () => {
    const d = new Date(anchor);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setAnchor(d);
  };
  const goNext = () => {
    const d = new Date(anchor);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setAnchor(d);
  };
  const goToday = () => setAnchor(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const periodCount = useMemo(() => {
    if (view === 'month') {
      return events.filter(
        e => e.date.getFullYear() === anchor.getFullYear() && e.date.getMonth() === anchor.getMonth(),
      ).length;
    }
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 7);
    return events.filter(e => e.date >= weekStart && e.date < end).length;
  }, [events, view, anchor, weekStart]);

  const headerLabel = useMemo(() => {
    if (view === 'month') return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    const end = weekDays[6];
    if (weekStart.getMonth() === end.getMonth())
      return `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    return `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }, [view, anchor, weekDays, weekStart]);

  return (
    <div className="space-y-6 select-none pb-10">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-display flex items-center gap-2">
            <CalendarIcon size={18} className="text-accent-600" />
            Recruitment Calendar
          </h2>
          <p className="text-gray-400 text-xs">
            HR calls, IQ tests and panel interviews across the recruitment pipeline.
          </p>
        </div>
        <span className="text-[11px] font-mono text-gray-500 bg-[#F1F1F2] px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit">
          <CalendarDays size={12} className="text-accent-600" />
          {periodCount} this {view}
        </span>
      </div>

      {/* Calendar card */}
      <div className="bg-[#FFFFFF] border border-[#EAEAEC] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#EAEAEC]">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-900 font-display">{headerLabel}</h3>
            <button
              onClick={goToday}
              className="text-[10px] font-semibold font-mono uppercase tracking-wider text-accent-600 border border-accent-200 hover:bg-accent-50 px-2 py-0.5 rounded-md cursor-pointer transition"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#F1F1F2] rounded-md p-0.5">
              {(['week', 'month'] as ViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setView(m)}
                  className={`text-[10px] font-semibold font-mono uppercase tracking-wider px-2.5 py-1 rounded cursor-pointer transition ${view === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-1.5 rounded-md hover:bg-[#F1F1F2] text-gray-500 hover:text-gray-900 cursor-pointer transition"
                title="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded-md hover:bg-[#F1F1F2] text-gray-500 hover:text-gray-900 cursor-pointer transition"
                title="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {view === 'month' ? (
          <MonthGrid
            anchor={anchor}
            today={today}
            eventsByDay={eventsByDay}
            dayKey={dayKey}
            onSelectCandidate={onSelectCandidate}
          />
        ) : (
          <WeekGrid
            weekDays={weekDays}
            today={today}
            eventsByDay={eventsByDay}
            dayKey={dayKey}
            onSelectCandidate={onSelectCandidate}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
        <span className="font-semibold font-mono uppercase tracking-wider text-gray-400">Legend</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span> HR Call
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500"></span> IQ Test
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500"></span> Assessment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-500"></span> Interview
        </span>
      </div>
    </div>
  );
}

// ---------------- Week (time grid + all-day row) ----------------
function WeekGrid({
  weekDays,
  today,
  eventsByDay,
  dayKey,
  onSelectCandidate,
}: {
  weekDays: Date[];
  today: Date;
  eventsByDay: Record<string, CalEvent[]>;
  dayKey: (d: Date) => string;
  onSelectCandidate: (id: string) => void;
}) {
  const hasAllDay = weekDays.some(d => (eventsByDay[dayKey(d)] || []).some(e => !e.hasTime));

  return (
    <div>
      {/* Day headers */}
      <div className="flex border-b border-[#EAEAEC] bg-white">
        <div className="w-14 shrink-0 border-r border-[#EAEAEC]" />
        {weekDays.map(d => {
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              className="flex-1 text-center py-2 border-r border-[#EAEAEC] last:border-r-0"
            >
              <div className="text-[10px] font-semibold font-mono uppercase tracking-wider text-gray-400">
                {WEEKDAYS[d.getDay()]}
              </div>
              <div
                className={`text-sm font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'bg-accent-600 text-white' : 'text-gray-700'}`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day row (HR calls & IQ tests — date only) */}
      {hasAllDay && (
        <div className="flex border-b border-[#EAEAEC] bg-[#FAFAFB]">
          <div className="w-14 shrink-0 border-r border-[#EAEAEC] flex items-start justify-end pr-2 pt-2">
            <span className="text-[8px] font-mono uppercase tracking-wider text-gray-400">All day</span>
          </div>
          {weekDays.map(d => {
            const allDay = (eventsByDay[dayKey(d)] || []).filter(e => !e.hasTime);
            return (
              <div
                key={d.toISOString()}
                className="flex-1 border-r border-[#EAEAEC] last:border-r-0 p-1 space-y-1 min-h-[36px]"
              >
                {allDay.map(ev => (
                  <EventPill key={ev.id} ev={ev} onSelectCandidate={onSelectCandidate} compact />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Working-hours time grid (9 AM – 4 PM) for interviews */}
      <div className="flex" style={{ height: TOTAL_HEIGHT }}>
        <div className="w-14 shrink-0 border-r border-[#EAEAEC] relative">
          {RANGE_HOURS.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
              <span className="absolute -top-1.5 right-2 text-[9px] font-mono text-gray-400">
                {hourLabel(h)}
              </span>
            </div>
          ))}
          <div style={{ height: BOTTOM_BUFFER }} className="relative">
            <span className="absolute -top-1.5 right-2 text-[9px] font-mono text-gray-400">
              {hourLabel(END_HOUR)}
            </span>
          </div>
        </div>

        {weekDays.map(d => {
          const timed = (eventsByDay[dayKey(d)] || []).filter(e => e.hasTime);
          return (
            <div
              key={d.toISOString()}
              className="flex-1 relative border-r border-[#EAEAEC] last:border-r-0 overflow-hidden"
            >
              {RANGE_HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-[#F2F2F3]" />
              ))}
              <div style={{ height: BOTTOM_BUFFER }} className="bg-[#FAFAFB]" />
              {layoutTimed(timed).map(({ ev, top, height, col, cols }) => {
                const s = typeStyle(ev.type);
                const widthPct = 100 / cols;
                const leftPct = col * widthPct;
                return (
                  <button
                    key={ev.id}
                    onClick={() => onSelectCandidate(ev.candidateId)}
                    title={`${ev.candidateName} • ${ev.subtitle} • ${fmtTime(ev.date)}`}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 3px)`,
                      width: `calc(${widthPct}% - 6px)`,
                    }}
                    className={`absolute rounded-md border px-1.5 py-1 text-[10px] leading-tight overflow-hidden text-left cursor-pointer transition ${s.pill}`}
                  >
                    <div className="flex items-center gap-1 font-mono font-semibold">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}></span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={8} /> {fmtTime(ev.date)}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 truncate mt-0.5">{ev.candidateName}</div>
                    <div className="flex items-center gap-0.5 text-gray-500 truncate">
                      {ev.meetingMode === 'In-Person' ? <MapPin size={8} /> : <Video size={8} />}
                      <span className="truncate">{ev.subtitle}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Month grid ----------------
function MonthGrid({
  anchor,
  today,
  eventsByDay,
  dayKey,
  onSelectCandidate,
}: {
  anchor: Date;
  today: Date;
  eventsByDay: Record<string, CalEvent[]>;
  dayKey: (d: Date) => string;
  onSelectCandidate: (id: string) => void;
}) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <>
      <div className="grid grid-cols-7 border-b border-[#EAEAEC]">
        {WEEKDAYS.map(w => (
          <div
            key={w}
            className="px-2 py-2 text-[10px] font-semibold font-mono uppercase tracking-wider text-gray-400 text-center"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dayEvents = day ? eventsByDay[dayKey(new Date(year, month, day))] || [] : [];
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;
          return (
            <div
              key={day ? `${year}-${month}-${day}` : `blank-${idx}`}
              className={`min-h-[112px] border-b border-r border-[#EAEAEC] p-1.5 ${idx % 7 === 0 ? 'border-l' : ''} ${day ? '' : 'bg-[#FAFAFB]'}`}
            >
              {day && (
                <>
                  <div className="flex justify-end mb-1">
                    <span
                      className={`text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-accent-600 text-white' : 'text-gray-500'}`}
                    >
                      {day}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {shown.map(ev => (
                      <EventPill key={ev.id} ev={ev} onSelectCandidate={onSelectCandidate} />
                    ))}
                    {extra > 0 && (
                      <div className="text-[9px] font-mono font-semibold text-gray-400 px-1">
                        +{extra} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function EventPill({
  ev,
  onSelectCandidate,
  compact,
}: {
  ev: CalEvent;
  onSelectCandidate: (id: string) => void;
  compact?: boolean;
}) {
  const s = typeStyle(ev.type);
  const Icon = s.Icon;
  return (
    <button
      onClick={() => onSelectCandidate(ev.candidateId)}
      title={`${ev.candidateName} • ${ev.subtitle}${ev.hasTime ? ' • ' + fmtTime(ev.date) : ''}`}
      className={`w-full text-left rounded-md border px-1.5 py-1 text-[10px] leading-tight transition cursor-pointer ${s.pill}`}
    >
      <div className="flex items-center gap-1 font-mono font-semibold">
        <Icon size={9} className="shrink-0" />
        {ev.hasTime ? (
          <span className="flex items-center gap-0.5">
            <Clock size={8} /> {fmtTime(ev.date)}
          </span>
        ) : (
          <span>{ev.type}</span>
        )}
      </div>
      <div className="font-semibold text-gray-900 truncate mt-0.5">{ev.candidateName}</div>
      {!compact && <div className="text-gray-500 truncate">{ev.subtitle}</div>}
    </button>
  );
}

export default CalendarView;
