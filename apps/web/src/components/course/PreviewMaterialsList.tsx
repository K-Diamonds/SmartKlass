'use client';

import { cn } from '@/lib/utils';

type PreviewMaterialsListProps = {
  description: string;
  className?: string;
};

function toListItems(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function PreviewMaterialsList({ description, className }: PreviewMaterialsListProps) {
  const items = toListItems(description);

  if (items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    return (
      <p className={cn('whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground', className)}>
        {items[0]}
      </p>
    );
  }

  return (
    <ul className={cn('list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground', className)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function hasPreviewMaterialsDescription(description?: string | null): boolean {
  return Boolean(description?.trim());
}
