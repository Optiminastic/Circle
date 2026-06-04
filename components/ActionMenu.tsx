'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionItem[];
  className?: string;
}

const MENU_WIDTH = 168;

/**
 * Reusable "three dots" (kebab) action menu. The popover is rendered in a portal
 * with fixed positioning so it is never clipped by an `overflow-hidden` table or
 * card ancestor. Right-aligned to the trigger.
 */
export function ActionMenu({ items, className = '' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const estHeight = items.length * 34 + 8;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < estHeight && r.top > spaceBelow;
    setCoords({
      left: Math.max(8, r.right - MENU_WIDTH),
      top: openUp ? r.top : r.bottom,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updateCoords();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-[#F1F1F2] cursor-pointer transition ${open ? 'bg-[#F1F1F2] text-gray-700' : ''} ${className}`}
        title="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={15} />
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
              width: MENU_WIDTH,
              transform: coords.openUp ? 'translateY(-100%)' : undefined,
              marginTop: coords.openUp ? -6 : 6,
            }}
            className="z-[200] bg-white border border-[#EAEAEC] rounded-lg shadow-lg py-1"
            role="menu"
          >
            {items.map(item => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition cursor-pointer ${
                  item.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : item.danger
                      ? 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                      : 'text-gray-700 hover:bg-[#F1F1F2] hover:text-accent-600'
                }`}
                role="menuitem"
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate font-medium">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default ActionMenu;
