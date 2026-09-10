/**
 * The legal entity a letter (offer or appointment) is issued under.
 *
 * HR picks it once when the letter is created; it then stays fixed on the letter
 * and drives three things: which letterhead the page renders (see
 * components/letterhead.tsx), which brand names appear in the wording, and the
 * legal name in the signature block.
 */
import type { LetterCompany } from '@/types';

/** Letters created before the field existed have no `company` — treat as the default. */
export const DEFAULT_LETTER_COMPANY: LetterCompany = 'optiminastic';

export const isAltOpti = (company?: LetterCompany): boolean =>
  (company ?? DEFAULT_LETTER_COMPANY) === 'alt_opti';

export const ALT_OPTI_CIN = 'U62099MH2023PTC410008';
export const ALT_OPTI_ADDRESS =
  'Regd Office : 1505,Floor-15th, Amorina Heights, Shankar Sheth Rd, Grant Road, Mumbai-400007, Maharashtra';

export interface LetterBrand {
  /** How the company is referred to inside the letter's prose. */
  name: string;
  /** The registered name used in the "For <company>" signature line. */
  legalName: string;
}

const BRANDS: Record<LetterCompany, LetterBrand> = {
  optiminastic: { name: 'Optiminastic', legalName: 'Optiminastic Infomedia' },
  alt_opti: {
    name: 'ALT OPTI MEDIA PRIVATE LIMITED',
    legalName: 'ALT OPTI MEDIA PRIVATE LIMITED',
  },
};

/** Unknown/corrupt stored values fall back to the default rather than throwing —
 *  `company` arrives as untyped JSON from the API, so it is not guaranteed to be
 *  one of the union members. */
export const letterBrand = (company?: LetterCompany): LetterBrand =>
  BRANDS[company as LetterCompany] ?? BRANDS[DEFAULT_LETTER_COMPANY];

/** The entity picker's options, in the order they are offered. */
export const LETTER_COMPANY_OPTIONS: {
  value: LetterCompany;
  label: string;
  hint: string;
}[] = [
  {
    value: 'optiminastic',
    label: 'Optiminastic Infomedia',
    hint: 'The standard letterhead used today.',
  },
  {
    value: 'alt_opti',
    label: 'ALT OPTI MEDIA PRIVATE LIMITED',
    hint: `CIN ${ALT_OPTI_CIN} — Mumbai.`,
  },
];
