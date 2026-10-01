/**
 * The authorised signature that appears on letters Optiminastic issues.
 *
 * One definition, because it was previously a const in the appointment letter
 * and absent from the offer letter entirely - which is how the two came to
 * disagree about who signs.
 */

/** Public path of the signature image. */
export const SIGNATURE_IMG = '/signature-sakshi-sawant.png';

/**
 * Placed in a letter's body where the signature image should be drawn.
 *
 * The offer letter's wording is editable by HR and stored as text, so the image
 * cannot simply be appended - it has to sit at a known point inside the body.
 * This follows `CTC_TABLE_MARKER`: a line the renderer swaps for real content.
 *
 * A letter saved before this existed has no marker and simply renders without
 * the image, exactly as it did when it was signed.
 */
export const SIGNATURE_MARKER = '[[SIGNATURE]]';

/** Rendered height in the letter, in px. Matches both letter layouts. */
export const SIGNATURE_HEIGHT = 56;
