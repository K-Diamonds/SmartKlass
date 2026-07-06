'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import {
  listReconciliationReports,
  runReconciliation,
  type ReconciliationReport,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminReconciliationPage() {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [runOpen, setRunOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected] = useState<ReconciliationReport | null>(null);

  async function load() {
    setReports(await listReconciliationReports());
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading reports…" />;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stripe ↔ ledger"
        title="Reconciliation"
        description="Compare local payments and ledger totals against Stripe charges, fees, and payouts."
        actions={
          <button
            type="button"
            onClick={() => setRunOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#d4a853] px-4 py-2 text-sm font-medium text-[#0c0c0a]"
          >
            <Play size={14} />
            Run report
          </button>
        }
      />

      <AdminPanel noPadding>
        <DataTable
          rows={reports}
          keyFn={(r) => r.id}
          onRowClick={setSelected}
          columns={[
            {
              key: 'period',
              header: 'Period',
              render: (r) => (
                <span className="text-xs">
                  {formatAdminDate(r.periodStart)} → {formatAdminDate(r.periodEnd)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <StatusBadge label={r.status} tone={payoutStatusTone(r.status)} />
              ),
            },
            {
              key: 'local',
              header: 'Local balance',
              render: (r) =>
                r.localBalanceCents != null
                  ? formatAdminCents(r.localBalanceCents)
                  : '—',
            },
            {
              key: 'stripe',
              header: 'Stripe balance',
              render: (r) =>
                r.stripeBalanceCents != null
                  ? formatAdminCents(r.stripeBalanceCents)
                  : '—',
            },
            {
              key: 'issues',
              header: 'Discrepancies',
              render: (r) => {
                const count = r.discrepancies?.items?.length ?? 0;
                return count > 0 ? (
                  <StatusBadge label={`${count} issues`} tone="warning" />
                ) : (
                  <StatusBadge label="Clean" tone="success" />
                );
              },
            },
          ]}
        />
      </AdminPanel>

      {selected && (
        <AdminPanel title="Report detail">
          <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 font-mono text-xs text-white/60">
            {JSON.stringify(
              { summary: selected.summary, discrepancies: selected.discrepancies },
              null,
              2,
            )}
          </pre>
        </AdminPanel>
      )}

      <AdminActionModal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Run reconciliation"
        description="Queues async job comparing local records to Stripe for the current month."
        confirmLabel="Start reconciliation"
        riskImpact="Read-only Stripe API calls; results stored in ReconciliationReport."
        loading={actionLoading}
        onConfirm={async () => {
          setActionLoading(true);
          try {
            await runReconciliation(
              monthStart.toISOString(),
              now.toISOString(),
            );
            setRunOpen(false);
            await load();
          } finally {
            setActionLoading(false);
          }
        }}
      />
    </div>
  );
}
