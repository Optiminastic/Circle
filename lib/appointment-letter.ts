/**
 * Appointment-letter builder data + helpers. HR fills the editable values in a
 * modal; the fixed letter format (23-clause legal text) is rendered from these
 * values in components/AppointmentLetterPaged.tsx, on the letterhead of the
 * entity chosen at creation (see lib/letter-company.ts).
 */
import { format, parse, isValid } from 'date-fns';
import type { AppointmentLetterData, Candidate, LetterCompany, OfferLetterData } from '@/types';
import { formatINRNumber, numberToIndianWords } from '@/lib/offer-letter';
import { DEFAULT_LETTER_COMPANY, letterBrand } from '@/lib/letter-company';

export type { AppointmentLetterData };

export function formatDMY(value?: string): string {
  if (!value) return '__________';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d = parse(m[1], 'yyyy-MM-dd', new Date());
    if (isValid(d)) return format(d, 'dd-MM-yyyy');
  }
  return value;
}

/**
 * The full letter wording as one editable, markdown-lite string — every
 * paragraph and clause EXCEPT the final signature/acknowledgment block
 * (a two-column layout with an embedded signature image, which stays fixed —
 * see AppointmentLetterPaged.tsx). HR can freely rewrite this (see
 * `AppointmentLetterData.customBody`); when they don't, this is exactly what
 * renders. Convention: blank line = new block, `**text**` = bold.
 */
