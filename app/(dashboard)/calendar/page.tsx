'use client';

import { GoogleCalendarEmbed } from '@/components/GoogleCalendarEmbed';

export default function CalendarPage() {
  return (
    <div className="space-y-4 text-xs select-none">
      <GoogleCalendarEmbed />
    </div>
  );
}
