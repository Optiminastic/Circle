'use client';

import React, { useMemo, useState } from 'react';
import { Gauge, CheckCircle2, TrendingUp, User, ListChecks, Award, Wallet, ClipboardCheck } from 'lucide-react';
import { Employee } from '@/types';
import { Table, THead, Th, TBody, Tr, Td, TagPill, StatusPill, SelectionBar, useTableSelection } from '@/components/ui/table';
import { usePagination } from '@/lib/use-pagination';
import { Pagination } from '@/components/ui/pagination';

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
  if (pct >= 90) return { label: 'Exceeds', status: 'Increment eligible', bar: 'bg-green-500', dot: 'green' as const, tone: 'green' as const };
  if (pct >= 78) return { label: 'On Track', status: 'Meeting targets', bar: 'bg-accent-500', dot: 'accent' as const, tone: 'blue' as const };
  if (pct >= 65) return { label: 'Average', status: 'Monitor closely', bar: 'bg-amber-500', dot: 'amber' as const, tone: 'amber' as const };
  return { label: 'Below', status: 'Needs improvement', bar: 'bg-red-400', dot: 'red' as const, tone: 'red' as const };
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

  const ids = useMemo(() => rows.map(r => r.e.id), [rows]);
  const sel = useTableSelection(ids);
  const pg = usePagination(rows.length);

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-display flex items-center gap-2">
            <Gauge size={18} className="text-accent-600" />
            Task Performance
          </h2>
          <p className="text-gray-500 text-xs">
            Daily, weekly and monthly task completion per employee — the basis for performance grade and salary review.
          </p>
        </div>

        {/* Period toggle */}
        <div className="flex items-center bg-[#EDEEF1] rounded-md p-0.5 w-fit">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-[11px] font-semibold font-mono uppercase tracking-wider px-3 py-1 rounded cursor-pointer transition ${
                period === p.key ? 'bg-[#FFFFFF] text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Team completion ({period})</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-display">{avg}%</p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Increment eligible</p>
          <p className="text-2xl font-bold text-green-600 mt-1 font-display flex items-center gap-1.5">
            <TrendingUp size={18} /> {eligible}
          </p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E4E6EA] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Employees tracked</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-display">{rows.length}</p>
        </div>
      </div>

      {/* Table */}
      <SelectionBar count={sel.count} onClear={sel.clear} />
      <Table>
        <THead>
          <Th select checked={sel.allSelected} indeterminate={sel.someSelected} onToggle={sel.toggleAll} />
          <Th icon={<User size={11} />}>Employee</Th>
          <Th icon={<CheckCircle2 size={11} />}>Tasks done</Th>
          <Th icon={<ListChecks size={11} />} className="w-48">Completion</Th>
          <Th icon={<Award size={11} />}>Grade</Th>
          <Th icon={<Wallet size={11} />} align="right">Monthly salary</Th>
          <Th icon={<ClipboardCheck size={11} />}>Review status</Th>
        </THead>
        <TBody>
          {rows.slice(pg.start, pg.end).map(r => (
            <Tr key={r.e.id} selected={sel.isSelected(r.e.id)} onClick={() => sel.toggle(r.e.id)}>
              <Td select checked={sel.isSelected(r.e.id)} onToggle={() => sel.toggle(r.e.id)} />
              <Td>
                <p className="font-semibold text-gray-900">{r.e.fullName}</p>
                <p className="text-[10px] text-gray-500">{r.e.role} · {r.e.department}</p>
              </Td>
              <Td className="font-mono">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-gray-500" />
                  {r.completed}/{r.assigned}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EDEEF1]">
                    <div className={`h-full rounded-full ${r.g.bar}`} style={{ width: `${r.completionPct}%` }} />
                  </div>
                  <span className="w-9 text-right font-mono text-[11px] text-gray-600">{r.completionPct}%</span>
                </div>
              </Td>
              <Td>
                <TagPill color={r.g.dot}>{r.g.label}</TagPill>
              </Td>
              <Td align="right" className="font-mono font-semibold text-gray-800">{inr(r.salary)}</Td>
              <Td>
                <StatusPill tone={r.g.tone} label={r.g.status} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <Pagination
        totalItems={rows.length}
        pageSize={pg.pageSize}
        page={pg.page}
        onPageChange={pg.setPage}
        onPageSizeChange={pg.setPageSize}
        itemLabel="employees"
      />

      <p className="text-[10px] text-gray-500 font-mono">
        Task data shown is derived for demonstration — wire a real task/PMS feed to drive these numbers live.
      </p>
    </div>
  );
}

export default PerformanceTrackerView;
