'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { AdminAlertBanner, AdminOpsShortcuts } from '@/components/admin/AdminOpsShortcuts';
import { AuditTrailPanel } from '@/components/admin/AuditTrailPanel';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { MetricCard } from '@/components/admin/MetricCard';
import { StatusBadge, TrustLevelBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import {
  getAdminMetrics,
  getRecentPayments,
  getSuspiciousCreators,
  getTopCreators,
  listAuditLogs,
  listReconciliationReports,
  type AdminAuditLog,
  type AdminMetrics,
  type AdminPayment,
  type ReconciliationReport,
  type SuspiciousCreator,
  type TopCreator,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousCreator[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function load() {
    const [m, top, sus, pay, logs, recon] = await Promise.all([
      getAdminMetrics(),
      getTopCreators(8),
      getSuspiciousCreators(20),
      getRecentPayments(12),
      listAuditLogs(),
      listReconciliationReports(),
    ]);
    setMetrics(m);
    setTopCreators(top);
    setSuspicious(sus);
    setPayments(pay);
    setAuditLogs(logs.slice(0, 5));
    setReports(recon.slice(0, 3));
    setLastRefresh(new Date());
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <LoadingState variant="page" label="Loading marketplace metrics…" />;
  }

  const currency = metrics?.currency ?? 'USD';
  const highRisk = suspicious.filter((c) => c.trustLevel === 'HIGH_RISK');
  const suspended = suspicious.filter((c) => c.trustLevel === 'SUSPENDED');
  const latestReport = reports[0];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketplace command center"
        title="Operations overview"
        description="Live GMV, payout exposure, risk signals, and payment activity across the platform."
        actions={
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="hidden text-xs text-white/30 sm:inline">
                Updated {formatAdminDate(lastRefresh.toISOString())}
              </span>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/8 disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="space-y-3">
        <AdminAlertBanner
          title="open disputes need response"
          count={metrics?.openDisputes ?? 0}
          href="/admin/disputes"
          tone="warning"
        />
        <AdminAlertBanner
          title="failed payouts require follow-up"
          count={metrics?.failedPayouts ?? 0}
          href="/admin/payouts?status=FAILED"
          tone="danger"
        />
        <AdminAlertBanner
          title="suspended creators"
          count={suspended.length}
          href="/admin/creators"
          tone="danger"
        />
      </div>

      <section>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Revenue & volume
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Gross merchandise volume"
            value={formatAdminCents(metrics?.grossMerchandiseVolumeCents ?? 0, currency)}
          />
          <MetricCard
            label="Platform revenue"
            value={formatAdminCents(metrics?.platformRevenueCents ?? 0, currency)}
            tone="success"
          />
          <MetricCard
            label="Creator earnings"
            value={formatAdminCents(metrics?.creatorEarningsCents ?? 0, currency)}
          />
          <MetricCard
            label="Refunds (lifetime)"
            value={formatAdminCents(metrics?.refundsCents ?? 0, currency)}
            tone="danger"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Payout exposure
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Pending payouts"
            value={formatAdminCents(metrics?.pendingPayoutsCents ?? 0, currency)}
            tone="warning"
            hint="Held in ledger until availableAt"
          />
          <MetricCard
            label="Available payouts"
            value={formatAdminCents(metrics?.availablePayoutsCents ?? 0, currency)}
            tone="success"
            hint="Matured creator net, not yet paid out"
          />
          <MetricCard
            label="Open disputes"
            value={String(metrics?.openDisputes ?? 0)}
            tone={(metrics?.openDisputes ?? 0) > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            label="Failed payouts"
            value={String(metrics?.failedPayouts ?? 0)}
            tone={(metrics?.failedPayouts ?? 0) > 0 ? 'danger' : 'default'}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Risk posture
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="High-risk creators"
            value={String(highRisk.length)}
            tone={highRisk.length > 0 ? 'warning' : 'default'}
            hint="Extended payout holds · manual review"
          />
          <MetricCard
            label="Suspended creators"
            value={String(suspended.length)}
            tone={suspended.length > 0 ? 'danger' : 'default'}
            hint="Checkout blocked · payouts disabled"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Ops tooling
        </h2>
        <AdminOpsShortcuts />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="High-risk creators" description="45–60 day holds · manual review">
          <DataTable
            rows={highRisk}
            keyFn={(r) => r.creatorProfileId}
            emptyMessage="No high-risk creators."
            columns={[
              {
                key: 'name',
                header: 'Creator',
                render: (r) => (
                  <Link
                    href={`/admin/creators/${r.creatorProfileId}/risk`}
                    className="font-medium text-white hover:text-[#d4a853]"
                  >
                    {r.displayName}
                  </Link>
                ),
              },
              {
                key: 'hold',
                header: 'Hold',
                render: (r) => <span className="font-mono text-xs">{r.payoutDelayDays}d</span>,
              },
              {
                key: 'rates',
                header: 'Refund / dispute',
                render: (r) => (
                  <span className="font-mono text-xs text-white/55">
                    {(r.refundRate * 100).toFixed(1)}% / {(r.disputeRate * 100).toFixed(1)}%
                  </span>
                ),
              },
            ]}
          />
        </AdminPanel>

        <AdminPanel title="Suspended creators" description="Payouts and checkout disabled">
          <DataTable
            rows={suspended}
            keyFn={(r) => r.creatorProfileId}
            emptyMessage="No suspended creators."
            columns={[
              {
                key: 'name',
                header: 'Creator',
                render: (r) => (
                  <Link
                    href={`/admin/creators/${r.creatorProfileId}/risk`}
                    className="font-medium text-red-300 hover:text-[#d4a853]"
                  >
                    {r.displayName}
                  </Link>
                ),
              },
              {
                key: 'trust',
                header: 'Status',
                render: () => <TrustLevelBadge level="SUSPENDED" />,
              },
              {
                key: 'sales',
                header: 'Lifetime sales',
                render: (r) => formatAdminCents(r.lifetimeSalesCents, currency),
              },
            ]}
          />
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Top creators" description="By gross sales volume">
          <DataTable
            rows={topCreators}
            keyFn={(r) => r.creatorProfileId}
            columns={[
              {
                key: 'name',
                header: 'Creator',
                render: (r) => (
                  <Link
                    href={`/admin/creators/${r.creatorProfileId}/risk`}
                    className="font-medium text-white hover:text-[#d4a853]"
                  >
                    {r.displayName}
                  </Link>
                ),
              },
              {
                key: 'gmv',
                header: 'GMV',
                render: (r) => formatAdminCents(r.grossSalesCents, currency),
              },
              {
                key: 'trust',
                header: 'Trust',
                render: (r) => <TrustLevelBadge level={r.trustLevel} />,
              },
            ]}
          />
        </AdminPanel>

        <AdminPanel
          title="Reconciliation"
          description="Latest Stripe ↔ ledger reports"
          actions={
            <Link href="/admin/reconciliation" className="text-xs text-[#d4a853] hover:underline">
              All reports →
            </Link>
          }
        >
          {latestReport ? (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-white/8 bg-[#0e0e14] px-4 py-3"
                >
                  <div>
                    <p className="text-xs text-white/45">
                      {formatAdminDate(r.periodStart)} → {formatAdminDate(r.periodEnd)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-white/60">{r.id}</p>
                  </div>
                  <StatusBadge label={r.status} tone={payoutStatusTone(r.status)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-white/40">
              No reports yet.{' '}
              <Link href="/admin/reconciliation" className="text-[#d4a853] hover:underline">
                Run reconciliation
              </Link>
            </p>
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title="Recent payments"
        description="Latest charges across the marketplace"
        actions={
          <Link href="/admin/transactions" className="text-xs text-[#d4a853] hover:underline">
            All transactions →
          </Link>
        }
        noPadding
      >
        <DataTable
          rows={payments}
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
              key: 'course',
              header: 'Course',
              render: (r) =>
                r.creatorTransaction?.course.title ?? (
                  <span className="text-white/30">—</span>
                ),
            },
            {
              key: 'buyer',
              header: 'Buyer',
              render: (r) => (
                <span className="text-xs text-white/55">{r.user.email}</span>
              ),
            },
          ]}
        />
      </AdminPanel>

      <AdminPanel
        title="Recent staff actions"
        description="Audit trail — reason, before/after, IP"
        actions={
          <Link href="/admin/audit-logs" className="text-xs text-[#d4a853] hover:underline">
            Full audit log →
          </Link>
        }
      >
        <AuditTrailPanel logs={auditLogs} compact />
      </AdminPanel>
    </div>
  );
}
