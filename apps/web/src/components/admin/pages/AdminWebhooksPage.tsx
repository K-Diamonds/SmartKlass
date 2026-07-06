'use client';

import { useEffect, useState } from 'react';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { formatAdminDate } from '@/components/admin/admin-utils';
import {
  listProcessedStripeEvents,
  markStripeEventReplay,
  replayStripeEvent,
  type ProcessedStripeEvent,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminWebhooksPage() {
  const [events, setEvents] = useState<ProcessedStripeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<ProcessedStripeEvent | null>(null);
  const [replayMode, setReplayMode] = useState<'mark' | 'replay'>('mark');
  const [force, setForce] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setEvents(await listProcessedStripeEvents(100));
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="page" label="Loading webhook events…" />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Stripe webhooks"
        title="Webhook replay"
        description="Safely re-process Stripe events with idempotency controls."
      />

      <AdminPanel noPadding>
        <DataTable
          rows={events}
          keyFn={(r) => r.id}
          columns={[
            {
              key: 'id',
              header: 'Event ID',
              render: (r) => (
                <span className="font-mono text-xs text-white/55">{r.id}</span>
              ),
            },
            { key: 'type', header: 'Type', render: (r) => r.type },
            { key: 'created', header: 'Processed', render: (r) => formatAdminDate(r.createdAt) },
            {
              key: 'replay',
              header: 'Replay',
              render: (r) =>
                r.replayRequestedAt ? (
                  <StatusBadge label="Queued" tone="warning" />
                ) : r.replayCount > 0 ? (
                  <StatusBadge label={`×${r.replayCount}`} tone="info" />
                ) : (
                  '—'
                ),
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTarget(r);
                      setReplayMode('mark');
                    }}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTarget(r);
                      setReplayMode('replay');
                    }}
                    className="text-xs text-[#d4a853] hover:underline"
                  >
                    Replay
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AdminPanel>

      {target && (
        <AdminActionModal
          open
          onClose={() => setTarget(null)}
          title={replayMode === 'mark' ? 'Mark for replay' : 'Replay event'}
          description={`${target.type} — ${target.id}`}
          confirmLabel={replayMode === 'mark' ? 'Mark for replay' : 'Replay now'}
          riskImpact={
            replayMode === 'replay'
              ? 'Re-dispatches handlers. Use force only if handlers are idempotent.'
              : 'Flags event for ops review before replay.'
          }
          loading={actionLoading}
          extraFields={
            replayMode === 'replay' ? (
              <label className="flex items-center gap-2 text-sm text-white/60">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                />
                Force replay (skip idempotency check)
              </label>
            ) : undefined
          }
          onConfirm={async (reason) => {
            setActionLoading(true);
            try {
              if (replayMode === 'mark') {
                await markStripeEventReplay(target.id, reason);
              } else {
                await replayStripeEvent(target.id, reason, force);
              }
              setTarget(null);
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
