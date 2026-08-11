/**
 * Appointment-letter builder data + helpers. HR fills the editable values in a
 * modal; the fixed Optiminastic letter format (23-clause legal text) is
 * rendered from these values in components/AppointmentLetterPaged.tsx.
 */
import type { AppointmentLetterData, Candidate, OfferLetterData } from '@/types';

export type { AppointmentLetterData };

/**
 * PDF file base name for an appointment letter: "Appointment_Letter_Tushar_Suthar"
 * (candidate name title-cased, spaces → underscores, punctuation dropped).
 */
export function appointmentLetterFileBaseName(candidateName?: string): string {
  const name = (candidateName || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
  return `Appointment_Letter_${name || 'Candidate'}`;
}

/**
 * Defaults for a fresh appointment letter, auto-filled from the candidate where
 * possible. CTC and date of joining are pulled from the candidate's existing
 * offer letter when one exists (still editable afterwards).
 */
export function blankAppointmentLetter(
  candidate: Pick<Candidate, 'fullName' | 'appliedRole' | 'location'> | undefined,
  candidateName: string,
  nowIso: string,
  offerLetter?: Pick<OfferLetterData, 'ctcAnnual' | 'joiningDate'>,
): AppointmentLetterData {
  return {
    candidateName: candidate?.fullName || candidateName || '',
    address: candidate?.location || '',
    role: candidate?.appliedRole || '',
    location: 'Mumbai',
    ctcAnnual: offerLetter?.ctcAnnual || 0,
    joiningDate: offerLetter?.joiningDate || '',
    createdAt: nowIso,
  };
}
