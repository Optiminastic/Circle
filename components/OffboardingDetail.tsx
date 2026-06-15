'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { OffboardingWorkflow } from '@/types';
import { DocumentsPanel } from './DocumentsPanel';
import { useToast } from './Toaster';

interface OffboardingDetailProps {
  workflow: OffboardingWorkflow;
  onToggleExitTask: (empId: string, taskId: string) => void;
  onToggleDeliverable: (empId: string, deliverableId: string) => void;
  onConfirmClearance: (empId: string) => void;
}

/** Full exit workflow for one employee — KT summary, clearances, deliverables, files. */
export function OffboardingDetail({
  workflow,
  onToggleExitTask,
  onToggleDeliverable,
  onConfirmClearance,
}: OffboardingDetailProps) {
  const toast = useToast();

  return (
    <div className="space-y-5 text-xs">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* KT & notice summary */}
        <div className="flex flex-col justify-between space-y-4 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5">
          <div className="space-y-2">
            <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              Resignation Triggered
            </span>
            <h3 className="mt-2 font-display text-base font-bold text-gray-900">
              {workflow.employeeName}
            </h3>
            <p className="text-gray-500">
              Notice end:{' '}
              <span className="font-mono font-bold text-gray-800">{workflow.lastWorkingDay}</span>
            </p>
            <div className="space-y-1.5 rounded-lg border border-[#E4E6EA] bg-[#EDEEF1] p-2.5 font-mono text-[10px]">
              <p className="text-[9px] font-bold uppercase text-gray-500">Knowledge Transfer Summary:</p>
              <p className="font-sans text-gray-700">{workflow.ktRecord?.currentProjects}</p>
              <div className="mt-2 flex justify-between border-t border-gray-150 py-1 font-bold">
                <span>KT Status:</span>
                <span className="text-accent-600">{workflow.ktRecord?.ktCompletionStatus}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onConfirmClearance(workflow.employeeId);
              toast.success(`Final settlement signed for ${workflow.employeeName}.`);
            }}
            className="w-full rounded bg-red-600 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Sign Final Settlement
          </button>
        </div>

        {/* Clearance checkpoints */}
        <div className="space-y-3 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5 md:col-span-2">
          <h4 className="border-b border-[#EDEEF1] pb-1.5 font-bold text-gray-900">
            Compliance Clearance Checkpoints
          </h4>
          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {workflow.checklist.map(t => (
              <div
                key={t.id}
                onClick={() => onToggleExitTask(workflow.employeeId, t.id)}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E4E6EA] p-2.5 transition hover:bg-[#F7F8FA]"
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                    t.isChecked ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-[#FFFFFF]'
                  }`}
                >
                  {t.isChecked && <Check size={10} />}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${t.isChecked ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                    {t.title}
                  </p>
                  <span className="mt-0.5 block font-mono text-[9px] text-gray-500">
                    Control: {t.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deliverables & handover */}
      <div className="space-y-3 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-5">
        <div className="flex items-center justify-between border-b border-[#EDEEF1] pb-1.5">
          <h4 className="font-bold text-gray-900">Exit Deliverables &amp; Handover</h4>
          <span className="font-mono text-[10px] text-gray-500">
            {(workflow.deliverables || []).filter(d => d.isSubmitted).length}/
            {(workflow.deliverables || []).length} submitted
          </span>
        </div>
        {(workflow.deliverables || []).length === 0 ? (
          <p className="py-3 text-center text-[11px] text-gray-500">
            No deliverables defined for this exit.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {(workflow.deliverables || []).map(d => (
              <div
                key={d.id}
                onClick={() => onToggleDeliverable(workflow.employeeId, d.id)}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E4E6EA] p-2.5 transition hover:bg-[#F7F8FA]"
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                    d.isSubmitted
                      ? 'border-accent-600 bg-accent-600 text-white'
                      : 'border-gray-300 bg-[#FFFFFF]'
                  }`}
                >
                  {d.isSubmitted && <Check size={10} />}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${d.isSubmitted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                    {d.title}
                  </p>
                  {d.owner && (
                    <span className="mt-0.5 block font-mono text-[9px] text-gray-500">
                      Hand over to: {d.owner}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Handover files (Backblaze) */}
      <DocumentsPanel
        entityType="offboarding"
        entityId={workflow.employeeId}
        category="deliverable"
        title="Deliverable Files (Handover Documents)"
      />
    </div>
  );
}

export default OffboardingDetail;
