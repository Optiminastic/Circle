import React from 'react';

/**
 * Curcle brand mark — a "C" formed by four indigo/cream ring segments (gap on the
 * right) around a soft gray center dot. Fixed brand colors (kept in step with
 * the app accent palette).
 */
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Curcle"
      className={className}
    >
      {/* ring segments (clockwise from the bottom of the right-side gap) */}
      <g fill="none" strokeWidth="8" strokeLinecap="butt">
        {/* bottom-right — darkest (midnight indigo) */}
        <path d="M36.29 32.60 A15 15 0 0 1 19.48 38.30" stroke="#11152A" />
        {/* bottom-left — midnight indigo */}
        <path d="M19.48 38.30 A15 15 0 0 1 9 24" stroke="#212842" />
        {/* upper-left — slate indigo */}
        <path d="M9 24 A15 15 0 0 1 19.48 9.70" stroke="#54648F" />
        {/* top-right — pale cream */}
        <path d="M19.48 9.70 A15 15 0 0 1 36.29 15.40" stroke="#F0E7D5" />
      </g>
      {/* center dot */}
      <circle cx="24" cy="24" r="5.5" fill="#D8DBDE" />
    </svg>
  );
}

export default Logo;
