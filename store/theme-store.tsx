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
  { id: 'sage', label: 'Sage', description: 'Green · calm', swatch: ['#a3cbb2', '#3d7f6f', '#285348'] },
  { id: 'sky', label: 'Sky', description: 'Blue · crisp', swatch: ['#69b8f7', '#166bc6', '#0d47a1'] },
  { id: 'latte', label: 'Latte', description: 'Cream · warm', swatch: ['#e7e0d9', '#9b703b', '#604624'] },
  { id: 'olive', label: 'Olive', description: 'Yellow-green · earthy', swatch: ['#dedd82', '#707128', '#434418'] },
  { id: 'lavender', label: 'Lavender', description: 'Purple · soft', swatch: ['#ddd1f7', '#2a0cde', '#160674'] },
];

const DEFAULT_PALETTE = 'sage';
const VALID_IDS = new Set(PALETTES.map(p => p.id));
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
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && VALID_IDS.has(stored) ? stored : DEFAULT_PALETTE;
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
