'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useOrgSettings, type TaxonomyKind } from '@/store/org-settings';
import { useToast } from '@/components/Toaster';

interface ListEditorProps {
  title: string;
  description: string;
  kind: TaxonomyKind;
  values: string[];
  placeholder: string;
}

function ListEditor({ title, description, kind, values, placeholder }: ListEditorProps) {
  const { add, remove } = useOrgSettings();
  const toast = useToast();
  const [draft, setDraft] = useState('');

  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some(x => x.toLowerCase() === v.toLowerCase())) {
      toast.info(`"${v}" already exists.`);
      setDraft('');
      return;
    }
    add(kind, v);
    setDraft('');
    toast.success(`Added "${v}".`);
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-[#E4E6EA] bg-[#FFFFFF] p-4">
      <div>
        <h4 className="text-xs font-bold text-gray-900">{title}</h4>
        <p className="text-[11px] text-gray-500">{description}</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="h-9 flex-1 rounded-md border border-[#E4E6EA] bg-[#EDEEF1] px-2.5 text-xs focus:bg-[#FFFFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        />
        <button
          type="button"
          onClick={commit}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-accent-600 px-3 text-xs font-semibold text-white transition hover:bg-accent-700"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <p className="text-[11px] text-gray-400">Nothing added yet.</p>
        ) : (
          values.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-[#ECEDF0] bg-[#F1F3F5] py-0.5 pl-2.5 pr-1 text-[11px] font-medium text-gray-700"
            >
              {v}
              <button
                type="button"
                onClick={() => {
                  remove(kind, v);
                  toast.success(`Removed "${v}".`);
                }}
                aria-label={`Remove ${v}`}
                className="grid size-4 place-items-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <X size={11} />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Global-settings editor for the org taxonomy — roles, departments, and
 * application sources. Additions persist (localStorage) and flow into every
 * dropdown across the app via the org-settings store.
 */
export function TaxonomyManager() {
  const { roles, departments, sources } = useOrgSettings();

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-bold text-gray-850">Custom lists</h4>
        <p className="text-[11px] text-gray-500">
          Manage the roles, departments, and sources offered in dropdowns across the app. Changes
          apply everywhere immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ListEditor
          title="Roles / Designations"
          description="Applied roles for candidates and jobs."
          kind="roles"
          values={roles}
          placeholder="e.g. Backend Engineer"
        />
        <ListEditor
          title="Departments"
          description="Teams candidates and employees belong to."
          kind="departments"
          values={departments}
          placeholder="e.g. Marketing"
        />
        <ListEditor
          title="Application Sources"
          description="Where candidates come from."
          kind="sources"
          values={sources}
          placeholder="e.g. Naukri"
        />
      </div>
    </div>
  );
}

export default TaxonomyManager;
