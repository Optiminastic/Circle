'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, ChevronRight, Briefcase, CalendarDays, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { findCategory } from '@/lib/question-library';
import { useInterviewBanks, useInterviewBankMutations } from '@/features/question-banks/hooks';
import {
  emptyInterviewModules,
  INTERVIEW_MODULES,
  type InterviewBank,
} from '@/lib/question-banks';
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
import { Label } from '@/components/ui/label';

const SLUG = 'interview-questions';

const totalQuestions = (b: InterviewBank) =>
  INTERVIEW_MODULES.reduce((n, m) => n + (b.modules[m]?.length ?? 0), 0);

/**
 * Lists the per-role interview question banks (5 competency modules each) and
 * lets HR create a new one by typing a role name. Each row opens that role's
 * module editor.
 */
export function InterviewBanksView() {
  const router = useRouter();
  const toast = useToast();
  const meta = findCategory(SLUG);

  // Interview sets live in the backend now (shared across devices), not localStorage.
  const { data: banks = [], isSuccess } = useInterviewBanks();
  const { create, remove } = useInterviewBankMutations();
  const [open, setOpen] = useState(false);
  const [roleName, setRoleName] = useState('');

  // One-time import of any sets left in the old per-browser localStorage.
  const imported = useRef(false);
  useEffect(() => {
    if (imported.current || !isSuccess || banks.length > 0) return;
    imported.current = true;
    try {
      const raw = localStorage.getItem('curcle:interview-modules');
      const legacy = raw ? (JSON.parse(raw) as Partial<InterviewBank>[]) : [];
      if (Array.isArray(legacy)) {
        legacy.forEach(b =>
          create.mutate({
            id: String(b.id ?? `IVB-${Date.now()}`),
            roleName: b.roleName ?? '',
            modules: { ...emptyInterviewModules(), ...(b.modules ?? {}) },
          }),
        );
      }
      localStorage.removeItem('curcle:interview-modules');
    } catch {
      /* ignore malformed legacy data */
    }
  }, [isSuccess, banks.length, create]);

  const createBank = () => {
    const name = roleName.trim();
    if (!name) {
      toast.error('Please enter a role name.');
      return;
    }
    if (banks.some(b => b.roleName.toLowerCase() === name.toLowerCase())) {
      toast.error('An interview set with that role name already exists.');
      return;
    }
    const bank: InterviewBank = {
      id: `IVB-${Date.now()}`,
      roleName: name,
      modules: emptyInterviewModules(),
    };
    create.mutate(bank);
    setOpen(false);
    setRoleName('');
    toast.success(`Created interview questions for ${name}.`);
    router.push(`/question-library/${SLUG}/${bank.id}`);
  };

  const deleteBank = (bank: InterviewBank) => {
    toast.confirm({
      title: `Delete the ${bank.roleName} interview set?`,
      description: 'This removes all module questions for this role. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        remove.mutate(bank.id);
        toast.success('Interview set deleted.');
      },
    });
  };

  const Icon = meta?.Icon ?? CalendarDays;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/question-library"
            aria-label="Back to Question Library"
            title="Back to Question Library"
            className="shrink-0 text-gray-500 transition hover:text-accent-600"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <Icon size={18} />
          </span>
          <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
            {meta?.title ?? 'Interview Questions'}
          </h2>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Create for a role
        </Button>
      </div>

      {/* Banks table */}
      {banks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#CFC8BA] bg-[#FFFFFF] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-500">
            <Icon size={26} />
          </span>
          <p className="text-sm font-bold text-gray-700">No interview sets yet</p>
          <p className="max-w-xs text-[11px] text-gray-500">
            Create a set for a role to add its competency-module questions.
          </p>
          <Button size="sm" onClick={() => setOpen(true)} className="mt-1">
            <Plus /> Create for a role
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E4E6EA] bg-[#EDEEF1] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-2.5 text-center font-semibold">Questions</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEEF1]">
                {banks.map(bank => (
                  <tr
                    key={bank.id}
                    onClick={() => router.push(`/question-library/${SLUG}/${bank.id}`)}
                    className="cursor-pointer align-middle transition hover:bg-[#EDEEF1]"
                    title={`Edit ${bank.roleName} interview questions`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                          <Briefcase size={15} />
                        </span>
                        <div className="text-[13px] font-bold text-gray-900">{bank.roleName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[11px] font-semibold text-accent-700">
                      {totalQuestions(bank)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            deleteBank(bank);
                          }}
                          title="Delete this interview set"
                          aria-label="Delete interview set"
                          className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/question-library/${SLUG}/${bank.id}`)}
                          title="Edit this interview set"
                          aria-label="Edit interview set"
                          className="rounded-md p-1.5 text-gray-500 transition hover:bg-[#EDEEF1] hover:text-accent-600"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create-bank modal — manual role name */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Icon size={16} className="text-accent-600" /> New interview set
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Enter a role name to create its competency-module interview questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1">
              <Label htmlFor="role-name" className="text-[11px] font-semibold text-gray-600">
                Role name
              </Label>
              <Input
                id="role-name"
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createBank();
                }}
                placeholder="e.g. Frontend Developer"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createBank} disabled={!roleName.trim()}>
              Create set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InterviewBanksView;
