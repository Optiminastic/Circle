'use client';

import { useRouter } from 'next/navigation';
import { Library, ChevronRight } from 'lucide-react';
import { QUESTION_CATEGORIES } from '@/lib/question-library';

export default function QuestionLibraryPage() {
  const router = useRouter();

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <Library size={18} />
        </span>
        <h2 className="font-display text-base font-bold tracking-tight text-gray-900">
          Question Library
        </h2>
      </div>

      {/* Category table — one row per question bank */}
      <div className="overflow-hidden rounded-2xl border border-[#DAD4C8] bg-[#F7F4EE] shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#DAD4C8] bg-[#ECE8E0] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                <th scope="col" className="px-4 py-2.5 font-semibold">Category</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Description</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1D8]">
              {QUESTION_CATEGORIES.map(cat => {
                const Icon = cat.Icon;
                return (
                  <tr
                    key={cat.slug}
                    onClick={() => router.push(`/question-library/${cat.slug}`)}
                    className="cursor-pointer align-middle transition hover:bg-[#ECE8E0]"
                    title={`Open ${cat.title}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                          <Icon size={16} />
                        </span>
                        <div>
                          <div className="text-[13px] font-bold text-gray-900">{cat.title}</div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                            {cat.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-3 text-[11px] text-gray-600">
                      {cat.description}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
