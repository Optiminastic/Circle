'use client';

/**
 * Content-shaped skeleton shown while a page's queries are still fetching.
 * Prevents the "empty state flashes, then data pops in" effect and reads as
 * progress (like Google/LinkedIn skeleton screens) rather than a blank wait.
 * In practice it appears only on cold loads — the shell prefetches every
 * section after login, so most navigation renders instantly from cache.
 */
export function PageLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-4 w-56 bg-gray-200 rounded" />
        <div className="h-3 w-80 max-w-full bg-gray-100 rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E1D6BC] rounded-xl px-4 py-3 space-y-2">
            <div className="h-2.5 w-20 bg-gray-100 rounded" />
            <div className="h-6 w-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* List/table rows */}
      <div className="bg-white border border-[#E1D6BC] rounded-xl p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-200 rounded" style={{ width: `${70 - i * 6}%` }} />
              <div className="h-2.5 bg-gray-100 rounded" style={{ width: `${45 - i * 4}%` }} />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PageLoading;
