'use client';

import React, { useMemo, useState } from 'react';
import { ScheduleType } from '../types';
import {
  CalendarClock,
  Phone,
  BrainCircuit,
  ClipboardList,
  Video,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/date-picker';

export interface BusySlot {
  start: number; // ms
  end: number; // ms
  label: string;
}

interface ScheduleModalProps {
  candidateName: string;
  defaultType: ScheduleType;
  busySlots: BusySlot[];
  onConfirm: (data: { type: ScheduleType; dateTime: string; durationMin: number; notes: string }) => void;
  onClose: () => void;
}

/** Slot length per round type. HR calls are quick screening calls. */
const DURATIONS: Record<ScheduleType, number> = {
  'HR Call': 10,
  'IQ Test': 45,
  Assessment: 45,
  Interview: 45,
};
const pad = (n: number) => String(n).padStart(2, '0');

/** Default to tomorrow at 10:00 (local) in datetime-local format. */
function defaultSlot(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_META: Record<ScheduleType, { icon: React.ReactNode; hint: string }> = {
  'HR Call': { icon: <Phone size={13} />, hint: 'Introductory / screening call' },
  'IQ Test': { icon: <BrainCircuit size={13} />, hint: 'Timed aptitude / IQ test' },
  Assessment: { icon: <ClipboardList size={13} />, hint: 'Take-home assignment / case study' },
  Interview: { icon: <Video size={13} />, hint: 'Panel / technical interview' },
};

export function ScheduleModal({
  candidateName,
  defaultType,
  busySlots,
  onConfirm,
  onClose,
}: ScheduleModalProps) {
  const [type, setType] = useState<ScheduleType>(defaultType);
  const [dt, setDt] = useState<string>(defaultSlot);
  const [notes, setNotes] = useState('');

  const durationMin = DURATIONS[type];

  const { conflict, validDate, startMs } = useMemo(() => {
    const start = new Date(dt).getTime();
    if (isNaN(start)) return { conflict: null as BusySlot | null, validDate: false, startMs: 0 };
    const end = start + durationMin * 60_000;
    const hit = busySlots.find(b => start < b.end && end > b.start) ?? null;
    return { conflict: hit, validDate: true, startMs: start };
  }, [dt, busySlots, durationMin]);

  const blocked = !validDate || !!conflict;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    onConfirm({
      type,
      dateTime: new Date(startMs).toISOString(),
      durationMin,
      notes: notes.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <form onSubmit={submit}>
          <DialogHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-border px-5 py-4 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <CalendarClock size={17} />
            </span>
            <div>
              <DialogTitle className="text-sm font-bold text-gray-900">Schedule next step</DialogTitle>
              <DialogDescription className="text-[11px]">
                Shortlisting <span className="font-semibold text-gray-600">{candidateName}</span>
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-gray-600">
                What are you scheduling?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(['HR Call', 'IQ Test', 'Assessment', 'Interview'] as ScheduleType[]).map(t => (
                  <Button
                    key={t}
                    type="button"
                    variant={type === t ? 'default' : 'outline'}
                    onClick={() => setType(t)}
                    className={`h-auto flex-col gap-1 py-2.5 text-[11px] font-semibold ${
                      type === t ? '' : 'text-gray-600'
                    }`}
                  >
                    {TYPE_META[t].icon}
                    {t}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500">{TYPE_META[type].hint}</p>
            </div>

            {/* Date & time */}
            <div className="space-y-1">
              <Label htmlFor="schedule-dt" className="text-[11px] font-semibold text-gray-600">
                Date &amp; time ({durationMin} min)
              </Label>
              <DateTimePicker value={dt} onChange={setDt} step={15} />
            </div>

            {/* Conflict guard */}
            {conflict ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  That slot overlaps <span className="font-semibold">{conflict.label}</span>. Pick a
                  different time — schedules can&apos;t overlap.
                </span>
              </div>
            ) : (
              validDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                  <Check size={13} /> Slot is free.
                </div>
              )
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="schedule-notes" className="text-[11px] font-semibold text-gray-600">
                Notes (optional)
              </Label>
              <Textarea
                id="schedule-notes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Agenda, panel, link…"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={blocked}>
              Shortlist &amp; schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleModal;
