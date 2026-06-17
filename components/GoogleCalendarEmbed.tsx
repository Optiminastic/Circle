'use client';

/**
 * Embeds the shared HR Google Calendar (the same one scheduled rounds are pushed
 * to). Set NEXT_PUBLIC_GOOGLE_CALENDAR_SRC to the calendar's address (its ID /
 * the account email) in .env.local. The calendar must be shared so it can be
 * embedded (Calendar settings → "Make available to public" or share with the
 * viewers). When unset, a short setup note is shown instead.
 */

import { CalendarDays, ExternalLink } from 'lucide-react';

const SRC =
  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SRC ??
  'c_0117eacbc11439a47e07d129c4a2b9ac21cce6951992e14d5d3926b0d6c23b58@group.calendar.google.com';
const TZ = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_TZ ?? 'Asia/Kolkata';

export function GoogleCalendarEmbed() {
  if (!SRC) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#E4E6EA] bg-[#FFFFFF] px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-50 text-accent-600">
          <CalendarDays size={22} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Connect your Google Calendar</h3>
          <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-gray-500">
            Scheduled rounds are already pushed to the shared HR Google Calendar. To view it here,
            set <code className="rounded bg-[#EDEEF1] px-1 py-0.5 font-mono">NEXT_PUBLIC_GOOGLE_CALENDAR_SRC</code> in{' '}
            <code className="rounded bg-[#EDEEF1] px-1 py-0.5 font-mono">.env.local</code> to the
            calendar&apos;s address (its ID / account email) and make the calendar shareable.
          </p>
        </div>
        <a
          href="https://calendar.google.com/calendar/u/0/r/settings"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6EA] bg-card px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-secondary/50"
        >
          Calendar settings <ExternalLink size={13} />
        </a>
      </div>
    );
  }

  const params = new URLSearchParams({
    src: SRC,
    ctz: TZ,
    mode: 'WEEK',
    wkst: '2', // week starts Monday
    showTitle: '0',
    showPrint: '0',
    showCalendars: '0',
    showTz: '0',
    bgcolor: '#FFFFFF', // greige background
    color: '#D11453', // raspberry events (the only event-tint Google's embed allows)
  });
  const url = `https://calendar.google.com/calendar/embed?${params.toString()}`;

  return (
    <iframe
      title="Recruitment Google Calendar"
      src={url}
      className="h-[76vh] w-full rounded-xl border border-[#E4E6EA] bg-white shadow-2xs"
      style={{ border: 0 }}
    />
  );
}

export default GoogleCalendarEmbed;
