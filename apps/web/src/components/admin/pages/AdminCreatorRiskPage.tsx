'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminActionModal } from '@/components/admin/AdminActionModal';
import { AuditTrailPanel } from '@/components/admin/AuditTrailPanel';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { TrustLevelBadge } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatAdminDate, formatPercent } from '@/components/admin/admin-utils';
import {
  addCreatorNote,
  extendPayoutHold,
  getCreatorRisk,
  getCreatorRiskEvents,
  listAuditLogs,
  markCreatorHighRisk,
  markCreatorTrusted,
  suspendCreator,
  type AdminAuditLog,
  type CreatorRiskEvent,
  type CreatorRiskProfile,
} from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

type ActionKind =
  | 'suspend'
  | 'trust'
  | 'high-risk'
  | 'extend-hold'
  | 'note'
  | null;

export function AdminCreatorRiskPage() {
  const params = useParams<{ id: string }>();
  const creatorId = params.id;

  const [profile, setProfile] = useState<CreatorRiskProfile | null>(null);
  const [events, setEvents] = useState<CreatorRiskEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ActionKind>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [extendDays, setExtendDays] = useState(14);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [p, e, logs] = await Promise.all([
      getCreatorRisk(creatorId),
      getCreatorRiskEvents(creatorId),
      listAuditLogs({ targetType: 'CREATOR_PROFILE', targetId: creatorId }),
    ]);
    setProfile(p);
    setEvents(e);
    setAuditLogs(logs);
  }, [creatorId]);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  async function runAction(reason: string) {
    if (!profile || !action) return;
    setActionLoading(true);
    setError(null);
    try {
      switch (action) {
        case 'suspend':
          await suspendCreator(creatorId, reason);
          break;
        case 'trust':
          await markCreatorTrusted(creatorId, reason, 14);
          break;
        case 'high-risk':
          await markCreatorHighRisk(creatorId, reason, 45);
          break;
        case 'extend-hold':
          await extendPayoutHold(creatorId, extendDays, reason);
          break;
        case 'note':
          await addCreatorNote(creatorId, noteText || reason, reason);
          break;
      }
      setAction(null);
      setNoteText('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState variant="page" label="Loading risk profile…" />;
  if (!profile) return <p className="text-white/50">Creator not found.</p>;

  const actionConfig = {
    suspend: {
      title: 'Suspend creator',
      description: 'Blocks payouts and course purchases. Requires audit reason.',
      confirmLabel: 'Suspend creator',
      destructive: true,
      riskImpact:
        'Creator checkout disabled, Stripe payout sync skipped, isActive set false.',
      before: {
        trustLevel: profile.trustLevel,
        payoutDelayDays: profile.payoutDelayDays,
      },
      after: { trustLevel: 'SUSPENDED', manualReviewRequired: true },
    },
    trust: {
      title: 'Mark as trusted',
      description: 'Reduces payout hold to 14 days (or 7 with override).',
      confirmLabel: 'Mark trusted',
      riskImpact: 'Faster payouts; manual review flag cleared.',
      before: {
        trustLevel: profile.trustLevel,
        payoutDelayDays: profile.payoutDelayDays,
      },
      after: { trustLevel: 'TRUSTED', payoutDelayDays: 14 },
    },
    'high-risk': {
      title: 'Mark high risk',
      description: 'Extends payout hold to 45 days and flags manual review.',
      confirmLabel: 'Mark high risk',
      destructive: true,
      riskImpact: 'Longer payout hold; appears in risk queue.',
      before: {
        trustLevel: profile.trustLevel,
        payoutDelayDays: profile.payoutDelayDays,
      },
      after: { trustLevel: 'HIGH_RISK', payoutDelayDays: 45 },
    },
    'extend-hold': {
      title: 'Extend payout hold',
      description: `Add ${extendDays} days to current hold and pending transactions.`,
      confirmLabel: 'Extend hold',
      riskImpact: 'Pending ledger transactions get later availableAt dates.',
      before: { payoutDelayDays: profile.payoutDelayDays },
      after: { payoutDelayDays: profile.payoutDelayDays + extendDays },
    },
    note: {
      title: 'Add internal note',
      description: 'Appended to creator risk profile (staff only).',
      confirmLabel: 'Save note',
      requireReason: true,
      riskImpact: 'Internal only — not visible to creator. Reason stored in audit log.',
    },
  } as const;

  const modal = action ? actionConfig[action] : null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Creator risk profile"
        title={creatorId}
        description="Trust tier, payout policy, risk events, and staff actions."
        actions={
          <Link href="/admin/creators" className="text-sm text-white/45 hover:text-white">
            ← All creators
          </Link>
        }
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-[#12121a] p-5">
          <p className="text-xs uppercase tracking-wide text-white/40">Trust level</p>
          <div className="mt-2">
            <TrustLevelBadge level={profile.trustLevel} />
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#12121a] p-5">
          <p className="text-xs uppercase tracking-wide text-white/40">Payout hold</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {profile.payoutDelayDays} days
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#12121a] p-5">
          <p className="text-xs uppercase tracking-wide text-white/40">Lifetime sales</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatAdminCents(profile.lifetimeSalesCents)}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#12121a] p-5">
          <p className="text-xs uppercase tracking-wide text-white/40">Refund / dispute</p>
          <p className="mt-2 font-mono text-lg text-white">
            {formatPercent(profile.refundRate)} / {formatPercent(profile.disputeRate)}
          </p>
        </div>
      </div>

      <AdminPanel title="Staff actions">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['trust', 'Mark trusted'],
              ['high-risk', 'High risk'],
              ['extend-hold', 'Extend hold'],
              ['note', 'Add note'],
              ['suspend', 'Suspend'],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => setAction(kind)}
              className={
                kind === 'suspend'
                  ? 'rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20'
                  : 'rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/8'
              }
            >
              {label}
            </button>
          ))}
        </div>
        {action === 'extend-hold' && (
          <div className="mt-4">
            <label className="text-xs text-white/45">Additional days</label>
            <input
              type="number"
              min={1}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="mt-1 w-32 rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
            />
          </div>
        )}
      </AdminPanel>

      {profile.notes && (
        <AdminPanel title="Internal notes">
          <pre className="whitespace-pre-wrap font-sans text-sm text-white/60">
            {profile.notes}
          </pre>
        </AdminPanel>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Risk events">
          <div className="space-y-2">
            {events.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-white/8 bg-[#0e0e14] px-4 py-3"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs text-[#d4a853]">{e.eventType}</span>
                  <span className="text-xs text-white/35">{formatAdminDate(e.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-white/65">{e.description}</p>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-sm text-white/40">No risk events recorded.</p>
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="Audit trail">
          <AuditTrailPanel logs={auditLogs} compact />
        </AdminPanel>
      </div>

      {modal && (
        <AdminActionModal
          open={Boolean(action)}
          onClose={() => setAction(null)}
          title={modal.title}
          description={modal.description}
          confirmLabel={modal.confirmLabel}
          destructive={'destructive' in modal && modal.destructive}
          riskImpact={modal.riskImpact}
          before={'before' in modal ? modal.before : undefined}
          after={'after' in modal ? modal.after : undefined}
          requireReason={
            'requireReason' in modal ? modal.requireReason : true
          }
          loading={actionLoading}
          extraFields={
            action === 'note' ? (
              <div>
                <label className="text-xs text-white/45">Note content</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  placeholder="Internal note for ops team…"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0e0e14] px-3 py-2 text-sm text-white"
                />
              </div>
            ) : undefined
          }
          onConfirm={runAction}
        />
      )}
    </div>
  );
}
