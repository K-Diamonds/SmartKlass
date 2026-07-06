'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import { approveRefund, listRefunds, type AdminRefund } from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminRefundsPage() {
  const [rows, setRows] = useState<AdminRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<AdminRefund | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void listRefunds(100)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading refunds…" />;

  const pendingReview = rows.filter((r) => !r.adminApprovedAt);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Manual review"
        title="Refunds"
        description="Stripe refunds with staff approval workflow. Approval does not re-process Stripe."
        actions={
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
            {pendingReview.length} pending review
          </span>
        }
      />

      <AdminPanel noPadding>
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (r) => formatAdminDate(r.createdAt),
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => formatAdminCents(r.amountCents, r.currency),
            },
            {
              key: 'status',
              header: 'Stripe status',
              render: (r) => (
                <StatusBadge label={r.status} tone={payoutStatusTone(r.status)} />
              ),
            },
            {
              key: 'creator',
              header: 'Creator',
              render: (r) =>
                r.creatorTransaction ? (
                  <Link
                    href={`/admin/creators/${r.creatorTransaction.creatorProfile.id}/risk`}
                    className="text-white hover:text-[#d4a853]"
                  >
                    {r.creatorTransaction.creatorProfile.displayName}
                  </Link>
                ) : (
                  '—'
                ),
            },
            {
              key: 'review',
              header: 'Review',
              render: (r) =>
                r.adminApprovedAt ? (
                  <StatusBadge label="Approved" tone="success" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setTarget(r)}
                    className="text-xs text-[#d4a853] hover:underline"
                  >
                    Approve
                  </button>
                ),
            },
          ]}
        />
      </AdminPanel>

      {target && (
        <AdminActionModal
          open
          onClose={() => setTarget(null)}
          title="Approve refund review"
          description="Records manual staff approval in audit log."
          confirmLabel="Approve refund"
          riskImpact="Marks refund as reviewed; ledger already updated via Stripe webhook."
          before={{ adminApprovedAt: null }}
          after={{ adminApprovedAt: new Date().toISOString() }}
          loading={actionLoading}
          onConfirm={async (reason) => {
            setActionLoading(true);
            try {
              await approveRefund(target.id, reason);
              setTarget(null);
              setRows(await listRefunds(100));
            } finally {
              setActionLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}
