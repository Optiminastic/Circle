/**
 * The transactional emails HR can edit in Settings → Email templates.
 *
 * IMPORTANT: every `defaultSubject`/`defaultBody` below is the copy the app
 * *actually sends today*, lifted from its send site with the dynamic bits turned
 * into `{{placeholders}}`. This page is meant to mirror reality — if you change
 * the copy at a send site, change it here too (or better: make that site read
 * this catalogue).
 *
 * Where each default came from:
 *  - application_received            → circle-be app/services/email_sender.py
 *  - interview_schedule_candidate    → components/InterviewScheduleModal.tsx
 *  - interview_schedule_interviewer  → store/interview-schedule-store.tsx
 *  - iq_invite / assessment_invite   → components/SendTestModal.tsx
 *  - physical_interview_interviewer  → app/(dashboard)/candidates/[id]/page.tsx (openIvPack)
 *  - physical_interview_candidate    → app/(dashboard)/candidates/[id]/page.tsx (online invite)
 *  - rejection_* / hired_*           → app/(dashboard)/candidates/[id]/page.tsx
 *  - offer_letter                    → lib/onboarding-email-templates.ts
 *  - doc_request                     → components/RequestDocumentsModal.tsx
 *
 * HR's edits are saved as an override row (resource `email-template-overrides`)
 * keyed by `id`; nothing is written until HR saves, and "Reset" deletes the row
 * so the default below takes over again.
 *
 * Bodies are **plain text** with two token kinds:
 *  - `{{placeholder}}` — filled in at send time from the send's context.
 *  - `[[Label|url]]`   — rendered as a branded button, so links never go out as
 *                        bare URLs.
 *
 * `id` matters: for emails composed by the backend it MUST equal the template
 * key the backend receives (e.g. `iq_invite`, `doc_request`, `offer_letter`),
 * because the API looks the override up by that key.
 */

export type EmailTemplateGroup = 'standalone' | 'hiring' | 'onboarding';