export function renderAppointmentLetterBody(d: AppointmentLetterData): string {
  const clause = (n: number, title: string, body: string) => `**${n}. ${title}:** ${body}`;
  const { name: brandName } = letterBrand(d.company);
  return [
    `**Date: ${formatDMY(d.createdAt)}**`,
    `**${d.address || 'Address'}**`,
    '**Subject: Letter of Appointment**',
    `**Dear ${d.candidateName || '[Candidate]'},**`,
    `Welcome to ${brandName}!`,
    `The Company takes pleasure in appointing you as **${d.role || '[role]'}** for its **${d.location || 'Mumbai'}** office.`,
    'The terms and conditions of Appointment are enumerated below for your consideration and acceptance.',
    clause(
      1,
      'Date of joining',
      `Your employment with the Company is effective from **${formatDMY(d.joiningDate)}** and, subject to clause 4, shall continue until termination in accordance with the provisions of clause 7.`,
    ),
    clause(
      2,
      'Salary',
      `Your total cost to the Company in the first year of your employment will be **INR ${formatINRNumber(d.ctcAnnual)}/- (${numberToIndianWords(d.ctcAnnual)} only)**. Your remuneration will be reviewed periodically, as per Company policy. Remuneration will be paid to you subject to tax deduction at source (TDS) and other deductions (set-offs, PF, ESIC, taxes, levies or otherwise), as applicable.`,
    ),
    clause(
      3,
      'Transfer',
      "The Company can transfer your services either temporarily or permanently to any of the subsidiary or associated companies in India, in the present or future at the discretion of the company. In the event of a transfer the terms and conditions applicable to you will remain unchanged unless notified in writing.",
    ),
    clause(
      4,
      'Probation',
      'You will be on probation for a period of six months from the date of joining. During the probation period if the Company is not satisfied with your work and conduct, your services shall be liable to be terminated at any time in writing without assigning any reason thereof. The company is not liable to give you any notice period while you are on probation.',
    ),
    clause(5, 'Reporting', 'You shall report to, and be subject to the supervision of Akshae Golekar, CEO.'),
    clause(
      6,
      'Notice Period',
      "An employee can resign from the company at will either by giving 1 (One) month notice period or payment of One month's gross salary. If an employee wishes to resign while on probation, he is required to serve a notice period of 15 (Fifteen) days. The resignation may be delivered by hand or sent via registered post or by email. The company reserves the right to release an employee before the end of their notice period, if deemed necessary.",
    ),
    clause(
      7,
      'Termination',
      "The Company reserves the right to terminate your services without assigning any reasons in case of serious misconduct on your part or breach of your terms of employment or violating the Code of Business Conduct & not complying to relevant Company's SOP's, where the Company has right to terminate your services without any notice. However, the Company may at its discretion relieve you of your duties any time during notice period and in that event, you will be paid salary till the day you have worked. The company is not liable to pay any salary to an absconding employee.",
    ),
    clause(
      8,
      "Handing over charge of Company's property on termination of employment",
      'Upon termination, you are required to return to the Company all the properties of the Company in your possession, including Company leased/rented/owned accommodation, if any, and correspondence which you may have facilitated or communicated with prospects, whether officially or otherwise, in connection with the business of the Company or on its behalf. In the event of your failure to return to the Company any of its property / assets or accommodation referred above, you would be deemed to have committed the offence of criminal breach of trust and the Company shall be free to proceed against you in an appropriate forum, besides claiming liquidated damages for withholding Company property/ assets / accommodation in an unauthorised and illegal manner.',
    ),
    clause(
      9,
      'Training and Onboarding Cost Recovery',
      'The Company invests significant time and resources in the onboarding, training, and development of its employees. In any event that the employee is unable to complete 12 months from the date of joining, the Company shall be entitled to recover the costs incurred towards the employee’s onboarding, training, and development, up to a maximum amount of ₹10,000 (Rupees Ten Thousand only). Such amount may be recovered as part of the employee’s Full and Final Settlement.',
    ),
    clause(
      10,
      'Full & Final Settlement',
      'The Full and Final settlement amount of an ex employee will be cleared within 30 working days from their last working day and the same is subject to smooth transition during the notice period, successful completion of the handover process including submission of all the company owned assets which are possessed by the employee and the overall code of conduct maintained during the notice period. In an event where the employee happens to lose the asset or in case of any damage caused to the asset, the charges for the same will be recovered against the Full and Final settlement amount.',
    ),
    clause(
      11,
      'Retirement',
      'Please note that unless your services come to an end on account of resignation, termination or dismissal, you will retire on your attaining the age of 60 years or earlier if found medically unfit.',
    ),
    clause(
      12,
      'Employment Exclusivity and Moonlighting',
      "During your employment with the Company, you must devote your full time and attention exclusively to your role and are strictly prohibited from engaging in any other employment, including moonlighting, which refers to taking on additional work outside your primary job without the Company's consent. This includes any freelance, consulting, or contractual activities, as well as holding financial interests in other businesses as per Indian Contract Act, 1872. Any violation of this clause will be considered a serious breach of contract, leading to immediate termination without notice, forfeiture of pending salaries and benefits, and potential legal action for damages resulting from conflicts of interest or harm to the Company.",
    ),
    clause(
      13,
      'Non Compete',
      `Upon resignation/retirement or leaving the services of the Company for any reason whatsoever, you will not be permitted to approach, poach any employee or creator and business associates from the present company to any similar/related organisation/business proposition that would affect our business interests. You will not reveal any technological secrets or any information pertaining to creators, commercials of the company for a period of 12 months from the date of your last working day with ${brandName}. The Management of the company reserves the right to, at its own discretion from time to time, specify such Companies that will fall under this category.`,
    ),
    clause(
      14,
      'Policies, Rules and Regulations',
      'You will observe and be bound by all the policies, rules and regulations of the Company, as may be amended from time to time. The policies, rules and regulations are available with the Human Resource Department. The policies, rules and regulations of the Company are by reference included as terms of this letter and acceptance of the terms of this letter will be deemed to imply acceptance of the terms of the policies, rules and regulations of the Company. Accordingly, you will be held responsible for all acts, omissions and non-compliance of rules and regulations, policies, procedures, norms and systems laid down by the management from time to time.',
    ),
    clause(
      15,
      'Discovery of Technology or New Procedure',
      'Any discovery or invention of secret process/technology or improvement in procedure made or discovered by you while in the service of the Company (in connection with or in any way affecting or relating to the business of the Company or capable of being used or adapted for use there or in connection therewith) shall forthwith be disclosed to the Company and shall belong to and be the absolute property of the Company. All patents and rights secured in the course of your work shall be in the name of the Company and shall belong to and be the absolute property of the Company.',
    ),
    clause(
      16,
      'Intellectual Property',
      'In consideration of the Company entering into this contract with you, you hereby agree and acknowledge that (i) the Company or any of its associate/subsidiaries as the case may be, shall be the sole and exclusive owner of any and all intellectual property developed by you during the subsistence of this agreement either alone or with others pertaining to the operations or business of the Company and (ii) you shall have and shall make no claims in respect thereto. You hereby irrevocably and unconditionally waive any and all moral rights or any rights of similar nature under any law in any jurisdiction in and to any and all material written, created or devised by you, whether solely or jointly and pertaining to the operation or business of the Company. You shall not without prior written permission of the Company disclose to anyone outside of the Company and its subsidiaries or use in other than the Company or its subsidiaries business either during or after the termination of the contract any confidential information or material received from its subsidiaries or any information or material received in confidence from a third party by the Company or its subsidiaries or associate companies. On the termination of the contract, you will return all property of the Company and its subsidiaries in your possession including all confidential information or materials such as drawings, notebooks, reports or any other documents in any form, electronic or otherwise.',
    ),
    clause(
      17,
      'Representation',
      'This appointment letter is being issued to you on the basis of the information and particulars furnished by you in your application (including bio-data), at the time of your interview and subsequent discussions. If it transpires that you have made a false statement (or have not disclosed a material fact) resulting in your being offered this appointment, the Management may take such action as it deems fit in its sole discretion, including termination of your employment.',
    ),
    clause(18, 'Tax', 'Salary tax, as assessed by the Government of India will be your responsibility.'),
    clause(
      19,
      'Statutory deductions / payments',
      'Provident fund, ESIC, etc will be applicable as per Government rules.',
    ),
    clause(
      20,
      'Leave and Holidays',
      'You will be entitled to leave and holidays as per the policies / rules prevalent and practices of the management either in existence, extended or awarded from time to time.',
    ),
    clause(
      21,
      'Address for Communication',
      'You will in writing advise the Human Resources Department the address to which communications to you shall be sent, and any communication sent to you at such address shall be deemed to have been duly sent by us and received by you. Your address shall be as advised last by you to us in writing. All communications sent to such an address by ordinary mail or registered post shall be deemed to have been delivered to you within four days of posting and those sent by telegram within 48 hours of their being sent.',
    ),
    clause(
      22,
      'Date of Birth',
      'The date of birth you have provided has been officially recorded and cannot be changed at your discretion. It will serve as the definitive reference for any service-related matters requiring proof of age. To validate this, please submit a photocopy of a school leaving certificate, a birth certificate issued by the registrar of births and deaths, or any other government-issued document displaying your date of birth.',
    ),
    clause(
      23,
      'Company Asset and Credentials',
      'As part of your employment, you will be entrusted with Company property, including physical assets like laptops or mobile devices, and intellectual assets such as login credentials and confidential access details. You are responsible for safeguarding all Company property and credentials, and upon termination or resignation, you must return them in good condition. Failure to do so, or misuse of these assets, may result in deductions from your final settlement or legal action to recover any damages or losses.',
    ),
    clause(
      24,
      'Disputes arising out of your employment',
      'Irrespective of your place of joining the employment of the Company or posting, only courts in Mumbai shall have jurisdiction to adjudicate disputes arising out of your employment (past, present or future) with us.',
    ),
    'Any amendments and additions to this Contract, including amendments and additions to this Clause, are required to be made in writing or via mail.',
    'Please note that the terms and conditions and other stipulations covered under this contract of employment, shall form the sole basis of the relationship between you and the Company and no other promises, assurances or indications of any kind, shall form part of this contract of employment, unless the same is specified in writing or via mail to that effect.',
    'If the terms and conditions mentioned above are acceptable to you in its entirety, you are requested to accord your acceptance of the same by returning the duplicate copy of this letter duly signed by you.',
    'The validity of this Appointment letter is at all times subject to the positive verification of all references given by the employee about prior employment certificate and CV.',
    'Please sign and return to the undersigned the duplicate copy of this letter signifying your acceptance.',
    `We are pleased to welcome you to the ${brandName} family and look forward to a fruitful collaboration.`,
  ].join('\n\n');
}

/** The letter wording actually in effect: HR's edited text if they saved one,
 *  else the auto-generated default (always current with the form's fields). */
export function effectiveAppointmentLetterBody(d: AppointmentLetterData): string {
  return d.customBody?.trim() || renderAppointmentLetterBody(d);
}

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
  company: LetterCompany = DEFAULT_LETTER_COMPANY,
): AppointmentLetterData {
  return {
    company,
    candidateName: candidate?.fullName || candidateName || '',
    address: candidate?.location || '',
    role: candidate?.appliedRole || '',
    location: 'Mumbai',
    ctcAnnual: offerLetter?.ctcAnnual || 0,
    joiningDate: offerLetter?.joiningDate || '',
    createdAt: nowIso,
  };
}
