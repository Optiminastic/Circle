'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import type { AppointmentLetterData } from '@/types';
import { formatINRNumber, numberToIndianWords } from '@/lib/offer-letter';

const HEADER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973075/Screenshot_2026-07-02_114636_vr0bqh.png';
const FOOTER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973076/Screenshot_2026-07-02_114609_on3fm3.png';
const SIGNATURE_IMG = '/signature-sakshi-jain.png';

// A4 at 96dpi — same page geometry as the offer letter.
const PAGE_W = 794;
const PAGE_H = 1123;
const HEADER_H = Math.round((PAGE_W * 171) / 836);
const FOOTER_H = Math.round((PAGE_W * 229) / 834);
const PAD_X = 72;
const PAD_Y = 18;
const CONTENT_H = PAGE_H - HEADER_H - FOOTER_H - PAD_Y * 2;

function formatDMY(value?: string): string {
  if (!value) return '__________';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d = parse(m[1], 'yyyy-MM-dd', new Date());
    if (isValid(d)) return format(d, 'dd-MM-yyyy');
  }
  return value;
}

/** Numbered clause with dynamic/inline content, kept as one pagination block. Only
 *  used for the two short clauses that embed live values (date, salary) — every
 *  other clause is plain text and goes through `clauseBlocks` below so long
 *  clauses can break across a page instead of leaving a big gap when they don't fit. */
function Clause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <p className="mb-0">
      <strong>
        {n}. {title}:
      </strong>{' '}
      {children}
    </p>
  );
}

/**
 * Splits a plain-text clause into a handful of sentence-grouped paragraphs (each
 * its own pagination block) instead of one giant block. A single oversized block
 * that doesn't fit the remaining space on a page gets deferred whole to the next
 * page, leaving a large blank gap; smaller chunks let the packer fill pages
 * tightly and only leave a small residual gap at most.
 */
function clauseBlocks(n: number, title: string, text: string): React.ReactNode[] {
  const sentences = text.match(/[^.]+\.(?:\s+|$)/g) || [text];
  const MAX_CHUNK = 420;
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && cur.length + s.length > MAX_CHUNK) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.map((chunk, i) => (
    <p key={`c${n}-${i}`} className="mb-0">
      {i === 0 && (
        <strong>
          {n}. {title}:{' '}
        </strong>
      )}
      {chunk}
    </p>
  ));
}

