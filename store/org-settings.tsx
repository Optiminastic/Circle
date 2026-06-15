'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Org-level taxonomy that HR can customise from Global Settings — roles,
 * departments, and application sources. Kept out of the code (no hardcoded
 * lists) and persisted to localStorage so additions survive reloads.
 */

export type TaxonomyKind = 'roles' | 'departments' | 'sources';

interface OrgTaxonomy {
  roles: string[];
  departments: string[];
  sources: string[];
}

interface OrgSettings extends OrgTaxonomy {
  /** Add a value to a list (no-op if blank or already present). */
  add: (kind: TaxonomyKind, value: string) => void;
  /** Remove a value from a list. */
  remove: (kind: TaxonomyKind, value: string) => void;
}

const DEFAULTS: OrgTaxonomy = {
  roles: [
    'Senior React Engineer',
    'Senior Product Manager',
    'Principal UX Architect',
    'VP of Platform Engineering',
    'HR Director',
  ],
  departments: ['Engineering', 'Product', 'Design', 'Sales', 'Human Resources'],
  sources: ['LinkedIn', 'Referral', 'Direct Application', 'Headhunted', 'Job Posting'],
};

const STORAGE_KEY = 'curcle.org-settings.v1';

const OrgSettingsContext = createContext<OrgSettings | null>(null);

export function OrgSettingsProvider({ children }: { children: React.ReactNode }) {
  const [taxonomy, setTaxonomy] = useState<OrgTaxonomy>(DEFAULTS);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<OrgTaxonomy>;
      setTaxonomy({
        roles: saved.roles?.length ? saved.roles : DEFAULTS.roles,
        departments: saved.departments?.length ? saved.departments : DEFAULTS.departments,
        sources: saved.sources?.length ? saved.sources : DEFAULTS.sources,
      });
    } catch {
      // Corrupt/blocked storage — fall back to defaults.
    }
  }, []);

  const add = useCallback(
    (kind: TaxonomyKind, value: string) => {
      const v = value.trim();
      if (!v) return;
      setTaxonomy(prev => {
        if (prev[kind].some(x => x.toLowerCase() === v.toLowerCase())) return prev;
        const next = { ...prev, [kind]: [...prev[kind], v] };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const remove = useCallback(
    (kind: TaxonomyKind, value: string) => {
      setTaxonomy(prev => {
        const next = { ...prev, [kind]: prev[kind].filter(x => x !== value) };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo<OrgSettings>(
    () => ({ ...taxonomy, add, remove }),
    [taxonomy, add, remove],
  );

  return <OrgSettingsContext.Provider value={value}>{children}</OrgSettingsContext.Provider>;
}

export function useOrgSettings(): OrgSettings {
  const ctx = useContext(OrgSettingsContext);
  if (!ctx) throw new Error('useOrgSettings must be used within an OrgSettingsProvider');
  return ctx;
}
