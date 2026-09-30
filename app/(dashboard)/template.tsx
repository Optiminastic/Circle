'use client';

/**
 * A short entrance on every dashboard navigation.
 *
 * `template.tsx` rather than `layout.tsx` because Next remounts a template on
 * each route change, which is exactly what makes the animation re-run; a layout
 * persists and would play once.
 *
 * Kept deliberately small - 150ms, 4px - because this fires on every click in
 * the app. Anything longer starts to feel like latency rather than polish. The
 * global `prefers-reduced-motion` guard in globals.css removes it.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-150">{children}</div>;
}
