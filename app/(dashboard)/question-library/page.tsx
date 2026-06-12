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
      <div className="overflow-hidden rounded-2xl border border-[#E4E6EA] bg-[#FFFFFF] shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E4E6EA] bg-[#F1F3F5] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                <th scope="col" className="px-4 py-2.5 font-semibold">Category</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Description</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEEF1]">
              {QUESTION_CATEGORIES.map(cat => {
                const Icon = cat.Icon;
                return (
                  <tr
                    key={cat.slug}
                    onClick={() => router.push(`/question-library/${cat.slug}`)}
                    className="cursor-pointer align-middle transition hover:bg-[#F1F3F5]"
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
