'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminListToolbar } from '@/components/admin/AdminListToolbar';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import {
  downloadCsv,
  rowsToCsv,
} from '@/components/admin/admin-list-utils';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import { listPayouts, type AdminPayout } from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminPayoutsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const [rows, setRows] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState(initialStatus);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPayouts({
        page,
        limit: 20,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(result.items);
      setTotalPages(result.meta.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const failed = rows.filter((r) => r.status === 'FAILED');

  const exportCsv = () => {
    const csv = rowsToCsv(
      ['ID', 'Creator', 'Amount', 'Status', 'Created', 'Paid at'],
      rows.map((r) => [
        r.id,
        r.creatorProfile.displayName,
        r.amountCents,
        r.status,
        r.createdAt,
        r.paidAt,
      ]),
    );
    downloadCsv('payouts.csv', csv);
  };

  if (loading && rows.length === 0) {
    return <LoadingState variant="page" label="Loading payouts…" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Connect payouts"
        title="Creator payouts"
        description="Stripe Connect payout sync — failed payouts need ops follow-up."
      />

      {failed.length > 0 && status !== 'FAILED' && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {failed.length} failed payout(s) on this page — filter by Failed to investigate.
        </p>
      )}

      <AdminListToolbar
        status={status}
        onStatusChange={(value) => {
          setPage(1);
          setStatus(value);
        }}
        statusOptions={[
          { value: 'PENDING', label: 'Pending' },
          { value: 'IN_TRANSIT', label: 'In transit' },
          { value: 'PAID', label: 'Paid' },
          { value: 'FAILED', label: 'Failed' },
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
          columns={[
            { key: 'date', header: 'Created', render: (r) => formatAdminDate(r.createdAt) },
            {
              key: 'creator',
              header: 'Creator',
              render: (r) => (
                <Link
                  href={`/admin/creators/${r.creatorProfile.id}/risk`}
                  className="hover:text-[#d4a853]"
                >
                  {r.creatorProfile.displayName}
                </Link>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => formatAdminCents(r.amountCents, r.currency),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <StatusBadge label={r.status} tone={payoutStatusTone(r.status)} />
              ),
            },
            {
              key: 'paid',
              header: 'Paid at',
              render: (r) => formatAdminDate(r.paidAt),
            },
            {
              key: 'fail',
              header: 'Failure',
              render: (r) => (
                <span className="text-xs text-red-300/80">{r.failureReason ?? '—'}</span>
              ),
            },
          ]}
        />
      </AdminPanel>
    </div>
  );
}
