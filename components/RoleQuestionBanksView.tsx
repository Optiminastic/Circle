'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, ChevronRight, Briefcase, Trash2 } from 'lucide-react';
import { useJobs } from '@/features/jobs/hooks';
import { useAssessmentBanks, useAssessmentBankMutations } from '@/features/question-banks/hooks';
import { useToast } from '@/components/Toaster';
import { findCategory } from '@/lib/question-library';
import { type BankCategory, type RoleQuestionBank } from '@/lib/question-banks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Every assessment/interview bank defaults to 20 questions. The count is NOT
// editable at role-creation time — HR adjusts it later from the bank's own page
// (top-right), which caps it at 100.
const DEFAULT_MAX = 20;

interface RoleQuestionBanksViewProps {
  category: BankCategory;
  /** URL slug for this category, e.g. "assessment-questions". */
  slug: string;
}

/**
 * Lists the role-specific question banks for a category (Assessment / Interview)
 * and lets HR create a new bank for a job posting (which role + how many
 * questions). Each row opens that role's IQ-style question editor.
 */
export function RoleQuestionBanksView({ category, slug }: RoleQuestionBanksViewProps) {
  const router = useRouter();
  const toast = useToast();
  const meta = findCategory(slug);
  const { data: jobs = [] } = useJobs();

  // Assessment banks now live in the backend (shared across devices), not
  // localStorage. (This view is only mounted for the assessment category.)
  const { data: banks = [], isSuccess } = useAssessmentBanks();
  const { create, remove } = useAssessmentBankMutations();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState('');

  // One-time import of any banks left in the old per-browser localStorage, then
  // drop the legacy key so nothing is read/written locally afterwards.
  const imported = useRef(false);
  useEffect(() => {
    if (imported.current || !isSuccess || banks.length > 0) return;
    imported.current = true;
    try {
      const raw = localStorage.getItem('curcle:assessment-banks');
      const legacy = raw ? (JSON.parse(raw) as RoleQuestionBank[]) : [];
      if (Array.isArray(legacy)) legacy.forEach(b => create.mutate(b));
      localStorage.removeItem('curcle:assessment-banks');
    } catch {
      /* ignore malformed legacy data */
    }
  }, [isSuccess, banks.length, create]);

  // Roles that don't yet have a bank in this category (no duplicates).
  const availableJobs = jobs.filter(j => !banks.some(b => b.jobId === j.id));

  const createBank = () => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      toast.error('Please select a role.');
      return;
    }
    const bank: RoleQuestionBank = {
      id: `BANK-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      department: job.department,
      // Fixed default of 20 — changed later from the bank page, not here.
      maxQuestions: DEFAULT_MAX,
      questions: [],
    };
    create.mutate(bank);
    setOpen(false);
    setJobId('');
    toast.success(`Created a question bank for ${job.title}.`);
    // Jump straight into the editor so HR can start adding questions.
    router.push(`/question-library/${slug}/${bank.id}`);
  };

  const deleteBank = (bank: RoleQuestionBank) => {
    toast.confirm({
      title: `Delete the ${bank.jobTitle} bank?`,
      description: `This removes all ${bank.questions.length} ${category} question(s) for this role. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        remove.mutate(bank.id);
        toast.success('Question bank deleted.');
      },
    });
  };

  const Icon = meta?.Icon ?? Briefcase;

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
            {meta?.title ?? 'Questions'}
          </h2>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Create for a role
        </Button>
      </div>

      {/* Banks table */}
      {banks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#D7DAE0] bg-[#FFFFFF] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-500">
            <Icon size={26} />
          </span>
          <p className="text-sm font-bold text-gray-700">No question banks yet</p>
          <p className="max-w-xs text-[11px] text-gray-500">
            Create a bank for a role to start adding its {category} questions.
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
                <tr className="border-b border-[#E4E6EA] bg-[#F1F3F5] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-2.5 text-center font-semibold">Questions</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEEF1]">
                {banks.map(bank => (
                  <tr
                    key={bank.id}
                    onClick={() => router.push(`/question-library/${slug}/${bank.id}`)}
                    className="cursor-pointer align-middle transition hover:bg-[#F1F3F5]"
                    title={`Edit ${bank.jobTitle} questions`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                          <Briefcase size={15} />
                        </span>
                        <div>
                          <div className="text-[13px] font-bold text-gray-900">{bank.jobTitle}</div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                            {bank.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[11px] font-semibold text-accent-700">
                      {bank.questions.length} / {bank.maxQuestions}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            deleteBank(bank);
                          }}
                          title="Delete this question bank"
                          aria-label="Delete question bank"
                          className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/question-library/${slug}/${bank.id}`)}
                          title="Edit this question bank"
                          aria-label="Edit question bank"
                          className="rounded-md p-1.5 text-gray-500 transition hover:bg-[#F1F3F5] hover:text-accent-600"
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

      {/* Create-bank modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Icon size={16} className="text-accent-600" /> New question bank
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Choose the role and how many questions this {category} set can hold.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-gray-600">Role</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a job posting" />
                </SelectTrigger>
                <SelectContent>
                  {availableJobs.length === 0 ? (
                    <div className="px-2 py-3 text-center text-[11px] text-gray-500">
                      {jobs.length === 0
                        ? 'No job postings found.'
                        : 'Every role already has a bank.'}
                    </div>
                  ) : (
                    availableJobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} · {job.department}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createBank} disabled={!jobId}>
              Create bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RoleQuestionBanksView;
