import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AdminColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: AdminColumn<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  rows,
  keyFn,
  emptyMessage = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-white/40">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/8 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 font-semibold', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyFn(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-white/5 transition-colors last:border-0',
                onRowClick && 'cursor-pointer hover:bg-white/[0.03]',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3.5 text-white/80', col.className)}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
