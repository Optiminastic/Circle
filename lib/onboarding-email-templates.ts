/**
 * Default, editable email drafts for the onboarding pipeline. HR opens these in
 * a composer, tweaks the subject/body, and sends — so nothing is locked to a
 * fixed backend template. The offer letter mirrors the company's PDF format.
 */
import { Candidate, OnboardingChecklist } from '@/types';
import { OnboardingEmailKind } from '@/features/onboarding/hooks';
import { OFFICE_LOCATION_URL } from '@/lib/config';

export interface EmailDraft {
  subject: string;
  body: string;
}

const COMPANY = 'Optiminastic';
const OFFICE_ADDR = 'Optiminastic Infomedia Pvt Ltd.\n4031, NIBR Aerocity1, Saki Naka, Mumbai 400072';
// Any email that prints the office address also prints its Google Maps link.
const OFFICE = `${OFFICE_ADDR}\nGoogle Maps: ${OFFICE_LOCATION_URL}`;
const HR_EMAIL = 'hr@optiminastic.com';

export function buildOnboardingEmailDraft(
  kind: OnboardingEmailKind,
  candidate: Pick<Candidate, 'fullName' | 'appliedRole' | 'expectedCtc' | 'currentCtc'> | undefined,
  opts?: { startDate?: string },
): EmailDraft {
  const name = candidate?.fullName || 'Candidate';
  const role = candidate?.appliedRole || 'the role';
  const ctc = candidate?.expectedCtc || candidate?.currentCtc || '[Annual CTC]';
  const startDate = opts?.startDate || '[start date]';

  switch (kind) {
    case 'job_offer':
      return {
        subject: `Your job offer — ${role} at ${COMPANY}`,
        body: [
          `Dear ${name},`,
          '',
          `We are pleased to offer you the position of ${role} at ${COMPANY}, Mumbai. Please confirm your availability to join us.`,
          '',
          'The details are as follows:',
          `Job Title: ${role}`,
          `Salary: ${ctc}`,
          'Working Days: Monday to Friday',
          'Working Hours: 10:00 AM to 7:00 PM (flexible check-in between 9:00 AM and 11:00 AM)',
          'Mode: On site',
          '',
          'Your formal offer letter will follow shortly. We look forward to having you on our team.',
          '',
          'Warm regards,',
          `${COMPANY} HR`,
        ].join('\n'),
      };

    case 'offer_letter':
      return {
        subject: `Your offer letter for ${role} at ${COMPANY} — please review & sign`,
        body: [
          'OFFER LETTER',
          '',
          `Dear ${name},`,
          '',
          `With reference to your application and subsequent interview, we are pleased to offer you the position of ${role} at ${COMPANY}. You will be based out of our office in Mumbai.`,
          '',
          '1. Salary',
          `We offer you an Annual Compensation (CTC) of ${ctc}, the break-up of which is detailed in the attached letter. This compensation is subject to deductions as per the Income Tax Act, 1961, and other applicable laws. Further income tax will be deducted as applicable.`,
          '',
          '2. Date of Commencement',
          `Your effective start date is ${startDate}. In case of any emergencies or issues preventing you from joining on this date, kindly inform the HR team at your earliest convenience.`,
          '',
          '3. Documents to be Submitted',
          'You are requested to submit an e-copy of the following documents on your Date of Joining:',
          '- Proof of age (birth certificate / school leaving certificate / passport copy)',
          '- Most recent educational qualification certificates (Degree Certificates / Marks Sheets)',
          '- Release letter from the previous employer',
          '- Resignation acceptance from current employer',
          '- Offer Letter from current employer',
          '- Last salary certificates / slips (3 Months)',
          '- Passport size colour photograph (1 Copy)',
          '- PAN card',
          '- Aadhaar card',
          '',
          'This offer is valid subject to the verification of the aforementioned documents and the completion of joining formalities. Any discrepancies found during documentation or background verification may result in the withdrawal of this offer.',
          '',
          '4. Probation Period',
          'You will be on probation for a period of six months from your date of joining. At the end of this period, your performance will be reviewed, and upon satisfactory evaluation, your employment will be confirmed.',
          '',
          '5. Appointment Letter',
          'A detailed appointment letter outlining the full terms and conditions of your employment will be provided on the day of joining, after the completion of your onboarding formalities.',
          '',
          `We warmly welcome you to the ${COMPANY} family and look forward to having you with us.`,
          '',
          `In case you have any further clarifications, please contact ${HR_EMAIL}.`,
          '',
          'Yours faithfully,',
          'For Optiminastic Infomedia',
          'Sakshi Jain',
          'CFO',
        ].join('\n'),
      };

    case 'office_invite':
      return {
        subject: `You're invited to our office — ${COMPANY}`,
        body: [
          `Dear ${name},`,
          '',
          "Thank you for accepting your offer — welcome to the team! We'd love to have you visit our office to meet everyone and complete a few joining formalities.",
          '',
          'Our office:',
          OFFICE,
          '',
          'Our HR team will confirm the exact day and time with you shortly. We look forward to seeing you!',
          '',
          'Warm regards,',
          `${COMPANY} HR`,
        ].join('\n'),
      };

    case 'joining_date':
      return {
        subject: `Welcome to ${COMPANY} — your joining date (${role})`,
        body: [
          `Dear ${name},`,
          '',
          `Welcome to the ${COMPANY} team! We're delighted to have you on board and are pleased to confirm your first working day as ${startDate}.`,
          '',
          'Please visit our office on your joining date to complete the joining formalities:',
          OFFICE,
          '',
          'Do carry the documents mentioned in your offer letter. If anything prevents you from joining on this date, please let the HR team know at your earliest convenience.',
          '',
          'We look forward to welcoming you!',
          '',
          'Warm regards,',
          `${COMPANY} HR`,
        ].join('\n'),
      };

    case 'appointment_letter':
      return {
        subject: `Your letter of appointment — ${COMPANY}`,
        body: [
          `Dear ${name},`,
          '',
          `Please find your letter of appointment for the ${role} role at ${COMPANY}, confirming the full terms and conditions of your employment.`,
          '',
          'Welcome aboard — we look forward to working with you.',
          '',
          'Warm regards,',
          `${COMPANY} HR`,
        ].join('\n'),
      };
  }
}

