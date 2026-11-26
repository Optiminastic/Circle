import { http } from '@/lib/http/client';

/** Params for the paginated list endpoint — mirrors circle-be's
 *  ResourceService.list_paginated exactly (page/limit/search/sortBy/sortOrder).
 *  See docs/PERFORMANCE_AUDIT.md P0-2. */
export interface PageParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  /** Exact-match filters, one query param per entry (e.g. `{department:
   *  'Engineering'}` -> `?department=Engineering`). The backend only honors
   *  fields on that resource's own allowlist
   *  (circle-be/app/domain/resource_search.py FILTERABLE_FIELDS) - anything
   *  else is silently ignored server-side, not a 400. */
  filters?: Record<string, string>;
}

/** Matches the backend's `{data, pagination}` envelope exactly — see
 *  circle-be/app/services/resource_service.py's `Page.to_dict()`. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PagedResult<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Generic Repository over a single API resource (Repository pattern, parity with
 * the backend). Domain code depends on these typed instances, never on raw HTTP.
 */
export class ResourceRepository<T> {
  constructor(private readonly slug: string) {}

  list(): Promise<T[]> {
    return http.get<T[]>(`/${this.slug}`);
  }

  /** Database-side pagination/search/sort — see docs/PERFORMANCE_AUDIT.md
   *  P0-2. Only resources the backend has actually wired up search/sort
   *  fields for (app/domain/resource_search.py) honor `search`/`sortBy`;
   *  every resource accepts `page`/`limit` and sorts by `createdAt` by
   *  default. Backward compatible with `list()` above: passing no `page` at
   *  all would fall back to the old bare-array shape server-side, but this
   *  method always passes `page` (defaulting to 1), so it always gets the
   *  `{data, pagination}` envelope. */
  listPaginated(params: PageParams = {}, signal?: AbortSignal): Promise<PagedResult<T>> {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    for (const [key, value] of Object.entries(params.filters ?? {})) {
      if (value) qs.set(key, value);
    }
    return http.get<PagedResult<T>>(`/${this.slug}?${qs.toString()}`, signal);
  }

  get(id: string): Promise<T> {
    return http.get<T>(`/${this.slug}/${id}`);
  }

  create(body: T): Promise<T> {
    return http.post<T>(`/${this.slug}`, body);
  }

  update(id: string, body: T): Promise<T> {
    return http.put<T>(`/${this.slug}/${id}`, body);
  }

  patch(id: string, changes: Partial<T>): Promise<T> {
    return http.patch<T>(`/${this.slug}/${id}`, changes);
  }

  remove(id: string): Promise<void> {
    return http.delete(`/${this.slug}/${id}`);
  }
}
