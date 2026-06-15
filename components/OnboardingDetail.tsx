'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { OnboardingChecklist } from '@/types';
import { OnboardingStepper } from './OnboardingStepper';
import { DocRequestPanel } from './DocRequestPanel';
import { useToast } from './Toaster';

interface OnboardingDetailProps {
  checklist: OnboardingChecklist;
  onToggleTask: (candidateName: string, taskId: string) => void;
  onAddEmployeeTrigger: (checklist: OnboardingChecklist) => void;
}

/** Full onboarding workspace for one candidate — progress, checklist, journey, docs. */
export function OnboardingDetail({
  checklist,
  onToggleTask,
  onAddEmployeeTrigger,
}: OnboardingDetailProps) {
  const toast = useToast();

  return (
    <div className="grid grid-cols-1 gap-5 text-xs md:grid-cols-3">
      {/* Progress card */}
      <div className="flex flex-col justify-between space-y-4 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5">
        <div className="space-y-1.5">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Candidate Progress
          </span>
          <h3 className="truncate font-display text-base font-bold text-gray-900">
            {checklist.candidateName}
          </h3>
          <p className="font-mono text-[11px] font-semibold text-accent-600">
            {checklist.onboardingStatus}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg bg-[#EDEEF1]/50 py-4">
          <div className="font-display text-3xl font-extrabold text-accent-600">
            {checklist.progressPercentage}%
          </div>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-gray-500">
            Actions Complete
          </span>
        </div>

        {checklist.progressPercentage === 100 ? (
          <button
            onClick={() => {
              onAddEmployeeTrigger(checklist);
              toast.success(`${checklist.candidateName} onboarded into the employee directory.`);
            }}
            className="w-full cursor-pointer rounded bg-accent-600 py-2 text-center font-semibold text-white transition hover:bg-accent-700"
          >
            Conclude Onboarding (EMP-ID)
          </button>
        ) : (
          <button
            disabled
            className="w-full cursor-not-allowed rounded bg-[#EDEEF1] py-2 text-center font-mono text-[10px] font-medium text-gray-500"
          >
            Clear all tasks to active EMP conversion
          </button>
        )}
      </div>

      {/* Checklist */}
      <div className="space-y-4 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 md:col-span-2">
        <div className="border-b border-[#EDEEF1] pb-2">
          <h4 className="font-bold text-gray-900">Pre-joining &amp; Induction Checklist Items</h4>
          <p className="text-[10px] text-gray-500">Click checkboxes to log finalized state:</p>
        </div>

        <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
          {checklist.tasks.map(t => (
            <div
              key={t.id}
              onClick={() => onToggleTask(checklist.candidateName, t.id)}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E4E6EA] p-2.5 transition hover:bg-[#EDEEF1]"
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                  t.isChecked
                    ? 'border-accent-600 bg-accent-600 text-white'
                    : 'border-gray-300 bg-[#FFFFFF]'
                }`}
              >
                {t.isChecked && <Check size={10} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${t.isChecked ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {t.title}
                </p>
                <span className="mt-0.5 block font-mono text-[9px] italic text-gray-500">
                  Category: {t.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Journey */}
      <OnboardingStepper checklist={checklist} />

      {/* Joining document collection + verification */}
      <DocRequestPanel candidateId={checklist.candidateId} candidateName={checklist.candidateName} />
    </div>
  );
}

export default OnboardingDetail;
