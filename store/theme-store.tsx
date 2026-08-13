'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Color-theme (palette) state — separate from light/dark mode (handled by
 * next-themes). Switching a palette swaps the `accent-*` CSS custom
 * properties defined in globals.css via the `data-palette` attribute on
 * <html>, which every `bg-accent-*`/`text-accent-*`/`border-accent-*`
 * utility across the app already reads from — no per-component styling
 * needed to re-theme.
 */

export interface PaletteOption {
  id: string;
  label: string;
  description: string;
  /** Swatch preview colors, matching the CSS values in globals.css — used
   *  only for the picker UI's little dots, so the palette is recognizable
   *  before it's applied. */
  swatch: [string, string, string];
}

export const PALETTES: PaletteOption[] = [
  { id: 'raspberry', label: 'Raspberry', description: 'The original', swatch: ['#f181a7', '#d11453', '#7d0c33'] },
  { id: 'ocean', label: 'Ocean', description: 'Sky · azure', swatch: ['#7dd3fc', '#0284c7', '#075985'] },
  { id: 'sunset', label: 'Sunset', description: 'Amber · coral', swatch: ['#fdba74', '#ea580c', '#9a3412'] },
  { id: 'emerald', label: 'Emerald', description: 'Fresh · growth', swatch: ['#6ee7b7', '#059669', '#065f46'] },
  { id: 'indigo', label: 'Indigo', description: 'Royal · premium', swatch: ['#a5b4fc', '#4f46e5', '#3730a3'] },
  { id: 'amethyst', label: 'Amethyst', description: 'Violet · plum', swatch: ['#d8b4fe', '#9333ea', '#6b21a8'] },
  { id: 'slate', label: 'Slate', description: 'Neutral · corporate', swatch: ['#cbd5e1', '#475569', '#1e293b'] },
  { id: 'copper', label: 'Copper', description: 'Warm · earthy', swatch: ['#fcd34d', '#d97706', '#92400e'] },
];

const DEFAULT_PALETTE = 'raspberry';
const STORAGE_KEY = 'curcle-palette';

interface PaletteState {
  palette: string;
  setPalette: (id: string) => void;
}

const PaletteContext = createContext<PaletteState | null>(null);

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  // The blocking script in layout.tsx already set the attribute (and thus the
  // visible colors) before hydration — read the same source here so React's
  // state agrees with what's on screen instead of flashing back to default.
  const [palette, _setPalette] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_PALETTE;
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_PALETTE;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
  }, [palette]);

  const setPalette = (id: string) => {
    _setPalette(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  const value = useMemo<PaletteState>(() => ({ palette, setPalette }), [palette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette(): PaletteState {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within a PaletteProvider');
  return ctx;
}
