'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
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
  const [flagTarget, setFlagTarget] = useState<AdminCreatorTransaction | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void listTransactions(100)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading transactions…" />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Ledger"
        title="Creator transactions"
        description="Platform ledger entries tied to payments, refunds, and payouts."
      />

      <AdminPanel noPadding>
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
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
                    onClick={() => setFlagTarget(r)}
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
              setRows(await listTransactions(100));
            } finally {
              setActionLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}
