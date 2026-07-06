'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import { listPayouts, type AdminPayout } from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminPayoutsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? undefined;
  const [rows, setRows] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(initialStatus);

  useEffect(() => {
    void listPayouts(100, filter)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <LoadingState variant="page" label="Loading payouts…" />;

  const failed = rows.filter((r) => r.status === 'FAILED');

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Connect payouts"
        title="Creator payouts"
        description="Stripe Connect payout sync — failed payouts need ops follow-up."
        actions={
          <div className="flex gap-2">
            {[
              { label: 'All', value: undefined },
              { label: 'Failed', value: 'FAILED' },
              { label: 'Paid', value: 'PAID' },
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setFilter(f.value);
                }}
                className={
                  filter === f.value
                    ? 'rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white'
                    : 'rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {failed.length > 0 && filter !== 'FAILED' && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {failed.length} failed payout(s) in recent history — filter by Failed to investigate.
        </p>
      )}

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
