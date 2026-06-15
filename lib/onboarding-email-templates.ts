/**
 * Default, editable email drafts for the onboarding pipeline. HR opens these in
 * a composer, tweaks the subject/body, and sends — so nothing is locked to a
 * fixed backend template. The offer letter mirrors the company's PDF format.
 */
import { Candidate } from '@/types';
import { OnboardingEmailKind } from '@/features/onboarding/hooks';

export interface EmailDraft {
  subject: string;
  body: string;
}

const COMPANY = 'Optiminastic';
const OFFICE = 'Optiminastic Infomedia Pvt Ltd.\n4031, NIBR Aerocity1, Saki Naka, Mumbai 400072';
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
