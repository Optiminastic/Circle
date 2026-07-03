'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import type { OfferLetterData } from '@/types';
import { computeBreakup, formatINRNumber, numberToIndianWords } from '@/lib/offer-letter';

const HEADER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973075/Screenshot_2026-07-02_114636_vr0bqh.png';
const FOOTER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973076/Screenshot_2026-07-02_114609_on3fm3.png';

// A4 at 96dpi. Header/footer banner heights derive from the image aspect ratios
// (836×171, 834×229) at full page width.
const PAGE_W = 794;
const PAGE_H = 1123;
const HEADER_H = Math.round((PAGE_W * 171) / 836); // ≈ 162
const FOOTER_H = Math.round((PAGE_W * 229) / 834); // ≈ 218
const PAD_X = 58;
const PAD_Y = 18;
// Usable content height on each page (between header and footer, minus padding).
const CONTENT_H = PAGE_H - HEADER_H - FOOTER_H - PAD_Y * 2;

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

const EXACT: React.CSSProperties = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
const TABLE: React.CSSProperties = { width: '100%', maxWidth: 460, borderCollapse: 'collapse', fontSize: '10.5px', lineHeight: 1.25 };
const CELL: React.CSSProperties = { border: '1px solid #808080', padding: '2px 8px', textAlign: 'left', verticalAlign: 'top', ...EXACT };
const TH: React.CSSProperties = { ...CELL, background: '#dcdcdc', fontWeight: 700 };

function formatJoining(value?: string): string {
  if (!value) return '[start date]';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d = parse(m[1], 'yyyy-MM-dd', new Date());
    if (isValid(d)) return format(d, 'do MMMM yyyy');
  }
  return value;
}

/** The letter body as an ordered list of FINE blocks (each stays whole on a page —
 *  no block is split across pages). Kept fine so pages fill with minimal gaps;
 *  headings stay attached to their first paragraph so they never orphan. */
