'use client';

import { useEffect, useState } from 'react';

export interface Pagination {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  start: number;
  end: number;
  totalPages: number;
}

/**
 * Page/page-size math for a table, derived from the total row count of an
 * already-filtered array. Resets to page 1 whenever the total or page size
 * changes, so a filter change or page-size change never leaves the view on
 * an out-of-range page.
 *
 * Two ways to use it:
 *  - `usePagination(totalItems, defaultPageSize)` — owns its own state via
 *    `useState` (unchanged behavior, for views with no URL persistence).
 *  - `usePagination(totalItems, { page, pageSize, setPage, setPageSize })` —
 *    the page/pageSize state is owned by the caller (e.g. `useUrlState`);
 *    this just does the clamping/start/end math and calls the given setters,
 *    including the same reset-to-page-1 behavior.
 */
export function usePagination(
  totalItems: number,
  external: { page: number; pageSize: number; setPage: (page: number) => void; setPageSize: (size: number) => void },
): Pagination;
export function usePagination(totalItems: number, defaultPageSize?: number): Pagination;
export function usePagination(
  totalItems: number,
  arg2: number | { page: number; pageSize: number; setPage: (page: number) => void; setPageSize: (size: number) => void } = 15,
): Pagination {
  const isExternal = typeof arg2 === 'object';
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(isExternal ? 15 : arg2);

  const page = isExternal ? arg2.page : localPage;
  const pageSize = isExternal ? arg2.pageSize : localPageSize;
  const setPage = isExternal ? arg2.setPage : setLocalPage;
  const setPageSize = isExternal ? arg2.setPageSize : setLocalPageSize;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Only auto-reset the LOCAL (non-URL) mode here — external mode's owner
  // (useUrlState callers) resets the page itself as part of the same filter
  // update, avoiding a redundant/racing second state write.
  useEffect(() => {
    if (isExternal) return;
    setLocalPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, pageSize]);

  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const end = start + pageSize;

  return { page: clampedPage, pageSize, setPage, setPageSize, start, end, totalPages };
}
