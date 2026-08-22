'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select } from '@/components/Select';

const PAGE_SIZES = [10, 15, 25, 50, 100];

interface PaginationProps {
  totalItems: number;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Plural noun for the "Showing X to Y of N ___" summary (default "items"). */
  itemLabel?: string;
}

/** Page-size dropdown + first/prev/next/last controls + "Showing X to Y of N"
 *  summary — the shared footer for every paginated table in the app. */
export function Pagination({
  totalItems,
  pageSize,
  page,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
}: PaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);

  const btnCls =
    'grid size-7 place-items-center rounded-md border border-[#E4E6EA] bg-white text-gray-500 transition hover:bg-[#F1F3F5] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E6EA] px-1 py-3 text-[12px] text-gray-500">
      <span>
        Showing {start + 1} to {end} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span>Show</span>
          <Select
            value={String(pageSize)}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="h-7 w-[64px] rounded-md border border-[#E4E6EA] bg-white px-2 text-gray-700"
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
            className={btnCls}
          >
            <ChevronsLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={btnCls}
          >
            <ChevronLeft size={13} />
          </button>
          <span className="mx-1 whitespace-nowrap font-medium text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className={btnCls}
          >
            <ChevronRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
            className={btnCls}
          >
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
