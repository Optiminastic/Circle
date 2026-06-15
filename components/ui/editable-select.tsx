'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface EditableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** When provided, shows an inline "Add custom…" row; receives the new value. */
  onAdd?: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Dropdown that lists options with a check on the selected one and an optional
 * inline "Add custom…" affordance — so users can pick or create a value on the
 * spot. Values live in the org-settings store, not hardcoded.
 */
export function EditableSelect({
  value,
  onChange,
  options,
  onAdd,
  placeholder = 'Select…',
  id,
  className,
  disabled,
}: EditableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commitAdd = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd?.(v);
    onChange(v);
    setDraft('');
    setAdding(false);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) setAdding(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-secondary/50 px-3 text-sm text-gray-900 transition hover:border-accent-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !value && 'text-gray-400')}>{value || placeholder}</span>
          <ChevronsUpDown size={14} className="shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-1"
      >
        <div className="max-h-60 overflow-y-auto">
          {options.map(opt => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-[#F1F3F5]',
                  selected ? 'font-semibold text-accent-600' : 'text-gray-700',
                )}
              >
                <span className="truncate">{opt}</span>
                {selected && <Check size={14} className="shrink-0 text-accent-600" />}
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-gray-400">No options yet.</p>
          )}
        </div>

        {onAdd &&
          (adding ? (
            <div className="mt-1 flex items-center gap-1 border-t border-border pt-1">
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAdd();
                  } else if (e.key === 'Escape') {
                    setAdding(false);
                    setDraft('');
                  }
                }}
                placeholder="New value…"
                className="h-8 w-full rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              />
              <button
                type="button"
                onClick={commitAdd}
                className="h-8 shrink-0 rounded-md bg-accent-600 px-2.5 text-xs font-semibold text-white hover:bg-accent-700"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-1 flex w-full items-center gap-2 border-t border-border px-2.5 py-2 text-left text-sm font-medium text-accent-600 transition hover:bg-accent-50"
            >
              <Plus size={14} /> Add custom…
            </button>
          ))}
      </PopoverContent>
    </Popover>
  );
}
