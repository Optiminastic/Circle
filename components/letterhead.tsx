'use client';

import React from 'react';
import type { LetterCompany } from '@/types';
import { ALT_OPTI_ADDRESS, ALT_OPTI_CIN, isAltOpti } from '@/lib/letter-company';

/**
 * The per-page letterhead shared by the offer and appointment letters. Both
 * render fixed A4 pages with the header flush at the top and the footer flush at
 * the bottom of EVERY page, so the banner geometry has to be identical on both
 * and known ahead of pagination (the usable content height derives from it).
 *
 * Optiminastic uses scanned banner images; ALT OPTI is typeset as text and has
 * no footer at all.
 */

const HEADER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973075/Screenshot_2026-07-02_114636_vr0bqh.png';
const FOOTER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973076/Screenshot_2026-07-02_114609_on3fm3.png';

/** A4 at 96dpi. */
export const PAGE_W = 794;
export const PAGE_H = 1123;

// Banner heights derive from the image aspect ratios (836×171, 834×229) at full
// page width; the ALT OPTI header is text, so its height is set outright.
const OPTIMINASTIC_HEADER_H = Math.round((PAGE_W * 171) / 836); // ≈ 162
const OPTIMINASTIC_FOOTER_H = Math.round((PAGE_W * 229) / 834); // ≈ 218
const ALT_OPTI_HEADER_H = 150;
const ALT_OPTI_FOOTER_H = 0;

/** Header/footer heights to reserve on every page for this entity. */
export const letterheadHeights = (
  company?: LetterCompany,
): { headerH: number; footerH: number } =>
  isAltOpti(company)
    ? { headerH: ALT_OPTI_HEADER_H, footerH: ALT_OPTI_FOOTER_H }
    : { headerH: OPTIMINASTIC_HEADER_H, footerH: OPTIMINASTIC_FOOTER_H };

export function LetterHead({ company }: { company?: LetterCompany }) {
  if (!isAltOpti(company)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={HEADER_IMG} alt="Optiminastic" style={{ display: 'block', width: '100%' }} />;
  }
  return (
    <div
      style={{
        width: '100%',
        height: ALT_OPTI_HEADER_H,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 40px',
        background: '#fff',
      }}
    >
      <div
        style={{
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontWeight: 900,
          fontSize: 19,
          color: '#800080',
          letterSpacing: 0.3,
        }}
      >
        ALT OPTI MEDIA PRIVATE LIMITED
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, color: '#111' }}>
        CIN : {ALT_OPTI_CIN}
      </div>
      <div style={{ width: '100%', maxWidth: 714, borderTop: '2px solid #800080', margin: '8px 0 6px' }} />
      <div style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.35, color: '#111' }}>
        {ALT_OPTI_ADDRESS}
      </div>
    </div>
  );
}

/** Renders nothing for ALT OPTI, which has no footer banner. */
export function LetterFoot({ company }: { company?: LetterCompany }) {
  if (isAltOpti(company)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={FOOTER_IMG}
      alt=""
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', display: 'block' }}
    />
  );
}