/**
 * Sent when HR reviews the signed offer/appointment letter a candidate uploaded
 * and it is not acceptable (wrong file, unsigned, unreadable). The candidate's
 * existing upload link is re-opened and attached to this email as a button by
 * the caller, so they can replace the file through the same URL.
 */
export function buildSignedLetterReuploadDraft(
  letter: 'offer' | 'appointment',
  candidateName: string | undefined,
  reason: string,
  ttlHours: number,
): EmailDraft {
  const name = candidateName || 'Candidate';
  const doc = letter === 'offer' ? 'offer letter' : 'appointment letter';

  return {
    subject: `Action needed — please re-upload your signed ${doc} | ${COMPANY}`,
    body: [
      `Dear ${name},`,
      '',
      `Thank you for uploading your signed ${doc}. On review, we are unable to accept the file you shared.`,
      '',
      ...(reason ? [`Reason: ${reason}`, ''] : []),
      `Please upload the correct signed copy of your ${doc} using the button below. The link stays valid for ${ttlHours} hours, and the file must be a PDF or Word document under 5 MB.`,
      '',
      `If you no longer have the ${doc} or need any help, simply reply to this email and we will re-share it.`,
      '',
      'Warm regards,',
      `${COMPANY} HR`,
    ].join('\n'),
  };
}

/**
 * Buddy-assignment email sent to the employee HR picks to buddy a new
 * joinee. Fixed subject/body (not part of the OnboardingEmailKind union —
 * this goes to a chosen employee, not the candidate), with placeholders
 * filled from the checklist/candidate. `joiningDateLabel` is passed in
 * already-formatted (fmtDate lives in OnboardingStepper.tsx).
 */
export function buildBuddyEmailDraft(
  checklist: Pick<OnboardingChecklist, 'candidateName'>,
  candidate: Pick<Candidate, 'department' | 'appliedRole'> | undefined,
  joiningDateLabel: string,
): EmailDraft {
  const employeeName = checklist.candidateName || '[Employee Name]';
  const department = candidate?.department || '[Department Name]';
  const designation = candidate?.appliedRole || '[Designation]';

  return {
    subject: 'Buddy System – Your Role & Responsibilities',
    body: [
      `We are pleased to assign you as the Buddy for our new joinee, ${employeeName}, who will be joining the ${department} as ${designation} on ${joiningDateLabel}.`,
      '',
      'As a Buddy, your role is to help the new joinee settle in, feel comfortable, understand the team culture, and navigate their initial days at Optiminastic.',
      '',
      'We’ve attached the Buddy Interaction Process – 2-Week Framework, which outlines the interactions, key pointers, and suggested timelines to follow.',
      '',
      'A few key expectations:',
      '- Be approachable and available for basic questions or guidance.',
      '- Help the new joinee connect with the team and understand workplace practices.',
      '- Check in with them regularly and help identify any concerns or blockers.',
      '- Encourage them to become comfortable and independent within the team.',
      '- Escalate any relevant concerns to HR or the Reporting Manager.',
      '',
      'Please use the attached framework as a guide while keeping the interactions informal, supportive, and comfortable.',
      '',
      'Thank you for helping us create a positive first experience for our new joinees!',
      '',
      'Best,',
      'HR Team',
      'Optiminastic',
    ].join('\n'),
  };
}
