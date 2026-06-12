'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { findCategory } from '@/lib/question-library';

/**
 * Detail scaffold for a single question bank. Header + design-matched table
 * shell with an empty state, ready to wire to real question data.
 */
export function QuestionCategoryDetail({ slug }: { slug: string }) {
  const cat = findCategory(slug);

  const back = (
    <Link
      href="/question-library"
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-accent-600"
    >
      <ArrowLeft size={13} /> Back to Question Library
    </Link>
  );

  if (!cat) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm font-semibold text-gray-700">Question category not found.</p>
      </div>
    );
  }

  const Icon = cat.Icon;

  return (
    <div className="space-y-5">
      {back}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <Icon size={18} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
              {cat.title}
            </h2>
            <p className="max-w-md text-[11px] text-gray-500">{cat.description}</p>
          </div>
        </div>
      </div>

      {/* Question table shell */}
      <div className="overflow-hidden rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E4E6EA] bg-[#F1F3F5] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                <th scope="col" className="px-4 py-2.5 font-semibold">#</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Question</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-gray-700">No questions yet</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    This question bank is empty — questions added here will appear in this list.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default QuestionCategoryDetail;
