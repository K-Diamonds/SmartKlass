'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import {
  listDisputes,
  updateDisputeEvidence,
  type AdminDispute,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminDisputesPage() {
  const [rows, setRows] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<AdminDispute | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void listDisputes(100)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading disputes…" />;

  const open = rows.filter((r) => !r.closedAt);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Chargebacks"
        title="Disputes"
        description="Chargeback evidence workflow and assignment tracking."
        actions={
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
            {open.length} open
          </span>
        }
      />

      <AdminPanel noPadding>
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
          columns={[
            { key: 'date', header: 'Opened', render: (r) => formatAdminDate(r.createdAt) },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => formatAdminCents(r.amountCents, r.currency),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <StatusBadge label={r.status.replace(/_/g, ' ')} tone={payoutStatusTone(r.status)} />
              ),
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
              key: 'evidence',
              header: 'Evidence',
              render: (r) =>
                r.evidenceSubmittedAt ? (
                  <StatusBadge label="Submitted" tone="success" />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTarget(r);
                      setEvidenceNotes(r.evidenceNotes ?? '');
                    }}
                    className="text-xs text-[#d4a853] hover:underline"
                  >
                    Update
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
          title="Update dispute evidence"
          description="Chargeback evidence notes for Stripe representment."
          confirmLabel="Save evidence"
          riskImpact="Logged to audit trail; assignee set to current staff user."
          loading={actionLoading}
          extraFields={
            <textarea
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
              placeholder="Evidence summary, documents submitted, timeline…"
            />
          }
          onConfirm={async (reason) => {
            setActionLoading(true);
            try {
              await updateDisputeEvidence(target.id, {
                evidenceNotes,
                markSubmitted: true,
                reason,
              });
              setTarget(null);
              setRows(await listDisputes(100));
            } finally {
              setActionLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}
