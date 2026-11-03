'use client';

import React from 'react';
import { Facebook, Globe, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import type { LetterCompany, LetterFooterContent } from '@/types';
import { ALT_OPTI_ADDRESS, ALT_OPTI_CIN, isAltOpti, resolveFooter } from '@/lib/letter-company';

/**
 * The per-page letterhead shared by the offer and appointment letters. Both
 * render fixed A4 pages with the header flush at the top and the footer flush at
 * the bottom of EVERY page, so the banner geometry has to be identical on both
 * and known ahead of pagination (the usable content height derives from it).
 *
 * The Optiminastic header is still a scanned banner image; its footer used to be
 * one too, but is now typeset from OPTIMINASTIC_FOOTER (lib/letter-company.ts) so
 * the address/contact details can be edited without regenerating an image. ALT
 * OPTI is typeset as text throughout and has no footer at all.
 */

const HEADER_IMG =
  'https://res.cloudinary.com/dui7h1n3d/image/upload/v1782973075/Screenshot_2026-07-02_114636_vr0bqh.png';

const FOOTER_PINK = '#ec0a8c';
const FOOTER_YELLOW = '#ffd400';

/** A4 at 96dpi. */
export const PAGE_W = 794;
export const PAGE_H = 1123;

// The header banner height derives from its image's aspect ratio (836×171) at
// full page width; the typeset footer below and the ALT OPTI header set their
// height outright.
const OPTIMINASTIC_HEADER_H = Math.round((PAGE_W * 171) / 836); // ≈ 162
const OPTIMINASTIC_FOOTER_H = 140;
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

/** A column of the Optiminastic footer: a small-icon heading over its rows. */
function FooterColumn({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontWeight: 700,
          fontSize: 12.5,
          color: '#111',
        }}
      >
        <MapPin size={12} strokeWidth={2.5} /> {heading}
      </div>
      <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  );
}

/** One icon + text line inside a footer column. */
function FooterRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#222' }}>
      {icon} {children}
    </div>
  );
}

/** Renders nothing for ALT OPTI, which has no footer banner. `footer` is the
 *  letter's own `customFooter` (per-field HR overrides) — see resolveFooter. */
export function LetterFoot({
  company,
  footer,
}: {
  company?: LetterCompany;
  footer?: LetterFooterContent;
}) {
  if (isAltOpti(company)) return null;
  const f = resolveFooter(footer);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: OPTIMINASTIC_FOOTER_H,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* Decorative brand shape, clipped by the container above. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: -36,
          bottom: -54,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: FOOTER_YELLOW,
        }}
      />
      <div style={{ position: 'relative', padding: '16px 40px 0', display: 'flex', gap: 44 }}>
        <FooterColumn heading="Location">
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#111' }}>{f.companyName}</div>
          <div style={{ fontSize: 10.5, color: '#222' }}>{f.addressLine1}</div>
          <div style={{ fontSize: 10.5, color: '#222' }}>{f.addressLine2}</div>
        </FooterColumn>
        <FooterColumn heading="Contact">
          <FooterRow icon={<Mail size={10} />}>{f.email}</FooterRow>
          <FooterRow icon={<Globe size={10} />}>{f.website}</FooterRow>
          <FooterRow icon={<Phone size={10} />}>{f.phone}</FooterRow>
        </FooterColumn>
        <FooterColumn heading="Get Social">
          <div style={{ display: 'flex', gap: 5, marginTop: 1 }}>
            {[Instagram, Facebook, Linkedin].map((Icon, i) => (
              <span
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#111',
                  color: '#fff',
                }}
              >
                <Icon size={11} />
              </span>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: '#222', marginTop: 2 }}>{f.socialHandle}</div>
        </FooterColumn>
      </div>
      <div
        aria-hidden
        style={{ position: 'absolute', left: 0, bottom: 0, width: '68%', height: 14, background: FOOTER_PINK }}
      />
    </div>
  );
}
