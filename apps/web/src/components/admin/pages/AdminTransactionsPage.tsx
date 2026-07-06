'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AdminListToolbar } from '@/components/admin/AdminListToolbar';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import {
  downloadCsv,
  rowsToCsv,
} from '@/components/admin/admin-list-utils';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import {
  flagTransaction,
  listTransactions,
  type AdminCreatorTransaction,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminTransactionsPage() {
  const [rows, setRows] = useState<AdminCreatorTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [flagTarget, setFlagTarget] = useState<AdminCreatorTransaction | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listTransactions({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(result.items);
      setTotalPages(result.meta.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    const csv = rowsToCsv(
      ['ID', 'Date', 'Creator', 'Course', 'Net', 'Status'],
      rows.map((r) => [
        r.id,
        r.createdAt,
        r.creatorProfile.displayName,
        r.course.title,
        r.creatorNetCents,
        r.status,
      ]),
    );
    downloadCsv('transactions.csv', csv);
  };

  if (loading && rows.length === 0) {
    return <LoadingState variant="page" label="Loading transactions…" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Ledger"
        title="Creator transactions"
        description="Platform ledger entries tied to payments, refunds, and payouts."
      />

      <AdminListToolbar
        search={search}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        status={status}
        onStatusChange={(value) => {
          setPage(1);
          setStatus(value);
        }}
        statusOptions={[
          { value: 'PENDING', label: 'Pending' },
          { value: 'AVAILABLE', label: 'Available' },
          { value: 'PAID_OUT', label: 'Paid out' },
          { value: 'REFUNDED', label: 'Refunded' },
        ]}
        from={from}
        to={to}
        onFromChange={(value) => {
          setPage(1);
          setFrom(value);
        }}
        onToChange={(value) => {
          setPage(1);
          setTo(value);
        }}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onExportCsv={exportCsv}
      />

      <AdminPanel noPadding>
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
          onRowClick={(r) => {
            window.location.href = `/admin/transactions/${r.id}`;
          }}
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (r) => (
                <span className="text-xs text-white/45">{formatAdminDate(r.createdAt)}</span>
              ),
            },
            {
              key: 'creator',
              header: 'Creator',
              render: (r) => (
                <Link
                  href={`/admin/creators/${r.creatorProfile.id}/risk`}
                  className="text-white hover:text-[#d4a853]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.creatorProfile.displayName}
                </Link>
              ),
            },
            {
              key: 'course',
              header: 'Course',
              render: (r) => r.course.title,
            },
            {
              key: 'net',
              header: 'Creator net',
              render: (r) => formatAdminCents(r.creatorNetCents, r.currency),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <StatusBadge label={r.status} tone={payoutStatusTone(r.status)} />
              ),
            },
            {
              key: 'flag',
              header: '',
              render: (r) =>
                r.adminFlaggedAt ? (
                  <StatusBadge label="Flagged" tone="warning" />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlagTarget(r);
                    }}
                    className="text-xs text-[#d4a853] hover:underline"
                  >
                    Flag
                  </button>
                ),
            },
          ]}
        />
      </AdminPanel>

      {flagTarget && (
        <AdminActionModal
          open
          onClose={() => setFlagTarget(null)}
          title="Flag transaction"
          description={`Flag ${flagTarget.id} for manual review.`}
          confirmLabel="Flag transaction"
          riskImpact="Creates risk event on creator profile; visible in audit logs."
          loading={actionLoading}
          extraFields={
            <div>
              <label className="text-xs text-white/45">Flag reason</label>
              <input
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
                placeholder="e.g. Unusual velocity, buyer dispute pattern"
              />
            </div>
          }
          onConfirm={async (reason) => {
            setActionLoading(true);
            try {
              await flagTransaction(flagTarget.id, flagReason || reason, reason);
              setFlagTarget(null);
              setFlagReason('');
              await load();
            } finally {
              setActionLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}
