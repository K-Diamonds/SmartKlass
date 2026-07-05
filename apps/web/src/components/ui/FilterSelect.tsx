'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const defaultSelectClassName =
  'w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-4 pr-11 text-sm text-foreground outline-none ring-ring focus:ring-2';

type FilterSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  selectClassName?: string;
  'aria-label'?: string;
};

export function FilterSelect({
  id,
  value,
  onChange,
  children,
  className,
  selectClassName,
  'aria-label': ariaLabel,
}: FilterSelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(defaultSelectClassName, selectClassName)}
        aria-label={ariaLabel}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
