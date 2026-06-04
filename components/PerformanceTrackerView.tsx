'use client';

import React, { useMemo, useState } from 'react';
import { Gauge, CheckCircle2, TrendingUp } from 'lucide-react';
import { Employee } from '@/types';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const BASE_TASKS: Record<Period, number> = { daily: 8, weekly: 42, monthly: 168 };

// Deterministic pseudo-random from a string (stable across reloads; no real task feed yet).
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function taskMetrics(emp: Employee, period: Period) {
  const assigned = BASE_TASKS[period] + (hash(emp.id + period) % 6);
  const completionPct = 62 + (hash(emp.id + period + 'c') % 39); // 62–100
  const completed = Math.round((assigned * completionPct) / 100);
  return { assigned, completed, completionPct };
}

function monthlySalary(emp: Employee): number {
  return 55000 + (hash(emp.id + 'sal') % 60) * 1500; // ~₹55k–₹145k
}

function grade(pct: number) {
  if (pct >= 90) return { label: 'Exceeds', cls: 'text-green-600 bg-green-50', status: 'Increment eligible', bar: 'bg-green-500' };
  if (pct >= 78) return { label: 'On Track', cls: 'text-accent-700 bg-accent-50', status: 'Meeting targets', bar: 'bg-accent-500' };
  if (pct >= 65) return { label: 'Average', cls: 'text-amber-600 bg-amber-50', status: 'Monitor closely', bar: 'bg-amber-500' };
  return { label: 'Below', cls: 'text-red-500 bg-red-50', status: 'Needs improvement', bar: 'bg-red-400' };
}

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

export function PerformanceTrackerView({ employees }: { employees: Employee[] }) {
  const [period, setPeriod] = useState<Period>('daily');
  const active = useMemo(() => employees.filter(e => e.status !== 'Offboarded'), [employees]);

  const rows = useMemo(
    () =>
      active
        .map(e => {
          const m = taskMetrics(e, period);
          return { e, ...m, g: grade(m.completionPct), salary: monthlySalary(e) };
        })
        .sort((a, b) => b.completionPct - a.completionPct),
    [active, period],
  );

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.completionPct, 0) / rows.length) : 0;
  const eligible = rows.filter(r => r.completionPct >= 90).length;

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-display flex items-center gap-2">
            <Gauge size={18} className="text-accent-600" />
            Task Performance
          </h2>
          <p className="text-gray-400 text-xs">
            Daily, weekly and monthly task completion per employee — the basis for performance grade and salary review.
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex items-center bg-[#EAE1CC] rounded-md p-0.5 w-fit">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-[11px] font-semibold font-mono uppercase tracking-wider px-3 py-1 rounded cursor-pointer transition ${
                period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Team completion ({period})</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-display">{avg}%</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Increment eligible</p>
          <p className="text-2xl font-bold text-green-600 mt-1 font-display flex items-center gap-1.5">
            <TrendingUp size={18} /> {eligible}
          </p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Employees tracked</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-display">{rows.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#E1D6BC] text-[10px] font-mono uppercase tracking-wider text-gray-400">
              <th className="text-left font-semibold px-4 py-2.5">Employee</th>
              <th className="text-left font-semibold px-4 py-2.5">Tasks done</th>
              <th className="text-left font-semibold px-4 py-2.5 w-48">Completion</th>
              <th className="text-left font-semibold px-4 py-2.5">Grade</th>
              <th className="text-right font-semibold px-4 py-2.5">Monthly salary</th>
              <th className="text-left font-semibold px-4 py-2.5">Review status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.e.id} className="border-b border-[#EAE1CC] last:border-0 hover:bg-[#EAE1CC]/50 transition">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{r.e.fullName}</p>
                  <p className="text-[10px] text-gray-400">{r.e.role} · {r.e.department}</p>
                </td>
                <td className="px-4 py-3 font-mono text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-gray-400" />
                    {r.completed}/{r.assigned}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.g.bar}`} style={{ width: `${r.completionPct}%` }} />
                    </div>
                    <span className="font-mono text-[11px] text-gray-600 w-9 text-right">{r.completionPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${r.g.cls}`}>{r.g.label}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">{inr(r.salary)}</td>
                <td className="px-4 py-3 text-gray-500">{r.g.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 font-mono">
        Task data shown is derived for demonstration — wire a real task/PMS feed to drive these numbers live.
      </p>
    </div>
  );
}

export default PerformanceTrackerView;
