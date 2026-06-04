'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Opt {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

interface Coords {
  left: number;
  top: number;
  width: number;
  openUp: boolean;
}

const MENU_MAX_HEIGHT = 240;

/**
 * Drop-in themed replacement for a native <select>. Reads its <option> children
 * into a fully styled popover menu (so the open list follows the app theme) and
 * emits an `{ target: { value } }`-shaped event so existing
 * `onChange={(e) => ...e.target.value}` handlers keep working unchanged.
 *
 * The menu is rendered in a portal with fixed positioning so it is never clipped
 * by an `overflow-hidden`/scrolling ancestor (e.g. cards, modals).
 */
export function Select({
  value,
  onChange,
  children,
  className = '',
  disabled,
  id,
  placeholder,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const options: Opt[] = [];
  React.Children.toArray(children).forEach((child: any) => {
    if (child && child.type === 'option') {
      options.push({
        value: String(child.props.value ?? ''),
        label: child.props.children,
        disabled: child.props.disabled,
      });
    }
  });

  const current = String(value ?? '');
  const selected = options.find(o => o.value === current);
  const triggerLabel = selected ? selected.label : (placeholder ?? options[0]?.label ?? '');

  const updateCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 220) && r.top > spaceBelow;
    setCoords({ left: r.left, width: r.width, top: openUp ? r.top : r.bottom, openUp });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateCoords();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange?.({ target: { value: v } });
    setOpen(false);
  };

  return (
    <div className={`relative ${className.includes('w-full') ? 'w-full' : 'inline-block'}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`${className} flex items-center justify-between gap-2 text-left cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              left: coords.left,
              top: coords.top,
              minWidth: coords.width,
              maxHeight: MENU_MAX_HEIGHT,
              transform: coords.openUp ? 'translateY(-100%)' : undefined,
              marginTop: coords.openUp ? -4 : 4,
            }}
            className="z-[200] w-max max-w-[280px] overflow-y-auto bg-white border border-[#EAEAEC] rounded-lg shadow-lg py-1"
          >
            {options.map((o, i) => {
              const isSel = o.value === current;
              return (
                <button
                  key={`${o.value}-${i}`}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => !o.disabled && pick(o.value)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-3 transition ${
                    o.disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : isSel
                        ? 'bg-accent-50 text-accent-700 font-semibold'
                        : 'text-gray-700 hover:bg-[#F1F1F2] cursor-pointer'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <Check size={12} className="text-accent-600 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default Select;
