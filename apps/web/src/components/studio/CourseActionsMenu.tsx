'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CourseStatus } from '@/lib/studio/types';

export type CourseAction = 'save_draft' | 'publish' | 'archive';

type CourseActionsMenuProps = {
  status: CourseStatus;
  disabled?: boolean;
  isBusy?: boolean;
  onAction: (action: CourseAction) => void;
};

type MenuItem = {
  action: CourseAction;
  label: string;
  disabled: boolean;
  description?: string;
};

function menuItemsForStatus(status: CourseStatus): MenuItem[] {
  return [
    {
      action: 'save_draft',
      label: 'Save draft',
      disabled: false,
    },
    {
      action: 'publish',
      label: 'Publish course',
      disabled: status === 'PUBLISHED',
      description:
        status === 'ARCHIVED' ? 'Make the course available to new subscribers again.' : undefined,
    },
    {
      action: 'archive',
      label: 'Archive',
      disabled: status === 'ARCHIVED',
      description: status === 'PUBLISHED' ? 'Hide from new subscribers.' : undefined,
    },
  ];
}

export function CourseActionsMenu({
  status,
  disabled = false,
  isBusy = false,
  onAction,
}: CourseActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const items = menuItemsForStatus(status);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (action: CourseAction, itemDisabled: boolean) => {
    if (itemDisabled || disabled || isBusy) {
      return;
    }

    setOpen(false);
    onAction(action);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled || isBusy}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isBusy ? 'Updating…' : 'Actions'}
        <ChevronDown
          size={16}
          aria-hidden
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 min-w-[15rem] overflow-hidden rounded-xl border border-border-subtle bg-surface py-1 shadow-soft"
        >
          {items.map((item) => (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              disabled={item.disabled || disabled || isBusy}
              onClick={() => handleSelect(item.action, item.disabled)}
              className={cn(
                'flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition-colors',
                item.disabled || disabled || isBusy
                  ? 'cursor-not-allowed text-muted-foreground opacity-60'
                  : 'text-foreground hover:bg-border-subtle',
              )}
            >
              <span className="font-medium">{item.label}</span>
              {item.description && (
                <span className="mt-0.5 text-xs text-muted-foreground">{item.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