/** The letter body as an ordered list of pagination blocks (each stays whole on a page). */
function letterBlocks(d: AppointmentLetterData): React.ReactNode[] {
  return [
    <p key="date" className="mb-0 font-bold">Date: {formatDMY(d.createdAt)}</p>,
    <p key="address" className="mb-0 font-bold">{d.address || 'Address**'}</p>,
    <p key="subject" className="mb-0 font-bold">Subject: Letter of Appointment</p>,
    <p key="dear" className="mb-0 font-bold">Dear {d.candidateName || '[Candidate]'},</p>,
    <p key="welcome" className="mb-0">Welcome to Optiminastic!</p>,
    <p key="appointing" className="mb-0">
      The Company takes pleasure in appointing you as <strong>{d.role || '[role]'}</strong> for its{' '}
      <strong>{d.location || 'Mumbai'}</strong> office.
    </p>,
    <p key="terms-intro" className="mb-0">
      The terms and conditions of Appointment are enumerated below for your consideration and
      acceptance.
    </p>,
    <Clause key="c1" n={1} title="Date of joining">
      Your employment with the Company is effective from <strong>{formatDMY(d.joiningDate)}</strong>{' '}
      and, subject to clause 4, shall continue until termination in accordance with the provisions
      of clause 7.
    </Clause>,
    <Clause key="c2" n={2} title="Salary">
      Your total cost to the Company in the first year of your employment will be{' '}
      <strong>
        INR {formatINRNumber(d.ctcAnnual)}/- ({numberToIndianWords(d.ctcAnnual)} only)
      </strong>
      . Your remuneration will be reviewed periodically, as per Company policy. Remuneration will be
      paid to you subject to tax deduction at source (TDS) and other deductions (set-offs, PF, ESIC,
      taxes, levies or otherwise), as applicable.
    </Clause>,
    ...clauseBlocks(
      3,
      'Transfer',
      "The Company can transfer your services either temporarily or permanently to any of the subsidiary or associated companies in India, in the present or future at the discretion of the company. In the event of a transfer the terms and conditions applicable to you will remain unchanged unless notified in writing.",
    ),
    ...clauseBlocks(
      4,
      'Probation',
      'You will be on probation for a period of six months from the date of joining. During the probation period if the Company is not satisfied with your work and conduct, your services shall be liable to be terminated at any time in writing without assigning any reason thereof. The company is not liable to give you any notice period while you are on probation.',
    ),
    ...clauseBlocks(5, 'Reporting', 'You shall report to, and be subject to the supervision of Akshae Golekar, CEO.'),
    ...clauseBlocks(
      6,
      'Notice Period',
      "An employee can resign from the company at will either by giving 1 (One) month notice period or payment of One month's gross salary. If an employee wishes to resign while on probation, he is required to serve a notice period of 15 (Fifteen) days. The resignation may be delivered by hand or sent via registered post or by email. The company reserves the right to release an employee before the end of their notice period, if deemed necessary.",
    ),
    ...clauseBlocks(
      7,
      'Termination',
      "The Company reserves the right to terminate your services without assigning any reasons in case of serious misconduct on your part or breach of your terms of employment or violating the Code of Business Conduct & not complying to relevant Company's SOP's, where the Company has right to terminate your services without any notice. However, the Company may at its discretion relieve you of your duties any time during notice period and in that event, you will be paid salary till the day you have worked. The company is not liable to pay any salary to an absconding employee.",
    ),
    ...clauseBlocks(
      8,
      "Handing over charge of Company's property on termination of employment",
      'Upon termination, you are required to return to the Company all the properties of the Company in your possession, including Company leased/rented/owned accommodation, if any, and correspondence which you may have facilitated or communicated with prospects, whether officially or otherwise, in connection with the business of the Company or on its behalf. In the event of your failure to return to the Company any of its property / assets or accommodation referred above, you would be deemed to have committed the offence of criminal breach of trust and the Company shall be free to proceed against you in an appropriate forum, besides claiming liquidated damages for withholding Company property/ assets / accommodation in an unauthorised and illegal manner.',
    ),
    ...clauseBlocks(
      9,
      'Full & Final Settlement',
      'The Full and Final settlement amount of an ex employee will be cleared within 30 working days from their last working day and the same is subject to smooth transition during the notice period, successful completion of the handover process including submission of all the company owned assets which are possessed by the employee and the overall code of conduct maintained during the notice period. In an event where the employee happens to lose the asset or in case of any damage caused to the asset, the charges for the same will be recovered against the Full and Final settlement amount.',
    ),
    ...clauseBlocks(
      10,
      'Retirement',
      'Please note that unless your services come to an end on account of resignation, termination or dismissal, you will retire on your attaining the age of 60 years or earlier if found medically unfit.',
    ),
    ...clauseBlocks(
      11,
      'Employment Exclusivity and Moonlighting',
      "During your employment with the Company, you must devote your full time and attention exclusively to your role and are strictly prohibited from engaging in any other employment, including moonlighting, which refers to taking on additional work outside your primary job without the Company's consent. This includes any freelance, consulting, or contractual activities, as well as holding financial interests in other businesses as per Indian Contract Act, 1872. Any violation of this clause will be considered a serious breach of contract, leading to immediate termination without notice, forfeiture of pending salaries and benefits, and potential legal action for damages resulting from conflicts of interest or harm to the Company.",
    ),
    ...clauseBlocks(
      12,
      'Non Compete',
      'Upon resignation/retirement or leaving the services of the Company for any reason whatsoever, you will not be permitted to approach, poach any employee or creator and business associates from the present company to any similar/related organisation/business proposition that would affect our business interests. You will not reveal any technological secrets or any information pertaining to creators, commercials of the company for a period of 12 months from the date of your last working day with Optiminastic. The Management of the company reserves the right to, at its own discretion from time to time, specify such Companies that will fall under this category.',
    ),
    ...clauseBlocks(
      13,
      'Policies, Rules and Regulations',
      'You will observe and be bound by all the policies, rules and regulations of the Company, as may be amended from time to time. The policies, rules and regulations are available with the Human Resource Department. The policies, rules and regulations of the Company are by reference included as terms of this letter and acceptance of the terms of this letter will be deemed to imply acceptance of the terms of the policies, rules and regulations of the Company. Accordingly, you will be held responsible for all acts, omissions and non-compliance of rules and regulations, policies, procedures, norms and systems laid down by the management from time to time.',
    ),
    ...clauseBlocks(
      14,
      'Discovery of Technology or New Procedure',
      'Any discovery or invention of secret process/technology or improvement in procedure made or discovered by you while in the service of the Company (in connection with or in any way affecting or relating to the business of the Company or capable of being used or adapted for use there or in connection therewith) shall forthwith be disclosed to the Company and shall belong to and be the absolute property of the Company. All patents and rights secured in the course of your work shall be in the name of the Company and shall belong to and be the absolute property of the Company.',
    ),
    ...clauseBlocks(
      15,
      'Intellectual Property',
      'In consideration of the Company entering into this contract with you, you hereby agree and acknowledge that (i) the Company or any of its associate/subsidiaries as the case may be, shall be the sole and exclusive owner of any and all intellectual property developed by you during the subsistence of this agreement either alone or with others pertaining to the operations or business of the Company and (ii) you shall have and shall make no claims in respect thereto. You hereby irrevocably and unconditionally waive any and all moral rights or any rights of similar nature under any law in any jurisdiction in and to any and all material written, created or devised by you, whether solely or jointly and pertaining to the operation or business of the Company. You shall not without prior written permission of the Company disclose to anyone outside of the Company and its subsidiaries or use in other than the Company or its subsidiaries business either during or after the termination of the contract any confidential information or material received from its subsidiaries or any information or material received in confidence from a third party by the Company or its subsidiaries or associate companies. On the termination of the contract, you will return all property of the Company and its subsidiaries in your possession including all confidential information or materials such as drawings, notebooks, reports or any other documents in any form, electronic or otherwise.',
    ),
    ...clauseBlocks(
      16,
      'Representation',
      'This appointment letter is being issued to you on the basis of the information and particulars furnished by you in your application (including bio-data), at the time of your interview and subsequent discussions. If it transpires that you have made a false statement (or have not disclosed a material fact) resulting in your being offered this appointment, the Management may take such action as it deems fit in its sole discretion, including termination of your employment.',
    ),
    ...clauseBlocks(17, 'Tax', 'Salary tax, as assessed by the Government of India will be your responsibility.'),
    ...clauseBlocks(
      18,
      'Statutory deductions / payments',
      'Provident fund, ESIC, etc will be applicable as per Government rules.',
    ),
    ...clauseBlocks(
      19,
      'Leave and Holidays',
      'You will be entitled to leave and holidays as per the policies / rules prevalent and practices of the management either in existence, extended or awarded from time to time.',
    ),
    ...clauseBlocks(
      20,
      'Address for Communication',
      'You will in writing advise the Human Resources Department the address to which communications to you shall be sent, and any communication sent to you at such address shall be deemed to have been duly sent by us and received by you. Your address shall be as advised last by you to us in writing. All communications sent to such an address by ordinary mail or registered post shall be deemed to have been delivered to you within four days of posting and those sent by telegram within 48 hours of their being sent.',
    ),
    ...clauseBlocks(
      21,
      'Date of Birth',
      'The date of birth you have provided has been officially recorded and cannot be changed at your discretion. It will serve as the definitive reference for any service-related matters requiring proof of age. To validate this, please submit a photocopy of a school leaving certificate, a birth certificate issued by the registrar of births and deaths, or any other government-issued document displaying your date of birth.',
    ),
    ...clauseBlocks(
      22,
      'Company Asset and Credentials',
      'As part of your employment, you will be entrusted with Company property, including physical assets like laptops or mobile devices, and intellectual assets such as login credentials and confidential access details. You are responsible for safeguarding all Company property and credentials, and upon termination or resignation, you must return them in good condition. Failure to do so, or misuse of these assets, may result in deductions from your final settlement or legal action to recover any damages or losses.',
    ),
    ...clauseBlocks(
      23,
      'Disputes arising out of your employment',
      'Irrespective of your place of joining the employment of the Company or posting, only courts in Mumbai shall have jurisdiction to adjudicate disputes arising out of your employment (past, present or future) with us.',
    ),
    <p key="amend" className="mb-0">
      Any amendments and additions to this Contract, including amendments and additions to this
      Clause, are required to be made in writing or via mail.
    </p>,
    <p key="sole-basis" className="mb-0">
      Please note that the terms and conditions and other stipulations covered under this contract
      of employment, shall form the sole basis of the relationship between you and the Company and
      no other promises, assurances or indications of any kind, shall form part of this contract of
      employment, unless the same is specified in writing or via mail to that effect.
    </p>,
    <p key="accept-para" className="mb-0">
      If the terms and conditions mentioned above are acceptable to you in its entirety, you are
      requested to accord your acceptance of the same by returning the duplicate copy of this letter
      duly signed by you.
    </p>,
    <p key="valid-para" className="mb-0">
      The validity of this Appointment letter is at all times subject to the positive verification of
      all references given by the employee about prior employment certificate and CV.
    </p>,
    <p key="sign-return" className="mb-0">
      Please sign and return to the undersigned the duplicate copy of this letter signifying your
      acceptance.
    </p>,
    <p key="closing-welcome" className="mb-0">
      We are pleased to welcome you to the Optiminastic family and look forward to a fruitful
      collaboration.
    </p>,
    <div key="siglines" className="mt-2 grid grid-cols-2 gap-6">
      <div>
        <p className="mb-1">Yours truly,</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SIGNATURE_IMG} alt="Signature" style={{ height: 56, display: 'block' }} />
        <p className="mb-0 font-bold">For, Optiminastic Infomedia</p>
        <p className="mb-0 font-bold">Sakshi Jain</p>
        <p className="mb-0 font-bold">CFO</p>
      </div>
      <div>
        <p className="mb-6">I hereby acknowledge, agree and confirm</p>
        <p className="mb-1">
          Name: <strong>{d.candidateName || '[Candidate]'}</strong>
        </p>
        <p className="mb-0">Date: _______________</p>
      </div>
    </div>,
  ];
}

