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
  approveRefundRequest,
  denyRefundRequest,
  executeRefundRequest,
  listRefundRequests,
  type AdminRefundRequest,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminRefundsPage() {
  const [rows, setRows] = useState<AdminRefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState<{
    type: 'approve' | 'deny' | 'execute';
    target: AdminRefundRequest;
  } | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRefundRequests({
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

  const pendingApproval = rows.filter((r) => r.status === 'REQUESTED').length;
  const pendingExecution = rows.filter((r) => r.status === 'APPROVED').length;

  const exportCsv = () => {
    const csv = rowsToCsv(
      ['ID', 'Status', 'Amount', 'Payment', 'Requester', 'Created'],
      rows.map((r) => [
        r.id,
        r.status,
        r.amountCents,
        r.paymentId,
        r.requester.email,
        r.createdAt,
      ]),
    );
    downloadCsv('refund-requests.csv', csv);
  };

  if (loading && rows.length === 0) {
    return <LoadingState variant="page" label="Loading refund requests…" />;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Refund workflow"
        title="Refund requests"
        description="Request → approve → execute are separate steps. Approval does not call Stripe; execution does."
        actions={
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">
              {pendingApproval} awaiting approval
            </span>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-300">
              {pendingExecution} ready to execute
            </span>
          </div>
        }
      />

      <AdminListToolbar
        status={status}
        onStatusChange={(value) => {
          setPage(1);
          setStatus(value);
        }}
        statusOptions={[
          { value: 'REQUESTED', label: 'Requested' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'EXECUTED', label: 'Executed' },
          { value: 'DENIED', label: 'Denied' },
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
            { key: 'date', header: 'Requested', render: (r) => formatAdminDate(r.createdAt) },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => formatAdminCents(r.amountCents, r.currency),
            },
            {
              key: 'status',
              header: 'Workflow',
              render: (r) => (
                <StatusBadge label={r.status} tone={payoutStatusTone(r.status)} />
              ),
            },
            {
              key: 'reason',
              header: 'Reason',
              render: (r) => (
                <span className="max-w-[200px] truncate text-xs text-white/50">
                  {r.reason}
                </span>
              ),
            },
            {
              key: 'buyer',
              header: 'Buyer',
              render: (r) => r.payment.user.email,
            },
            {
              key: 'creator',
              header: 'Creator',
              render: (r) =>
                r.creatorTransaction ? (
                  <Link
                    href={`/admin/creators/${r.creatorTransaction.creatorProfile.id}/risk`}
                    className="hover:text-[#d4a853]"
                  >
                    {r.creatorTransaction.creatorProfile.displayName}
                  </Link>
                ) : (
                  '—'
                ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => (
                <div className="flex flex-wrap gap-2">
                  {r.status === 'REQUESTED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAction({ type: 'approve', target: r })}
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setAction({ type: 'deny', target: r })}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Deny
                      </button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => setAction({ type: 'execute', target: r })}
                      className="text-xs text-[#d4a853] hover:underline"
                    >
                      Execute Stripe refund
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </AdminPanel>

      {action && (
        <AdminActionModal
          open
          onClose={() => {
            setAction(null);
            setDenialReason('');
          }}
          title={
            action.type === 'approve'
              ? 'Approve refund request'
              : action.type === 'deny'
                ? 'Deny refund request'
                : 'Execute Stripe refund'
          }
          description={
            action.type === 'execute'
              ? 'This calls Stripe refunds.create. The request must already be APPROVED.'
              : action.type === 'approve'
                ? 'Records approval only — does not refund the buyer yet.'
                : 'Denies the request with a required denial reason.'
          }
          confirmLabel={
            action.type === 'approve'
              ? 'Approve'
              : action.type === 'deny'
                ? 'Deny request'
                : 'Execute refund'
          }
          riskImpact={
            action.type === 'execute'
              ? 'Irreversible Stripe refund; ledger updated via webhook sync.'
              : 'Logged to refund request audit trail.'
          }
          loading={actionLoading}
          extraFields={
            action.type === 'deny' ? (
              <div>
                <label className="text-xs text-white/45">Denial reason (required)</label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
                />
              </div>
            ) : undefined
          }
          onConfirm={async (reason) => {
            setActionLoading(true);
            try {
              if (action.type === 'approve') {
                await approveRefundRequest(action.target.id, reason);
              } else if (action.type === 'deny') {
                if (!denialReason.trim()) return;
                await denyRefundRequest(action.target.id, reason, denialReason);
              } else {
                await executeRefundRequest(action.target.id, reason);
              }
              setAction(null);
              setDenialReason('');
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
