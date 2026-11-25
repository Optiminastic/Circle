'use client';

/**
 * Phase-0 performance observability: Web Vitals + route-navigation timing.
 *
 * Uses Next.js's own `next/web-vitals` (bundles the `web-vitals` lib already
 * shipped inside Next.js — no new dependency added) and the browser's native
 * Performance API. Logs to the console only; no network calls, no PII, no
 * user/candidate data. Set NEXT_PUBLIC_PERF_LOG=0 to silence it.
 *
 * Route-navigation timing measures from the moment the user clicks an
 * internal link to the moment the new route's pathname commits. Programmatic
 * navigations with no preceding click (e.g. router.push() after a form
 * submit/redirect) are intentionally NOT logged with a fallback "dwell time"
 * number — that would silently measure how long the user sat on the previous
 * page, which is not navigation latency and would be actively misleading.
 *
 * See docs/PERFORMANCE_BASELINE.md for how these numbers were used, and
 * docs/PERFORMANCE_ROADMAP.md (Phase C2) for a proposed real backend sink if
 * this ever needs to be captured in aggregate rather than read from a
 * developer's own console.
 */

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

const ENABLED = process.env.NEXT_PUBLIC_PERF_LOG !== '0';

function logVital(name: string, value: number, id: string, rating?: string) {
  if (!ENABLED) return;
  // eslint-disable-next-line no-console
  console.debug(
    `[perf] web_vital name=${name} value=${value.toFixed(1)} rating=${rating ?? 'n/a'} id=${id}`,
  );
}

export function PerfReporter() {
  useReportWebVitals(metric => {
    logVital(metric.name, metric.value, metric.id, (metric as { rating?: string }).rating);
  });

  const pathname = usePathname();
  const clickStart = useRef<number | null>(null);
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!ENABLED) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('a[href^="/"]')) {
        clickStart.current = performance.now();
      }
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  useEffect(() => {
    if (prevPathname.current !== null && prevPathname.current !== pathname && clickStart.current !== null) {
      const durationMs = performance.now() - clickStart.current;
      if (ENABLED) {
        // eslint-disable-next-line no-console
        console.debug(
          `[perf] route_navigation from=${prevPathname.current} to=${pathname} duration_ms=${durationMs.toFixed(1)}`,
        );
      }
      clickStart.current = null;
    }
    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}

export default PerfReporter;
