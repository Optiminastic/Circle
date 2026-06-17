import React from 'react';

/**
 * Circle brand mark — a continuous wave line. Stroke-based and monochrome, so it
 * inherits the surrounding text colour (use `text-*` to recolour). The mark is
 * square; `size` sets both width and height.
 */
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1080 1080"
      role="img"
      aria-label="Circle"
      fill="none"
      className={`text-gray-900 ${className}`}
    >
      <path
        d="m169.5 659.86c0 0 73.5-7.5 90 13.5 16.5 21 48 93 91.5 93 96.29 0 209.64-358.5 288-358.5 97.5-6 112.44 328.5 187.5 328.5 45 1.5 44.19-81 94.5-81 50.31 0 66-1.5 66-1.5"
        stroke="currentColor"
        strokeWidth={30}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m174.72 659.64c0 0 41.23 8.09 80.11-28.3 97.9-109.94 123.6-308.74 204.83-308.74 81.23 0 83.9 383.76 203.34 383.76 55.72-6.02 60-82.5 121.5-81 39 6 30.58 47.92 66 39 43.45-10.95 136.34-10.75 136.34-10.75"
        stroke="currentColor"
        strokeWidth={30}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Logo;
