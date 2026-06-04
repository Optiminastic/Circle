'use client';

import React, { useMemo, useState } from 'react';
import { Select } from './Select';
import { ScheduleType } from '../types';
import {
  X,
  CalendarClock,
  Phone,
  BrainCircuit,
  ClipboardList,
  Video,
  AlertTriangle,
  Check,
} from 'lucide-react';

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

const DURATION_MIN = 45;
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

  const { conflict, validDate, startMs } = useMemo(() => {
    const start = new Date(dt).getTime();
    if (isNaN(start)) return { conflict: null as BusySlot | null, validDate: false, startMs: 0 };
    const end = start + DURATION_MIN * 60_000;
    const hit = busySlots.find(b => start < b.end && end > b.start) ?? null;
    return { conflict: hit, validDate: true, startMs: start };
  }, [dt, busySlots]);

  const blocked = !validDate || !!conflict;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    onConfirm({
      type,
      dateTime: new Date(startMs).toISOString(),
      durationMin: DURATION_MIN,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/45 backdrop-blur-xs flex items-center justify-center z-[130] px-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl border border-[#E1D6BC] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E1D6BC]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center">
              <CalendarClock size={17} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Schedule next step</h3>
              <p className="text-[11px] text-gray-400">
                Shortlisting <span className="font-semibold text-gray-600">{candidateName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-600">What are you scheduling?</span>
            <div className="grid grid-cols-2 gap-2">
              {(['HR Call', 'IQ Test', 'Assessment', 'Interview'] as ScheduleType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-semibold transition cursor-pointer ${
                    type === t
                      ? 'border-accent-400 bg-accent-50 text-accent-700'
                      : 'border-[#E1D6BC] text-gray-600 hover:bg-[#F0E7D5]'
                  }`}
                >
                  {TYPE_META[t].icon}
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">{TYPE_META[type].hint}</p>
          </div>

          {/* Date & time */}
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-gray-600">Date & time ({DURATION_MIN} min)</span>
            <input
              type="datetime-local"
              value={dt}
              onChange={e => setDt(e.target.value)}
              className="w-full px-3 py-2 border border-[#E1D6BC] rounded-lg text-sm bg-[#F0E7D5] focus:bg-white focus:outline-none focus:border-accent-400 transition"
              required
            />
          </label>

          {/* Conflict guard */}
          {conflict ? (
            <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-100 text-red-600 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                That slot overlaps <span className="font-semibold">{conflict.label}</span>. Pick a
                different time — schedules can't overlap.
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
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-gray-600">Notes (optional)</span>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Agenda, panel, link…"
              className="w-full px-3 py-2 border border-[#E1D6BC] rounded-lg text-sm bg-[#F0E7D5] focus:bg-white focus:outline-none focus:border-accent-400 transition"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E1D6BC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E1D6BC] hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={blocked}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer font-semibold text-sm"
          >
            Shortlist & schedule
          </button>
        </div>
      </form>
    </div>
  );
}

export default ScheduleModal;
