'use client';

/**
 * Shared data-table primitives — one greige-themed look for every table in the app.
 *
 * Composition:
 *   <Table>
 *     <THead>
 *       <Th select … />              ← select-all checkbox cell
 *       <Th icon={<Mail/>}>Email</Th>
 *     </THead>
 *     <TBody>
 *       <Tr selected={…} onClick={…}>
 *         <Td select checked={…} onChange={…} />
 *         <Td>…</Td>
 *       </Tr>
 *     </TBody>
 *   </Table>
 *
 * Selection state is managed by useTableSelection(ids). Render <SelectionBar/>
 * above the table to surface bulk actions.
 */

import React from 'react';
import { Check, Minus, CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ selection */

export function useTableSelection(ids: string[]) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Drop ids that no longer exist (after a filter/delete) so the count stays honest.
  React.useEffect(() => {
    setSelected(prev => {
      if (prev.size === 0) return prev;
      const live = new Set(ids);
      let changed = false;
      const next = new Set<string>();
      prev.forEach(id => {
        if (live.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [ids]);

  const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
  const someSelected = !allSelected && ids.some(id => selected.has(id));

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(() => (allSelected ? new Set() : new Set(ids)));
  const clear = () => setSelected(new Set());
  const isSelected = (id: string) => selected.has(id);

  return {
    selected,
    selectedIds: [...selected],
    isSelected,
    toggle,
    toggleAll,
    allSelected,
    someSelected,
    clear,
    count: selected.size,
  };
}

/* ------------------------------------------------------------------ checkbox */

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  'aria-label'?: string;
  className?: string;
}

export function Checkbox({ checked, indeterminate, onChange, className, ...rest }: CheckboxProps) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={rest['aria-label']}
      onClick={e => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors',
        on
          ? 'border-accent-600 bg-accent-600 text-white'
          : 'border-line-strong bg-surface hover:border-accent-400',
        className,
      )}
    >
      {indeterminate ? <Minus size={11} strokeWidth={3} /> : checked ? <Check size={11} strokeWidth={3} /> : null}
    </button>
  );
}

/* ------------------------------------------------------------------ table shell */

export function Table({ children, className, minWidth }: { children: React.ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cn('overflow-x-auto rounded-md border border-line bg-surface shadow-2xs', className)}>
      <table className="w-full text-left text-xs" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className="sticky top-0 z-10">
      <tr className={cn('border-b border-line bg-surface-muted', className)}>{children}</tr>
    </thead>
  );
}

interface ThProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** Render as the select-all checkbox cell. */
  select?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  onToggle?: () => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Th({ children, icon, select, checked, indeterminate, onToggle, align = 'left', className }: ThProps) {
  if (select)
    return (
      <th className={cn('w-10 px-3 py-2', className)}>
        <Checkbox
          checked={!!checked}
          indeterminate={indeterminate}
          onChange={() => onToggle?.()}
          aria-label="Select all rows"
        />
      </th>
    );
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-gray-500',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          align === 'right' && 'flex-row-reverse',
          align === 'center' && 'justify-center',
        )}
      >
        {icon && <span className="text-gray-400">{icon}</span>}
        {children}
      </span>
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

interface TrProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Tr({ children, selected, onClick, className }: TrProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-line-hover transition-colors last:border-0',
        selected ? 'bg-accent-50/60' : 'hover:bg-surface-muted',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  );
}

interface TdProps {
  children?: React.ReactNode;
  /** Render as a per-row checkbox cell. */
  select?: boolean;
  checked?: boolean;
  onToggle?: () => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
  colSpan?: number;
}

export function Td({ children, select, checked, onToggle, align = 'left', className, colSpan }: TdProps) {
  if (select)
    return (
      <td className={cn('w-10 px-3 py-2', className)}>
        <Checkbox checked={!!checked} onChange={() => onToggle?.()} aria-label="Select row" />
      </td>
    );
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 py-2 align-middle text-[12px] text-gray-700 tabular-nums',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------------------------------------------ pills */

export type DotColor = 'green' | 'red' | 'blue' | 'amber' | 'pink' | 'purple' | 'gray' | 'accent';

const DOT: Record<DotColor, string> = {
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-400',
  accent: 'bg-accent-500',
};

/** Categorical value rendered as a chip with a leading colour dot. */
export function TagPill({ children, color = 'gray', className }: { children: React.ReactNode; color?: DotColor; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line-soft bg-surface-sunken px-2.5 py-0.5 text-[11px] font-medium text-gray-700',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT[color])} />
      {children}
    </span>
  );
}

/** ✓ / ✕ status pill. Pass active, or override with explicit tone/label. */
export function StatusPill({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  label,
  tone,
  icon,
  className,
}: {
  active?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  label?: string;
  tone?: 'green' | 'red' | 'amber' | 'gray' | 'blue';
  icon?: React.ReactNode;
  className?: string;
}) {
  const resolved: 'green' | 'red' | 'amber' | 'gray' | 'blue' = tone ?? (active ? 'green' : 'red');
  const text = label ?? (active ? activeLabel : inactiveLabel);
  const styles: Record<'green' | 'red' | 'amber' | 'gray' | 'blue', string> = {
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-surface-sunken text-gray-500',
    blue: 'bg-blue-50 text-blue-700',
  };
  const defaultIcon =
    resolved === 'green' ? <CheckCircle2 size={12} /> : resolved === 'red' ? <XCircle size={12} /> : null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        styles[resolved],
        className,
      )}
    >
      {icon ?? defaultIcon}
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ selection toolbar */

export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children?: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-xs">
      <span className="font-semibold text-accent-700">{count} selected</span>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-2 py-1 font-medium text-gray-600 transition hover:bg-surface-hover"
        >
          <X size={12} /> Clear
        </button>
      </div>
    </div>
  );
}
