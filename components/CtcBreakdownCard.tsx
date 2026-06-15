'use client';

import React, { useState } from 'react';
import { Pencil, Check, X, Wallet, AlertTriangle } from 'lucide-react';
import { CtcBreakdown, Employee } from '@/types';
import {
  parseAnnualCtc,
  defaultCtcBreakdown,
  computeCtc,
  ctcOverAllocated,
  fmtINR,
} from '@/lib/ctc';

interface CtcBreakdownCardProps {
  employee: Employee;
  onSave: (breakdown: CtcBreakdown) => void;
}

const cell = 'border border-[#D5D8DD] px-2.5 py-1.5';
const numCell = `${cell} text-right tabular-nums`;

/**
 * Salary-structure (CTC) breakdown shown on the employee profile. The CTC total
 * is locked to the employee's `annualCtc` (entered at creation) — editing the
 * components rebalances the Special Allowance so the total always matches.
 */
export function CtcBreakdownCard({ employee, onSave }: CtcBreakdownCardProps) {
  const annualCtc = parseAnnualCtc(employee.annualCtc);
  const stored = employee.ctcBreakdown;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CtcBreakdown | null>(null);

  // No CTC on file → nothing to break down.
  if (annualCtc == null) {
    return (
      <div className="rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-4">
        <h3 className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
          <Wallet size={12} className="text-accent-600" /> CTC Breakdown
        </h3>
        <p className="mt-2 text-[11px] text-gray-500">
          No annual CTC on file for {employee.fullName}. Add one to generate the salary structure.
        </p>
      </div>
    );
  }

  const base = stored ?? defaultCtcBreakdown(annualCtc);
  const active = editing && draft ? draft : base;
  const c = computeCtc(active, annualCtc);
  const over = editing && draft ? ctcOverAllocated(draft, annualCtc) : false;

  const startEdit = () => {
    setDraft(stored ?? defaultCtcBreakdown(annualCtc));
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setDraft(null);
  };
  const save = () => {
    if (!draft || over) return;
    onSave(draft);
    setEditing(false);
    setDraft(null);
  };
  const setField = (k: keyof CtcBreakdown, v: number) =>
    setDraft(d => (d ? { ...d, [k]: Math.max(0, Math.round(v) || 0) } : d));

  // Monthly input cell for an editable row; falls back to a formatted figure
  // when not editing.
  const editMonthly = (k: keyof CtcBreakdown) =>
    editing ? (
      <input
        type="number"
        min={0}
        value={String(draft?.[k] ?? 0)}
        onChange={e => setField(k, Number(e.target.value))}
        className="w-24 rounded border border-input bg-white px-1.5 py-0.5 text-right tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      />
    ) : (
      fmtINR(base[k])
    );

  // For editable rows the annual figure tracks the live monthly draft × 12.
  const editAnnual = (k: keyof CtcBreakdown) => fmtINR((draft?.[k] ?? base[k]) * 12);

  return (
    <div className="rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500">
          <Wallet size={12} className="text-accent-600" /> CTC Breakdown
        </h3>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={cancel}
              className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-[#F1F3F5]"
            >
              <X size={11} /> Cancel
            </button>
            <button
              onClick={save}
              disabled={over}
              className="inline-flex items-center gap-1 rounded-md bg-accent-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
            >
              <Check size={11} /> Save
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1 rounded-md border border-[#E4E6EA] bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-accent-400 hover:text-accent-700"
          >
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-[11px] text-gray-800">
          <thead>
            <tr className="bg-[#EDEEF1] font-bold text-gray-900">
              <th className={`${cell} text-left`}>Headings</th>
              <th className={`${cell} text-right`}>Monthly</th>
              <th className={`${cell} text-right`}>Annual</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cell}>Basic</td>
              <td className={numCell}>{editMonthly('basic')}</td>
              <td className={numCell}>{editing ? editAnnual('basic') : fmtINR(c.basic.annual)}</td>
            </tr>
            <tr>
              <td className={cell}>HRA</td>
              <td className={numCell}>{editMonthly('hra')}</td>
              <td className={numCell}>{editing ? editAnnual('hra') : fmtINR(c.hra.annual)}</td>
            </tr>
            <tr>
              <td className={cell}>
                Special Allowance{' '}
                <span className="font-normal text-gray-400">(balances to CTC)</span>
              </td>
              <td className={numCell}>{fmtINR(c.specialAllowance.monthly)}</td>
              <td className={numCell}>{fmtINR(c.specialAllowance.annual)}</td>
            </tr>
            <tr className="bg-[#DCDFE4] font-bold text-gray-900">
              <td className={cell}>Gross Salary</td>
              <td className={numCell}>{fmtINR(c.gross.monthly)}</td>
              <td className={numCell}>{fmtINR(c.gross.annual)}</td>
            </tr>
            <tr>
              <td className={cell}>PF</td>
              <td className={numCell}>{editMonthly('employerPf')}</td>
              <td className={numCell}>
                {editing ? editAnnual('employerPf') : fmtINR(c.employerPf.annual)}
              </td>
            </tr>
            <tr>
              <td className={cell} colSpan={3}>
                &nbsp;
              </td>
            </tr>
            <tr className="bg-[#DCDFE4] font-bold text-gray-900">
              <td className={cell}>CTC (Cost to the Company) A</td>
              <td className={numCell}>{fmtINR(c.ctc.monthly)}</td>
              <td className={numCell}>{fmtINR(c.ctc.annual)}</td>
            </tr>
            <tr>
              <td className={`${cell} font-bold uppercase`}>Less</td>
              <td className={cell}></td>
              <td className={cell}></td>
            </tr>
            <tr>
              <td className={cell}>PF</td>
              <td className={numCell}>{editMonthly('employeePf')}</td>
              <td className={numCell}>
                {editing ? editAnnual('employeePf') : fmtINR(c.employeePf.annual)}
              </td>
            </tr>
            <tr>
              <td className={cell}>Professional Tax</td>
              <td className={numCell}>{editMonthly('professionalTax')}</td>
              <td className={numCell}>
                {editing ? editAnnual('professionalTax') : fmtINR(c.professionalTax.annual)}
              </td>
            </tr>
            <tr className="font-bold text-gray-900">
              <td className={cell}>Total Deduction</td>
              <td className={numCell}>{fmtINR(c.totalDeduction.monthly)}</td>
              <td className={numCell}>{fmtINR(c.totalDeduction.annual)}</td>
            </tr>
            <tr className="bg-[#E7B5B5] font-bold text-gray-900">
              <td className={cell}>Gross Salary − Total Deduction = Net Take Home</td>
              <td className={numCell}>{fmtINR(c.netTakeHome.monthly)}</td>
              <td className={numCell}>{fmtINR(c.netTakeHome.annual)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {over && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
          <AlertTriangle size={12} /> Basic + HRA + PF exceed the annual CTC of{' '}
          {fmtINR(annualCtc)}. Reduce them so the Special Allowance stays positive.
        </p>
      )}
      {!editing && (
        <p className="mt-2 text-[10px] text-gray-400">
          CTC locked to the employee&apos;s annual CTC ({fmtINR(annualCtc)}). Editing rebalances the
          Special Allowance.
        </p>
      )}
    </div>
  );
}

export default CtcBreakdownCard;
