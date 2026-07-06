'use client';

import type { ReactNode } from 'react';

type AdminListToolbarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onExportCsv?: () => void;
  actions?: ReactNode;
};

export function AdminListToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions,
  from,
  to,
  onFromChange,
  onToChange,
  page,
  totalPages,
  onPageChange,
  onExportCsv,
  actions,
}: AdminListToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
        )}
        {statusOptions && onStatusChange && (
          <select
            value={status ?? ''}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {onFromChange && (
          <input
            type="date"
            value={from ?? ''}
            onChange={(e) => onFromChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
          />
        )}
        {onToChange && (
          <input
            type="date"
            value={to ?? ''}
            onChange={(e) => onToChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
          />
        )}
        {actions}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Export CSV
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded border border-white/10 px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
