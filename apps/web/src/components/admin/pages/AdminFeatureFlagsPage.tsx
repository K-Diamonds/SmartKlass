'use client';

import { useEffect, useState } from 'react';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import {
  listFeatureFlags,
  listFraudRules,
  seedFraudRules,
  updateFeatureFlag,
  type FeatureFlag,
  type FraudRule,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleTarget, setToggleTarget] = useState<FeatureFlag | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    const [f, r] = await Promise.all([listFeatureFlags(), listFraudRules()]);
    setFlags(f);
    setRules(r);
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading flags…" />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Platform controls"
        title="Feature flags & fraud rules"
        description="Gradual rollouts and configurable risk thresholds."
        actions={
          <button
            type="button"
            onClick={() => void seedFraudRules().then(load)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Seed default fraud rules
          </button>
        }
      />

      <AdminPanel title="Feature flags" noPadding>
        <DataTable
          rows={flags}
          keyFn={(r) => r.id}
          emptyMessage="No flags yet — create via API PATCH /admin/feature-flags/:key"
          columns={[
            { key: 'key', header: 'Key', render: (r) => <code className="text-[#d4a853]">{r.key}</code> },
            {
              key: 'enabled',
              header: 'Status',
              render: (r) => (
                <StatusBadge
                  label={r.enabled ? 'Enabled' : 'Disabled'}
                  tone={r.enabled ? 'success' : 'neutral'}
                />
              ),
            },
            {
              key: 'desc',
              header: 'Description',
              render: (r) => r.description ?? '—',
            },
            {
              key: 'toggle',
              header: '',
              render: (r) => (
                <button
                  type="button"
                  onClick={() => setToggleTarget(r)}
                  className="text-xs text-[#d4a853] hover:underline"
                >
                  Toggle
                </button>
              ),
            },
          ]}
        />
      </AdminPanel>

      <AdminPanel title="Fraud rules" noPadding>
        <DataTable
          rows={rules}
          keyFn={(r) => r.id}
          emptyMessage="No rules — click Seed default fraud rules."
          columns={[
            { key: 'name', header: 'Rule', render: (r) => r.name },
            {
              key: 'enabled',
              header: 'Status',
              render: (r) => (
                <StatusBadge
                  label={r.enabled ? 'Active' : 'Off'}
                  tone={r.enabled ? 'success' : 'neutral'}
                />
              ),
            },
            { key: 'desc', header: 'Description', render: (r) => r.description ?? '—' },
            {
              key: 'config',
              header: 'Config',
              render: (r) => (
                <code className="text-xs text-white/45">
                  {JSON.stringify(r.config)}
                </code>
              ),
            },
          ]}
        />
      </AdminPanel>

      {toggleTarget && (
        <AdminActionModal
          open
          onClose={() => setToggleTarget(null)}
          title={`${toggleTarget.enabled ? 'Disable' : 'Enable'} flag`}
          description={toggleTarget.key}
          confirmLabel="Confirm toggle"
          riskImpact="Affects platform behavior for all users when enabled."
          before={{ enabled: toggleTarget.enabled }}
          after={{ enabled: !toggleTarget.enabled }}
          loading={actionLoading}
          onConfirm={async () => {
            setActionLoading(true);
            try {
              await updateFeatureFlag(toggleTarget.key, !toggleTarget.enabled);
              setToggleTarget(null);
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
