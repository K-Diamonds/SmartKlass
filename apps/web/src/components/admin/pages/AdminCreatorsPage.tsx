'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { TrustLevelBadge } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatPercent } from '@/components/admin/admin-utils';
import {
  getSuspiciousCreators,
  listCreators,
  type AdminCreator,
  type SuspiciousCreator,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminCreatorsPage() {
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'risk' | 'suspended'>('all');

  useEffect(() => {
    Promise.all([listCreators(100), getSuspiciousCreators(50)])
      .then(([c, s]) => {
        setCreators(c);
        setSuspicious(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading creators…" />;

  const suspiciousIds = new Set(suspicious.map((s) => s.creatorProfileId));

  const rows = creators.filter((c) => {
    if (filter === 'suspended') return c.riskProfile?.trustLevel === 'SUSPENDED';
    if (filter === 'risk') return suspiciousIds.has(c.id);
    return true;
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Creator risk"
        title="Creators"
        description="Trust tiers, payout policy, and manual review queue."
        actions={
          <div className="flex gap-2">
            {(['all', 'risk', 'suspended'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? 'rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white'
                    : 'rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white'
                }
              >
                {f === 'all' ? 'All' : f === 'risk' ? 'Flagged' : 'Suspended'}
              </button>
            ))}
          </div>
        }
      />

      <AdminPanel title={`${rows.length} creators`} noPadding>
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
          onRowClick={(r) => {
            window.location.href = `/admin/creators/${r.id}/risk`;
          }}
          columns={[
            {
              key: 'name',
              header: 'Creator',
              render: (r) => (
                <div>
                  <p className="font-medium text-white">{r.displayName}</p>
                  <p className="text-xs text-white/35">@{r.slug}</p>
                </div>
              ),
            },
            {
              key: 'trust',
              header: 'Trust level',
              render: (r) => (
                <TrustLevelBadge level={r.riskProfile?.trustLevel ?? 'NEW'} />
              ),
            },
            {
              key: 'delay',
              header: 'Payout hold',
              render: (r) => (
                <span className="font-mono text-xs">
                  {r.riskProfile?.payoutDelayDays ?? 30}d
                </span>
              ),
            },
            {
              key: 'sales',
              header: 'Lifetime sales',
              render: (r) =>
                formatAdminCents(r.riskProfile?.lifetimeSalesCents ?? 0),
            },
            {
              key: 'rates',
              header: 'Refund / dispute',
              render: (r) => (
                <span className="font-mono text-xs text-white/50">
                  {formatPercent(r.riskProfile?.refundRate ?? 0)} /{' '}
                  {formatPercent(r.riskProfile?.disputeRate ?? 0)}
                </span>
              ),
            },
            {
              key: 'active',
              header: 'Status',
              render: (r) => (
                <span className={r.isActive ? 'text-emerald-400' : 'text-red-400'}>
                  {r.isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'action',
              header: '',
              render: (r) => (
                <Link
                  href={`/admin/creators/${r.id}/risk`}
                  className="text-xs text-[#d4a853] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Risk →
                </Link>
              ),
            },
          ]}
        />
      </AdminPanel>
    </div>
  );
}