/**
 * Renders the appointment letter as fixed A4 pages with the header flush at the
 * top and footer flush at the bottom of EVERY page — measured + paginated in the
 * browser so nothing overlaps and there are no gaps. Mirrors OfferLetterPaged.
 */
export function AppointmentLetterPaged({
  data,
  rootRef,
}: {
  data: AppointmentLetterData;
  rootRef?: React.Ref<HTMLDivElement>;
}) {
  const blocks = letterBlocks(data);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([]);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const result: number[][] = [];
    let cur: number[] = [];
    let h = 0;
    kids.forEach((kid, i) => {
      const bh = kid.offsetHeight + 10;
      if (h + bh > CONTENT_H && cur.length) {
        result.push(cur);
        cur = [];
        h = 0;
      }
      cur.push(i);
      h += bh;
    });
    if (cur.length) result.push(cur);
    setPages(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  const rendered = pages.length ? pages : [blocks.map((_, i) => i)];

  return (
    <div ref={rootRef}>
      {/* Off-screen measuring pass */}
      <div
        ref={measureRef}
        aria-hidden
        style={{ position: 'absolute', left: -99999, top: 0, width: PAGE_W - PAD_X * 2, textAlign: 'justify' }}
        className="space-y-2.5 text-[12.5px] leading-relaxed text-gray-900"
      >
        {blocks.map((b, i) => (
          <div key={i}>{b}</div>
        ))}
      </div>

      {/* Real A4 pages */}
      {rendered.map((pageBlocks, pi) => {
        return (
          <div
            key={pi}
            className="ol-page"
            style={{ width: PAGE_W, height: PAGE_H, position: 'relative', overflow: 'hidden', background: '#fff' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HEADER_IMG} alt="Optiminastic" style={{ display: 'block', width: '100%' }} />
            <div
              className="text-[12.5px] leading-relaxed text-gray-900"
              style={{
                height: PAGE_H - HEADER_H - FOOTER_H,
                padding: `${PAD_Y}px ${PAD_X}px`,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                justifyContent: 'flex-start',
                overflow: 'hidden',
                textAlign: 'justify',
              }}
            >
              {pageBlocks.map(bi => (
                <div key={bi}>{blocks[bi]}</div>
              ))}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FOOTER_IMG}
              alt=""
              style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', display: 'block' }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default AppointmentLetterPaged;