function letterBlocks(d: OfferLetterData): React.ReactNode[] {
  const name = `${d.salutation} ${d.candidateName}`.trim();
  const rows = computeBreakup(d);
  return [
    <h1 key="title" className="mb-1 text-center text-[15px] font-bold underline">OFFER LETTER</h1>,
    <p key="dear" className="font-bold">Dear {name},</p>,
    <p key="intro">
      With reference to your application and subsequent interview, we are pleased to offer you the position
      of <strong>{d.role || '[role]'}</strong> at <strong>Optiminastic</strong>. You will be based out of
      our office in <strong>{d.location || 'Mumbai'}</strong>.
    </p>,
    <div key="salary">
      <p className="mb-1 font-bold">1. Salary</p>
      <p className="mb-0">
        We offer you an{' '}
        <strong>Annual Compensation (CTC) of INR {formatINRNumber(d.ctcAnnual)}/-</strong> (
        {numberToIndianWords(d.ctcAnnual)} only), the break-up of which is detailed below. This
        compensation is subject to deductions as per the Income Tax Act, 1961, and other applicable laws.
      </p>
    </div>,
    <p key="salary2">Further income tax will be deducted as applicable.</p>,
    <div key="commence">
      <p className="mb-1 font-bold">2. Date of Commencement</p>
      <p className="mb-0">
        Your effective start date is <strong>{formatJoining(d.joiningDate)}</strong>. In case of any
        emergencies or issues preventing you from joining on this date, kindly inform the HR team at your
        earliest convenience.
      </p>
    </div>,
    <div key="docs-h">
      <p className="mb-1 font-bold">3. Documents to be Submitted</p>
      <p className="mb-0">You are requested to submit an e-copy of the following documents on your Date of Joining:</p>
    </div>,
    <ul key="docs-list" className="list-disc pl-6">
      {REQUIRED_DOCS.map(x => (
        <li key={x}>{x}</li>
      ))}
    </ul>,
    <p key="docs-valid">
      This offer is valid subject to the verification of the aforementioned documents and the completion of
      joining formalities. Any discrepancies found during documentation or background verification may
      result in the withdrawal of this offer.
    </p>,
    <div key="probation">
      <p className="mb-1 font-bold">4. Probation Period</p>
      <p className="mb-0">
        You will be on probation for a period of <strong>{d.probationPeriod || 'six months'}</strong> from
        your date of joining. At the end of this period, your performance will be reviewed, and upon
        satisfactory evaluation, your employment will be confirmed.
      </p>
    </div>,
    <div key="appointment">
      <p className="mb-1 font-bold">5. Appointment Letter</p>
      <p className="mb-0">
        A detailed appointment letter outlining the full terms and conditions of your employment will be
        provided on the day of joining, after the completion of your onboarding formalities.
      </p>
    </div>,
    <p key="welcome">We warmly welcome you to the Optiminastic family and look forward to having you with us.</p>,
    <div key="ctc">
      <p className="mb-2 font-bold">Breakup of the fixed CTC:</p>
      <table style={TABLE}>
        <thead>
          <tr>
            <th style={TH}>Headings</th>
            <th style={TH}>Monthly</th>
            <th style={TH}>Annual</th>
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
    </div>,
    <p key="medical" className="mb-0">
      <strong>Medical Insurance</strong>: Coverage for self up to INR {formatINRNumber(d.medicalInsurance)}{' '}
      (after completion of your probation period)
    </p>,
    <p key="clarify" className="mb-0">
      In case you have any further clarifications, please contact ({d.hrEmail}).
    </p>,
    <div key="sign">
      <p className="mb-0">Yours faithfully,</p>
      <p className="mb-0 font-bold">For Optiminastic Infomedia</p>
      <p className="mb-0 font-bold">{d.signatoryName}</p>
      <p className="mb-0 font-bold">{d.signatoryTitle}</p>
    </div>,
    <p key="accept" className="mb-0 font-bold">
      I, {d.candidateName || '[name]'}, confirm my acceptance of the offer and the terms and conditions
      mentioned herein.
    </p>,
    <div key="siglines">
      <p className="mb-0 font-bold">Signature:</p>
      <p className="mb-0 font-bold">Date: _______________</p>
      <p className="mb-0 font-bold">Place: _______________</p>
    </div>,
  ];
}

/**
 * Renders the offer letter as fixed A4 pages with the header flush at the top and
 * the footer flush at the bottom of EVERY page — measured + paginated in the
 * browser so nothing overlaps and there are no gaps. Used for preview + print.
 */
export function OfferLetterPaged({
  data,
  rootRef,
}: {
  data: OfferLetterData;
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
      const bh = kid.offsetHeight + 10; // block + gap
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
        style={{ position: 'absolute', left: -99999, top: 0, width: PAGE_W - PAD_X * 2 }}
        className="space-y-2.5 text-[13px] leading-relaxed text-gray-900"
      >
        {blocks.map((b, i) => (
          <div key={i}>{b}</div>
        ))}
      </div>

      {/* Real A4 pages */}
      {rendered.map((pageBlocks, pi) => {
        const isLast = pi === rendered.length - 1;
        return (
          <div
            key={pi}
            className="ol-page"
            style={{ width: PAGE_W, height: PAGE_H, position: 'relative', overflow: 'hidden', background: '#fff' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HEADER_IMG} alt="Optiminastic" style={{ display: 'block', width: '100%' }} />
            <div
              className="text-[13px] leading-relaxed text-gray-900"
              style={{
                height: PAGE_H - HEADER_H - FOOTER_H,
                padding: `${PAD_Y}px ${PAD_X}px`,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                // Non-last pages distribute the leftover space so content fills the
                // page (no big gap above the footer); the last page is top-aligned.
                justifyContent: isLast ? 'flex-start' : 'space-between',
                overflow: 'hidden',
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

export default OfferLetterPaged;
