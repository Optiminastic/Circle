'use client';

import React from 'react';
import { Building2, X } from 'lucide-react';
import type { LetterCompany } from '@/types';
import { LETTER_COMPANY_OPTIONS } from '@/lib/letter-company';

interface LetterCompanyPickerProps {
  /** Shown above the options, e.g. "Issue letter under which company?". */
  title?: string;
  /** Badged as the entity already used elsewhere for this candidate, so the
   *  offer and appointment letters don't end up issued by different entities. */
  suggested?: LetterCompany;
  /** Badge text for `suggested`, e.g. "On the offer letter". */
  suggestedNote?: string;
  onPick: (company: LetterCompany) => void;
  onClose: () => void;
}

/**
 * Asks which legal entity's letterhead a new letter should be issued under.
 * Shown once at creation — the choice is then fixed on the letter, so editing an
 * existing letter never reopens this.
 */
export function LetterCompanyPicker({
  title = 'Issue letter under which company?',
  suggested,
  suggestedNote = 'Already used',
  onPick,
  onClose,
}: LetterCompanyPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2.5">
          {LETTER_COMPANY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPick(opt.value)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition hover:border-accent-400 hover:bg-accent-50 ${
                suggested === opt.value ? 'border-accent-300 bg-accent-50/60' : 'border-[#E4E6EA]'
              }`}
            >
              <Building2 size={18} className="shrink-0 text-accent-600" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-gray-900">{opt.label}</p>
                <p className="text-[11px] text-gray-500">{opt.hint}</p>
              </div>
              {suggested === opt.value && (
                <span className="ml-auto shrink-0 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
                  {suggestedNote}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LetterCompanyPicker;
