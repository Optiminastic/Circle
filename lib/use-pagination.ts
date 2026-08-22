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
 * Page/page-size state for a table, derived from the total row count of an
 * already-filtered array. Resets to page 1 whenever the total or page size
 * changes, so a filter change or page-size change never leaves the view on
 * an out-of-range page.
 */
export function usePagination(totalItems: number, defaultPageSize = 15): Pagination {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [totalItems, pageSize]);

  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const end = start + pageSize;

  return { page: clampedPage, pageSize, setPage, setPageSize, start, end, totalPages };
}
