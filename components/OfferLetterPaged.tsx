'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import type { OfferLetterData } from '@/types';
import {
  computeBreakup,
  effectiveOfferLetterBody,
  formatINRNumber,
  parseLetterBlocks,
  splitAtCtcTableMarker,
} from '@/lib/offer-letter';
import { renderLetterBlock } from './letter-body';
import { LetterFoot, LetterHead, PAGE_H, PAGE_W, letterheadHeights } from './letterhead';

const PAD_X = 58;
const PAD_Y = 18;

const EXACT: React.CSSProperties = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
const TABLE: React.CSSProperties = { width: '100%', maxWidth: 460, borderCollapse: 'collapse', fontSize: '10.5px', lineHeight: 1.25 };
const CELL: React.CSSProperties = { border: '1px solid #808080', padding: '2px 8px', textAlign: 'left', verticalAlign: 'top', ...EXACT };
const TH: React.CSSProperties = { ...CELL, background: '#dcdcdc', fontWeight: 700 };

/** The CTC breakdown — the one part of the letter that always stays a real
 *  computed table, never free text (see CTC_TABLE_MARKER). */
function ctcTable(d: OfferLetterData, key: React.Key): React.ReactNode {
  const rows = computeBreakup(d);
  return (
    <div key={key}>
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
    </div>
  );
}

/** The letter body as an ordered list of FINE blocks (each stays whole on a page —
 *  no block is split across pages). Kept fine so pages fill with minimal gaps;
 *  headings stay attached to their first paragraph so they never orphan.
 *  Wording comes from `effectiveOfferLetterBody` (HR's edited text, or the
 *  auto-generated default) — only the CTC table is always separately computed. */
function letterBlocks(d: OfferLetterData): React.ReactNode[] {
  const { before, after } = splitAtCtcTableMarker(effectiveOfferLetterBody(d));
  const beforeBlocks = parseLetterBlocks(before);
  const afterBlocks = parseLetterBlocks(after);
  return [
    ...beforeBlocks.map((b, i) => renderLetterBlock(b, `before-${i}`)),
    ctcTable(d, 'ctc-table'),
    ...afterBlocks.map((b, i) => renderLetterBlock(b, `after-${i}`)),
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
            <LetterHead company={data.company} />
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
            <LetterFoot company={data.company} />
          </div>
        );
      })}
    </div>
  );
}

export default OfferLetterPaged;
