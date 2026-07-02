'use client';

import React from 'react';
import type { OfferLetterData } from '@/types';
import { computeBreakup, formatINRNumber, numberToIndianWords } from '@/lib/offer-letter';

// Exact PDF header/footer banners (logo + CIN + petals / location-contact-social +
// pink bar + yellow arc). Full-bleed images so the letter matches the source 1:1.
const HEADER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973075/Screenshot_2026-07-02_114636_vr0bqh.png';
const FOOTER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973076/Screenshot_2026-07-02_114609_on3fm3.png';

// Inline styles for the CTC table so borders + grey/pink shading render identically
// in the on-screen preview AND the print popup (Tailwind-independent; the
// print-color-adjust hints force the shading to actually print).
const EXACT: React.CSSProperties = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
const TABLE: React.CSSProperties = {
  width: '100%',
  maxWidth: 460,
  borderCollapse: 'collapse',
  fontSize: '10.5px',
  lineHeight: 1.25,
  margin: '0 0 16px',
};
const CELL: React.CSSProperties = {
  border: '1px solid #808080',
  padding: '2px 8px',
  textAlign: 'left',
  verticalAlign: 'top',
  ...EXACT,
};
const TH: React.CSSProperties = { ...CELL, background: '#dcdcdc', fontWeight: 700 };

const REQUIRED_DOCS = [
  'Proof of age (birth certificate / school leaving certificate / passport copy)',
  'Most recent educational qualification certificates (Degree Certificates / Marks Sheets)',
  'Release letter from the previous employer',
  'Resignation acceptance from current employer',
  'Offer Letter from current employer',
  'Last salary certificates / slips (3 Months)',
  'Passport size colour photograph (1 Copy)',
  'PAN card',
  'Aadhaar card',
];

/**
 * Renders the offer letter with Optiminastic's EXACT header/footer banner images
 * (from the source PDF) and the HR-entered values dropped into the body copy.
 * Used for preview + print.
 */
