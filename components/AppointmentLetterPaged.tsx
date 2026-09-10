'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import type { AppointmentLetterData } from '@/types';
import { effectiveAppointmentLetterBody } from '@/lib/appointment-letter';
import { parseLetterBlocks } from '@/lib/letter-body';
import { letterBrand } from '@/lib/letter-company';
import { renderLetterBlock } from './letter-body';
import { LetterFoot, LetterHead, PAGE_H, PAGE_W, letterheadHeights } from './letterhead';

const SIGNATURE_IMG = '/signature-sakshi-jain.png';

const PAD_X = 72;
const PAD_Y = 18;

/** The letter body as an ordered list of pagination blocks (each stays whole on a page).
 *  Wording comes from `effectiveAppointmentLetterBody` (HR's edited text, or the
 *  auto-generated default) — only the final signature/acknowledgment block (with
 *  its two-column layout and embedded signature image) is always fixed, appended
 *  after the parsed wording. */
function letterBlocks(d: AppointmentLetterData): React.ReactNode[] {
  const wordingBlocks = parseLetterBlocks(effectiveAppointmentLetterBody(d));
  return [
    ...wordingBlocks.map((b, i) => renderLetterBlock(b, i)),
    <div key="siglines" className="mt-2 grid grid-cols-2 gap-6">
      <div>
        <p className="mb-1">Yours truly,</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SIGNATURE_IMG} alt="Signature" style={{ height: 56, display: 'block' }} />
        <p className="mb-0 font-bold">For, {letterBrand(d.company).legalName}</p>
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
  const { headerH: HEADER_H, footerH: FOOTER_H } = letterheadHeights(data.company);
  // Usable content height on each page (between header and footer, minus padding).
  const CONTENT_H = PAGE_H - HEADER_H - FOOTER_H - PAD_Y * 2;
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
            <LetterHead company={data.company} />
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
            <LetterFoot company={data.company} />
          </div>
        );
      })}
    </div>
  );
}

export default AppointmentLetterPaged;
