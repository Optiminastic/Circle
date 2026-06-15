'use client';

import React from 'react';

/**
 * Animated brand mark for loading states. It's the same single-line logo as
 * <Logo>, but the stroke draws itself in and wipes away on a seamless loop
 * (see `.logo-loader-path` / `@keyframes logo-draw` in globals.css). A faint
 * full-path "track" sits underneath so the mark is always legible.
 *
 * Colour is inherited (defaults to the brand accent) — use `text-*` to recolour.
 */
const ASPECT = 206 / 112; // viewBox width / height
const PATH =
  'M12 74 C24 74 27 82 38 79 C50 76 49 30 66 28 C84 26 82 86 100 84 C116 82 115 44 131 46 C144 48 147 66 157 66 C165 66 168 57 161 55 C155 53 156 66 166 67 C174 68 181 67 188 66';

export function LogoLoader({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={Math.round(size * ASPECT)}
      height={size}
      viewBox="0 0 206 112"
      role="status"
      aria-label="Loading"
      fill="none"
      className={`text-accent-600 ${className}`}
    >
      {/* Faint full-length track */}
      <path
        d={PATH}
        stroke="currentColor"
        strokeOpacity={0.12}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Animated self-drawing stroke */}
      <path
        d={PATH}
        pathLength={1}
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="logo-loader-path"
      />
      <text
        x="190"
        y="50"
        fontSize="15"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        fill="currentColor"
        opacity="0.45"
      >
        ™
      </text>
    </svg>
  );
}

/**
 * Centered full-area loading screen built around <LogoLoader>. Fills its parent
 * (use inside an element that has a height) and shows an optional label.
 */
export function BrandLoading({
  label = 'Loading…',
  size = 56,
  className = '',
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-4 ${className}`}
      aria-busy="true"
    >
      <LogoLoader size={size} />
      {label && <span className="font-mono text-xs tracking-wide text-gray-500">{label}</span>}
    </div>
  );
}

export default LogoLoader;
