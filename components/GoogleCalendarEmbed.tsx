'use client';

/**
 * Embeds the shared HR Google Calendar (the same one scheduled interview rounds
 * are pushed to). This is a fixed, org-wide calendar — its address is the shared
 * calendar's ID below. It must stay shared/public so it can be embedded
 * (Calendar settings → "Make available to public").
 */

// Shared HR calendar. The literal '@' is percent-encoded by URLSearchParams
// below — do NOT pre-encode it to %40 here, or it double-encodes and breaks.
const SRC =
  'c_0117eacbc11439a47e07d129c4a2b9ac21cce6951992e14d5d3926b0d6c23b58@group.calendar.google.com';
const TZ = 'Asia/Kolkata';

export function GoogleCalendarEmbed() {
  const params = new URLSearchParams({
    src: SRC,
    ctz: TZ,
    mode: 'WEEK',
    wkst: '2', // week starts Monday
    showTitle: '0',
    showPrint: '0',
    showCalendars: '0',
    showTz: '0',
    bgcolor: '#FFFFFF',
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
