'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const triggerCls =
  'flex h-9 w-full items-center gap-2 rounded-md border border-border bg-white px-3 text-xs text-gray-900 transition hover:border-accent-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50';

/** Parse a `yyyy-MM-dd` string into a local Date (no timezone drift). */
function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

interface DatePickerProps {
  /** Value as `yyyy-MM-dd` (drop-in for <input type="date">). */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Earliest selectable day, as `yyyy-MM-dd`. */
  min?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/** Calendar-popover replacement for a native date input. */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  min,
  id,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDate(value);
  const minDate = parseDate(min);

  // Navigable range: 100 years back (covers date-of-birth) to 10 years ahead.
  // Combined with the month/year dropdowns this lets HR jump across any month
  // or year instead of stepping one month at a time.
  const thisYear = new Date().getFullYear();
  const startMonth = new Date(thisYear - 100, 0);
  const endMonth = new Date(thisYear + 10, 11);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" disabled={disabled} className={cn(triggerCls, className)}>
          <CalendarIcon size={14} className="shrink-0 text-gray-500" />
          <span className={cn('flex-1 text-left', !selected && 'text-gray-400')}>
            {selected ? format(selected, 'PP') : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          selected={selected}
          defaultMonth={selected}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={d => {
            onChange(d ? format(d, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Generate `HH:mm` options at a given minute step. */
function timeOptions(step = 30, extra?: string): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${hh}:${mm}`);
  }
  // Keep an existing off-grid value selectable (e.g. 10:45).
  if (extra && !out.includes(extra)) {
    out.push(extra);
    out.sort();
  }
  return out;
}

/** Format `HH:mm` as a friendly 12-hour label. */
function timeLabel(hhmm: string): string {
  const d = parse(hhmm, 'HH:mm', new Date());
  return isValid(d) ? format(d, 'h:mm a') : hhmm;
}

interface TimeSelectProps {
  /** Value as `HH:mm`. */
  value?: string;
  onChange: (value: string) => void;
  step?: number;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/** Select-based replacement for a native time input. */
export function TimeSelect({ value, onChange, step = 30, id, disabled, className }: TimeSelectProps) {
  const options = React.useMemo(() => timeOptions(step, value), [step, value]);
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn('h-9 text-xs', className)}>
        <span className="flex items-center gap-2">
          <Clock size={14} className="shrink-0 text-gray-500" />
          <SelectValue placeholder="Pick a time" />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {options.map(t => (
          <SelectItem key={t} value={t} className="text-xs">
            {timeLabel(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface DateTimePickerProps {
  /** Value as `yyyy-MM-ddTHH:mm` (drop-in for <input type="datetime-local">). */
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  step?: number;
  disabled?: boolean;
  className?: string;
}

/** Combined date + time picker replacing a native datetime-local input. */
export function DateTimePicker({
  value,
  onChange,
  min,
  step = 30,
  disabled,
  className,
}: DateTimePickerProps) {
  const [datePart = '', timePart = ''] = (value ?? '').split('T');
  const minDate = min ? min.split('T')[0] : undefined;

  const emit = (date: string, time: string) => {
    if (!date) return onChange('');
    onChange(`${date}T${time || '09:00'}`);
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
      <DatePicker
        value={datePart}
        min={minDate}
        disabled={disabled}
        onChange={d => emit(d, timePart)}
        className="sm:flex-1"
      />
      <TimeSelect
        value={timePart}
        step={step}
        disabled={disabled}
        onChange={t => emit(datePart, t)}
        className="sm:w-36"
      />
    </div>
  );
}
