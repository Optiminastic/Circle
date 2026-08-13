'use client';

import React, { useState } from 'react';
import { Popover } from 'radix-ui';
import { Palette, Check, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePalette, PALETTES } from '@/store/theme-store';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';

const MODES: { id: 'light' | 'dark' | 'system'; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'System', Icon: Monitor },
];

/** Header dropdown: pick a color palette (recolors the whole app's accent-*
 *  scale) and light/dark/system mode — same trigger pattern as the
 *  notification bell (Popover), same surface styling as every other menu. */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const { palette, setPalette } = usePalette();
  const { theme, setTheme } = useTheme();
  const activePalette = PALETTES.find(p => p.id === palette) ?? PALETTES[0];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id="btn-theme-switcher"
        className={cn(
          'rounded-lg border border-[#E4E6EA] p-2 text-gray-500 transition hover:bg-accent hover:text-gray-700',
          ui.focusRing,
        )}
        aria-label="Theme"
        title="Theme"
      >
        <Palette size={14} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(ui.surface, ui.motion, 'z-50 w-80 p-0 text-xs')}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Theme
            </span>
            <span className="text-[11px] font-semibold text-accent-600">{activePalette.label}</span>
          </div>

          {/* Light / dark / system */}
          <div className="flex gap-1 border-b border-border p-2.5">
            {MODES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTheme(m.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition',
                  theme === m.id
                    ? 'border-accent-300 bg-accent-50 text-accent-700'
                    : 'border-transparent text-gray-500 hover:bg-accent hover:text-gray-700',
                )}
              >
                <m.Icon size={13} /> {m.label}
              </button>
            ))}
          </div>

          {/* Palette grid */}
          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto p-2.5">
            {PALETTES.map(p => {
              const selected = p.id === palette;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.id)}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition',
                    selected
                      ? 'border-accent-400 bg-accent-50/60 ring-1 ring-accent-400'
                      : 'border-border hover:border-accent-200 hover:bg-accent',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {p.swatch.map((c, i) => (
                        <span
                          key={i}
                          className="size-2 rounded-full"
                          style={{ backgroundColor: c }}
                          aria-hidden
                        />
                      ))}
                    </div>
                    {selected && <Check size={12} className="text-accent-600" />}
                  </div>
                  <div>
                    <p className="text-[11.5px] font-semibold text-gray-900">{p.label}</p>
                    <p className="font-mono text-[9.5px] text-gray-500">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default ThemeSwitcher;
