'use client';

import React from 'react';
import { DropdownMenu } from 'radix-ui';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';

export interface ActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionItem[];
  className?: string;
}

/**
 * Reusable "three dots" (kebab) action menu, built on Radix DropdownMenu and the
 * shared style contract — the single menu implementation used across the app.
 */
export function ActionMenu({ items, className = '' }: ActionMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'rounded-sm p-1.5 text-gray-500 transition hover:bg-accent hover:text-gray-700 data-[state=open]:bg-accent data-[state=open]:text-gray-700',
          ui.focusRing,
          className,
        )}
        title="Actions"
        aria-label="Actions"
      >
        <MoreVertical size={15} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(ui.surface, ui.motion, 'z-[200] min-w-[168px] p-1')}
        >
          {items.map(item => (
            <DropdownMenu.Item
              key={item.key}
              disabled={item.disabled}
              onSelect={() => item.onClick()}
              className={cn(
                ui.item,
                'py-2 text-xs font-medium data-[disabled]:pointer-events-none data-[disabled]:text-gray-300',
                item.danger
                  ? 'text-gray-600 focus:bg-red-50 focus:text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-600'
                  : 'text-gray-700 focus:text-accent-600 data-[highlighted]:text-accent-600',
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default ActionMenu;
