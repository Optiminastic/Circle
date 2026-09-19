/**
 * Overlap detection for candidate bookings.
 *
 * HR runs rounds in parallel: a batch of candidates can sit an IQ test at the
 * same 2pm, and separate panels can interview different candidates in the same
 * hour. So an overlap never blocks a booking - it is surfaced as a warning and
 * HR decides whether it is really a clash.
 */

/** An existing booking, used to detect overlaps against a proposed slot. */
export interface BusySlot {
  start: number; // ms since epoch
  end: number; // ms since epoch
  label: string;
}

/** A proposed booking being validated in a scheduling dialog. */
export interface ProposedSlot {
  start: number; // ms since epoch
  durationMin: number;
}

/** Every existing booking whose window intersects `proposed`. */
export function findOverlappingSlots(proposed: ProposedSlot, busySlots: BusySlot[]): BusySlot[] {
  const end = proposed.start + proposed.durationMin * 60_000;
  return busySlots.filter(slot => proposed.start < slot.end && end > slot.start);
}
