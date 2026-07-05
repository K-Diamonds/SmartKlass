'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export type SortableItem = {
  id: string;
};

type SortableListProps<T extends SortableItem> = {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, dragHandle: React.ReactNode) => React.ReactNode;
  className?: string;
};

function DragHandle({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex cursor-grab select-none items-center text-muted-foreground active:cursor-grabbing',
        className,
      )}
      aria-hidden
    >
      ⠿
    </span>
  );
}

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggingId || draggingId === targetId) {
        setDraggingId(null);
        setOverId(null);
        return;
      }

      const fromIndex = items.findIndex((item) => item.id === draggingId);
      const toIndex = items.findIndex((item) => item.id === targetId);

      if (fromIndex < 0 || toIndex < 0) {
        return;
      }

      const next = [...items];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder(next);
      setDraggingId(null);
      setOverId(null);
    },
    [draggingId, items, onReorder],
  );

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDraggingId(item.id)}
          onDragEnd={() => {
            setDraggingId(null);
            setOverId(null);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setOverId(item.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleDrop(item.id);
          }}
          className={cn(
            'rounded-xl border border-border-subtle bg-surface transition-all',
            draggingId === item.id && 'opacity-50',
            overId === item.id && draggingId !== item.id && 'border-accent ring-1 ring-accent/30',
          )}
        >
          {renderItem(item, index, <DragHandle />)}
        </div>
      ))}
    </div>
  );
}