export interface EmailTemplateDef {
  id: string;
  label: string;
  description: string;
  group: EmailTemplateGroup;
  /** Token names (without braces) valid in this template. */
  placeholders: string[];
  defaultSubject: string;
  defaultBody: string;
}

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  /* --------------------------- standalone --------------------------- */
  {
    id: 'application_received',
    label: 'Application received',
    description: 'Sent automatically the moment a candidate submits an application.',
    group: 'standalone',
    placeholders: ['candidate_name', 'role'],
    defaultSubject: 'We received your application — {{role}}',
    defaultBody: [
      'Hi {{candidate_name}},',
      '',
      'Thank you for showing interest in our organization. We have received your application for {{role}}.',
      '',
      'Our HR team will review your details and reach out about the next steps. We appreciate the time you took to apply.',
      '',
      '— The Optiminastic HR Team',
    ].join('\n'),
  },

  /* ------------------------ candidate hiring ------------------------ */
  {
    id: 'interview_schedule_candidate',
    label: 'Interview schedule — candidate',
    description: 'Invitation sent to the candidate when an interview is scheduled.',
    group: 'hiring',
    placeholders: [
      'candidate_name',
      'role',
      'date',
      'time',
      'location',
      'map_url',
      'interviewer_name',
      'jd',
    ],
    defaultSubject: 'Interview Invitation - {{role}} - Optiminastic',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'Congratulations! We are pleased to inform you that you have been shortlisted for the next stage of our hiring process.',
      '',
      'We would like to invite you for an interview at our office.',
      '',
      'Our hiring process has three rounds:',
      '1. IQ Test — a 30-minute timed aptitude test.',
      '2. Assessment — a role-specific assessment round.',
      '3. Interview — a final interview.',
      '',
      'Date: {{date}}',
      'Time: {{time}}',
      'Location: {{location}}',
      '[[View map|{{map_url}}]]',
      '',
      'Please confirm your availability by replying to this email.',
      '',
      '{{jd}}',
      '',
      'We look forward to meeting you.',
      '',
      'Best Regards,',
      '{{interviewer_name}}',
      'Optiminastic',
    ].join('\n'),
  },
  {
    id: 'interview_reschedule_candidate',
    label: 'Interview rescheduled — candidate',
    description: 'Sent to the candidate when an existing interview is moved to a new slot.',
    group: 'hiring',
    placeholders: [
      'candidate_name',
      'role',
      'date',
      'time',
      'location',
      'map_url',
      'interviewer_name',
    ],
    defaultSubject: 'Interview Rescheduled - {{role}} - Optiminastic',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'We would like to let you know that your interview has been rescheduled. The updated details are below.',
      '',
      'Our hiring process has three rounds:',
      '1. IQ Test — a 30-minute timed aptitude test.',
      '2. Assessment — a role-specific assessment round.',
      '3. Interview — a final interview.',
      '',
      'Date: {{date}}',
      'Time: {{time}}',
      'Location: {{location}}',
      '[[View map|{{map_url}}]]',
      '',
      'Please confirm the new slot works for you by replying to this email. We apologise for any inconvenience.',
      '',
      'We look forward to meeting you.',
      '',
      'Best Regards,',
      '{{interviewer_name}}',
      'Optiminastic',
    ].join('\n'),
  },
  {
    id: 'interview_schedule_interviewer',
    label: 'Interview schedule — interviewer',
    description:
      'Sent to the interviewer: candidate details and the time only (no mode or location).',
    group: 'hiring',
    placeholders: [
      'interviewer_name',
      'candidate_name',
      'role',
      'department',
      'experience',
      'current_company',
      'current_designation',
      'candidate_email',
      'candidate_phone',
      'date_time',
      'notes',
    ],
    defaultSubject: 'Assigned a interview for {{role}} : {{candidate_name}}',
    defaultBody: [
      'Hi {{interviewer_name}},',
      '',
      "You've been assigned to interview a candidate. Details below:",
      '',
      'Candidate: {{candidate_name}}',
      'Role applied: {{role}} ({{department}})',
      'Experience: {{experience}}',
      'Current: {{current_company}} — {{current_designation}}',
      'Email: {{candidate_email}}',
      'Phone: {{candidate_phone}}',
      '',
      'When: {{date_time}}',
      '',
      'Notes: {{notes}}',
      '',
      '— Optiminastic',
    ].join('\n'),
  },
  {
    id: 'interview_reschedule_interviewer',
    label: 'Interview rescheduled — interviewer',
    description: 'Tells the interviewer their slot moved (their calendar invite updates too).',
    group: 'hiring',
    placeholders: ['interviewer_name', 'candidate_name', 'role', 'date_time'],
    defaultSubject: 'Interview rescheduled: {{candidate_name}} for {{role}}',
    defaultBody: [
      'Hi {{interviewer_name}},',
      '',
      'The interview with {{candidate_name}} ({{role}}) has been rescheduled.',
      '',
      'New time: {{date_time}}',
      '',
      '— Optiminastic',
    ].join('\n'),
  },
  {
    id: 'iq_invite',
    label: 'IQ test invite',
    description: 'Sends the candidate their secure IQ test link.',
    group: 'hiring',
    placeholders: ['candidate_name', 'role', 'test_url', 'hr_signoff'],
    defaultSubject: 'Your Optiminastic IQ Test — secure test link inside',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'As the next step in your application for {{role}}, please complete our IQ test.',
      '',
      'Use the button below to begin. The IQ test is timed and runs in full screen — please ensure a stable internet connection before you start.',
      '',
      '[[Start IQ Test|{{test_url}}]]',
      '',
      'Best Regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },
  {
    id: 'assessment_invite',
    label: 'Assessment test invite',
    description: 'Sends the candidate their secure assessment link.',
    group: 'hiring',
    placeholders: ['candidate_name', 'role', 'test_url', 'hr_signoff'],
    defaultSubject: 'Your Optiminastic assessment — secure test link inside',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'As the next step in your application for {{role}}, please complete our assessment.',
      '',
      'Use the button below to begin. The assessment is timed and runs in full screen — please ensure a stable internet connection before you start.',
      '',
      '[[Start Assessment|{{test_url}}]]',
      '',
      'Best Regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },
  {
    id: 'physical_interview_interviewer',
    label: 'Physical interview — interviewer pack',
    description: 'The interviewer’s pack: candidate details, resume and question sheet.',
    group: 'hiring',
    placeholders: [
      'interviewer_name',
      'candidate_name',
      'role',
      'department',
      'experience',
      'hr_signoff',
    ],
    defaultSubject: 'Interview pack: {{candidate_name}} — {{role}}',
    defaultBody: [
      'Hi {{interviewer_name}},',
      '',
      'Here is the interview pack for your upcoming interview with {{candidate_name}} for the {{role}} role.',
      '',
      'Candidate: {{candidate_name}}',
      'Role: {{role}} ({{department}})',
      'Experience: {{experience}}',
      '',
      'The candidate resume and the interview questions are linked below. Please rate each question 1–5 (or NA) and add your recommendation.',
      '',
      'Best regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },
  {
    id: 'physical_interview_candidate',
    label: 'Physical interview — candidate (online)',
    description: 'Sent to the candidate for an online interview, with the Google Meet link.',
    group: 'hiring',
    placeholders: ['candidate_name', 'role', 'date_time', 'interviewer_name', 'meet_link', 'hr_signoff'],
    defaultSubject: 'Your interview (online) — {{role}} — Optiminastic',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'Your interview for the {{role}} role will be held online via Google Meet.',
      '',
      'Date & time: {{date_time}}',
      'Interviewer: {{interviewer_name}}',
      '',
      '[[Join the Google Meet|{{meet_link}}]]',
      '',
      'Please join a few minutes early. Reply to this email if you have any questions.',
      '',
      'Best Regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },
  {
    id: 'rejection_iq',
    label: 'Rejected — IQ test',
    description: 'Sent when a candidate does not clear the IQ round.',
    group: 'hiring',
    placeholders: ['candidate_name', 'role', 'iq_score', 'hr_signoff'],
    defaultSubject: 'Update on your application — {{role}} at Optiminastic',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'Thank you for taking the IQ test for the {{role}} role at Optiminastic.',
      '',
      'Your IQ test score: {{iq_score}}.',
      '',
      'Unfortunately, this did not meet our qualifying bar, so we are unable to move forward with your application at this time.',
      '',
      'We appreciate your interest and encourage you to apply again in the future.',
      '',
      'Warm regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },
  {
    id: 'rejection_assessment',
    label: 'Rejected — assessment',
    description: 'Sent when a candidate does not clear the assessment.',
    group: 'hiring',
    placeholders: ['candidate_name', 'role', 'iq_score', 'assessment_score', 'hr_signoff'],
    defaultSubject: 'Update on your application — {{role}} at Optiminastic',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'Thank you for completing the assessment for the {{role}} role at Optiminastic.',
      '',
      'IQ test: {{iq_score}} — cleared.',
      'Assessment: {{assessment_score}} — not cleared.',
      '',
      'Unfortunately, your assessment did not meet our qualifying bar, so we are unable to move forward with your application at this time.',
      '',
      'We appreciate the effort you put in and encourage you to apply again in the future.',
      '',
      'Warm regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },
  {
    id: 'rejection_interview',
    label: 'Rejected — after interview',
    description: 'Sent when the hiring decision is “reject”.',
    group: 'hiring',
    placeholders: ['candidate_name', 'role', 'iq_score', 'assessment_score', 'summary', 'hr_signoff'],
    defaultSubject: 'Update on your application — {{role}} at Optiminastic',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'Thank you for your time interviewing for the {{role}} role at Optiminastic.',
      '',
      'After careful review, we have decided not to move forward at this stage. A summary of your evaluation:',
      '',
      '• IQ test: {{iq_score}}',
      '• Assessment: {{assessment_score}}',
      '',
      'Summary: {{summary}}',
      '',
      'We genuinely appreciate your interest and wish you the very best.',
      '',
      'Regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },
  {
    id: 'hired_congratulations',
    label: 'Hired — congratulations',
    description: 'Sent when the hiring decision is “hired”.',
    group: 'hiring',
    placeholders: ['candidate_name', 'role', 'summary', 'hr_signoff'],
    defaultSubject: 'Congratulations — {{role}} at Optiminastic',
    defaultBody: [
      'Dear {{candidate_name}},',
      '',
      'Congratulations! We are delighted to move forward with you for the {{role}} role at Optiminastic.',
      '',
      '{{summary}}',
      '',
      'Our team will be in touch shortly with the next steps.',
      '',
      'Warm regards,',
      '{{hr_signoff}}',
    ].join('\n'),
  },

  /* --------------------------- onboarding --------------------------- */
  {
    id: 'offer_letter',
    label: 'Offer letter',
    description: 'Sends the offer letter PDF and the signed-copy upload link.',
    group: 'onboarding',
    placeholders: ['candidate_name', 'role', 'ctc', 'joining_date', 'hr_email'],
    defaultSubject: 'Your offer letter for {{role}} at Optiminastic — please review & sign',
    defaultBody: [
      'OFFER LETTER',
      '',
      'Dear {{candidate_name}},',
      '',
      'With reference to your application and subsequent interview, we are pleased to offer you the position of {{role}} at Optiminastic. You will be based out of our office in Mumbai.',
      '',
      '1. Salary',
      'We offer you an Annual Compensation (CTC) of {{ctc}}, the break-up of which is detailed in the attached letter. This compensation is subject to deductions as per the Income Tax Act, 1961, and other applicable laws. Further income tax will be deducted as applicable.',
      '',
      '2. Date of Commencement',
      'Your effective start date is {{joining_date}}. In case of any emergencies or issues preventing you from joining on this date, kindly inform the HR team at your earliest convenience.',
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
      'We warmly welcome you to the Optiminastic family and look forward to having you with us.',
      '',
      'In case you have any further clarifications, please contact {{hr_email}}.',
      '',
      'Yours faithfully,',
      'For Optiminastic Infomedia',
      'Sakshi Jain',
      'CFO',
    ].join('\n'),
  },
  {
    id: 'doc_request',
    label: 'Joining documents',
    description: 'Asks the candidate to upload their joining documents.',
    group: 'onboarding',
    placeholders: ['candidate_name', 'role', 'document_list', 'upload_url'],
    defaultSubject: 'Document Required: {{candidate_name}} {{role}}',
    defaultBody: [
      'Hi {{candidate_name}},',
      '',
      '',
      'Glad to inform you that we wish to consider you for the role of {{role}}. Next step here would be document verification, for us to evaluate an offer.',
      '',
      '',
      '',
      'Can you please upload this required on given below Link:',
      '{{document_list}}',
    ].join('\n'),
  },
];

export const EMAIL_TEMPLATE_GROUPS: { key: EmailTemplateGroup; label: string }[] = [
  { key: 'hiring', label: 'Candidate hiring templates' },
  { key: 'onboarding', label: 'Onboarding email templates' },
];

export const emailTemplatesIn = (group: EmailTemplateGroup): EmailTemplateDef[] =>
  EMAIL_TEMPLATES.filter(t => t.group === group);

export const emailTemplateById = (id: string): EmailTemplateDef | undefined =>
  EMAIL_TEMPLATES.find(t => t.id === id);