export function OfferLetterDocument({ data }: { data: OfferLetterData }) {
  const rows = computeBreakup(data);
  const ctcWords = numberToIndianWords(data.ctcAnnual);
  const name = `${data.salutation} ${data.candidateName}`.trim();

  return (
    <div
      id="offer-letter-print"
      className="mx-auto max-w-[820px] bg-white text-[13px] leading-relaxed text-gray-900"
    >
      {/* A table lets the browser repeat the header (<thead>) and footer (<tfoot>)
          on EVERY printed page while the body (<tbody>) paginates between them. */}
      <table className="ol-table w-full border-collapse">
        <thead className="ol-band">
          <tr>
            <td className="p-0">
              {/* Exact header banner — repeats at the top of every page */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HEADER_IMG} alt="Optiminastic" className="block w-full" />
            </td>
          </tr>
        </thead>
        <tfoot className="ol-band">
          <tr>
            <td className="p-0">
              {/* Exact footer banner — repeats at the bottom of every page */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FOOTER_IMG} alt="" className="block w-full" />
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td className="ol-content px-10 py-6 align-top">
        <h1 className="mb-5 text-center text-[15px] font-bold underline">OFFER LETTER</h1>

        <p className="mb-3 font-bold">Dear {name},</p>
        <p className="mb-3">
          With reference to your application and subsequent interview, we are pleased to offer you the
          position of <strong>{data.role || '[role]'}</strong> at <strong>Optiminastic</strong>. You will
          be based out of our office in <strong>{data.location || 'Mumbai'}</strong>.
        </p>

        <p className="mb-1 font-bold">1. Salary</p>
        <p className="mb-3">
          We offer you an{' '}
          <strong>Annual Compensation (CTC) of INR {formatINRNumber(data.ctcAnnual)}/-</strong> ({ctcWords}{' '}
          only), the break-up of which is detailed below. This compensation is subject to deductions as
          per the Income Tax Act, 1961, and other applicable laws.
        </p>
        <p className="mb-3">Further income tax will be deducted as applicable.</p>

        <p className="mb-1 font-bold">2. Date of Commencement</p>
        <p className="mb-3">
          Your effective start date is <strong>{data.joiningDate || '[start date]'}</strong>. In case of
          any emergencies or issues preventing you from joining on this date, kindly inform the HR team at
          your earliest convenience.
        </p>

        <p className="mb-1 font-bold">3. Documents to be Submitted</p>
        <p className="mb-1">
          You are requested to submit an e-copy of the following documents on your Date of Joining:
        </p>
        <ul className="mb-3 list-disc pl-6">
          {REQUIRED_DOCS.map(d => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p className="mb-3">
          This offer is valid subject to the verification of the aforementioned documents and the
          completion of joining formalities. Any discrepancies found during documentation or background
          verification may result in the withdrawal of this offer.
        </p>

        <p className="mb-1 font-bold">4. Probation Period</p>
        <p className="mb-3">
          You will be on probation for a period of{' '}
          <strong>{data.probationPeriod || 'six months'}</strong> from your date of joining. At the end of
          this period, your performance will be reviewed, and upon satisfactory evaluation, your employment
          will be confirmed.
        </p>

        <p className="mb-1 font-bold">5. Appointment Letter</p>
        <p className="mb-3">
          A detailed appointment letter outlining the full terms and conditions of your employment will be
          provided on the day of joining, after the completion of your onboarding formalities.
        </p>
        <p className="mb-4">
          We warmly welcome you to the Optiminastic family and look forward to having you with us.
        </p>

        <p className="mb-2 font-bold">Breakup of the fixed CTC:</p>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH }}>Headings</th>
              <th style={{ ...TH }}>Monthly</th>
              <th style={{ ...TH }}>Annual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              if (r.spacer)
                return (
                  <tr key={i}>
                    <td style={{ ...CELL, height: 12 }} />
                    <td style={{ ...CELL, height: 12 }} />
                    <td style={{ ...CELL, height: 12 }} />
                  </tr>
                );
              if (r.section)
                return (
                  <tr key={i}>
                    <td style={{ ...CELL, fontWeight: 700, textDecoration: 'underline' }}>{r.label}</td>
                    <td style={CELL} />
                    <td style={CELL} />
                  </tr>
                );
              const bg: React.CSSProperties = r.highlight
                ? { background: '#f4cccc', fontWeight: 700 }
                : r.strong
                  ? { background: '#dcdcdc', fontWeight: 700 }
                  : {};
              return (
                <tr key={i}>
                  <td style={{ ...CELL, ...bg }}>{r.label}</td>
                  <td style={{ ...CELL, ...bg }}>{formatINRNumber(r.monthly)}</td>
                  <td style={{ ...CELL, ...bg }}>{formatINRNumber(r.annual)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mb-4">
          <strong>Medical Insurance</strong>: Coverage for self up to INR{' '}
          {formatINRNumber(data.medicalInsurance)} (after completion of your probation period)
        </p>

        <p className="mb-4">
          In case you have any further clarifications, please contact ({data.hrEmail}).
        </p>

        <p className="mb-0">Yours faithfully,</p>
        <p className="mb-0 font-bold">For Optiminastic Infomedia</p>
        <p className="mb-0 font-bold">{data.signatoryName}</p>
        <p className="mb-4 font-bold">{data.signatoryTitle}</p>

        <p className="mb-6 font-bold">
          I, {data.candidateName || '[name]'}, confirm my acceptance of the offer and the terms and
          conditions mentioned herein.
        </p>

        <p className="mb-0 font-bold">Signature:</p>
        <p className="mb-0 font-bold">
          Date: <span className="font-normal">_______________</span>
        </p>
        <p className="mb-0 font-bold">
          Place: <span className="font-normal">_______________</span>
        </p>
            </td>
          </tr>
        </tbody>
      </table>
      {/* Print-only footer pinned to the physical bottom of EVERY page. The <tfoot>
          above stays in the layout as a same-height spacer (reserves the space so
          content never overlaps); this copy is fixed to the page bottom so the
          footer sits flush even on a short last page. Hidden in the on-screen preview. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img id="ol-fixed-footer" src={FOOTER_IMG} alt="" className="hidden w-full" />
    </div>
  );
}

export default OfferLetterDocument;
