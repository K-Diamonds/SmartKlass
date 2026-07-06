'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminPageHeader, AdminPanel } from '@/components/admin/AdminPageHeader';
import { StatusBadge, payoutStatusTone } from '@/components/admin/StatusBadge';
import { formatAdminCents, formatAdminDate } from '@/components/admin/admin-utils';
import { getTransaction, type AdminTransactionDetail } from '@/lib/api/admin';
import { LoadingState } from '@/components/ui/LoadingState';

export function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<AdminTransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTransaction(await getTransaction(params.id));
    } catch {
      setError('Transaction not found.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState variant="page" label="Loading transaction…" />;
  if (error || !transaction) {
    return (
      <div className="text-center text-white/50">
        {error ?? 'Transaction not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Transaction drill-down"
        title={transaction.course.title}
        description={`Ledger entry ${transaction.id}`}
        actions={
          <Link
            href={`/admin/creators/${transaction.creatorProfile.id}/risk`}
            className="text-sm text-[#d4a853] hover:underline"
          >
            Creator risk →
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Summary">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/45">Status</dt>
              <dd>
                <StatusBadge
                  label={transaction.status}
                  tone={payoutStatusTone(transaction.status)}
                />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/45">Gross</dt>
              <dd className="font-mono">
                {formatAdminCents(transaction.grossAmountCents, transaction.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/45">Platform fee</dt>
              <dd className="font-mono">
                {formatAdminCents(transaction.platformFeeCents, transaction.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/45">Creator net</dt>
              <dd className="font-mono text-[#d4a853]">
                {formatAdminCents(transaction.creatorNetCents, transaction.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/45">Created</dt>
              <dd>{formatAdminDate(transaction.createdAt)}</dd>
            </div>
            {transaction.availableAt && (
              <div className="flex justify-between">
                <dt className="text-white/45">Available at</dt>
                <dd>{formatAdminDate(transaction.availableAt)}</dd>
              </div>
            )}
          </dl>
        </AdminPanel>

        <AdminPanel title="Stripe references">
          <dl className="space-y-3 font-mono text-xs text-white/70">
            <div>
              <dt className="text-white/35">Charge</dt>
              <dd className="break-all">{transaction.stripeChargeId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-white/35">Payment intent</dt>
              <dd className="break-all">{transaction.stripePaymentIntentId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-white/35">Transfer</dt>
              <dd className="break-all">{transaction.stripeTransferId ?? '—'}</dd>
            </div>
          </dl>
        </AdminPanel>

        {transaction.payment && (
          <AdminPanel title="Buyer payment">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-white/45">Buyer</dt>
                <dd>{transaction.payment.user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/45">Amount</dt>
                <dd className="font-mono">
                  {formatAdminCents(transaction.payment.amountCents, transaction.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/45">Payment status</dt>
                <dd>{transaction.payment.status}</dd>
              </div>
            </dl>
          </AdminPanel>
        )}

        <AdminPanel title="Related activity">
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/35">Refunds</p>
              {transaction.refunds.length === 0 ? (
                <p className="text-white/40">None</p>
              ) : (
                <ul className="space-y-1">
                  {transaction.refunds.map((refund) => (
                    <li key={refund.id} className="flex justify-between">
                      <span>{formatAdminDate(refund.createdAt)}</span>
                      <span className="font-mono">
                        {formatAdminCents(refund.amountCents, transaction.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/35">Disputes</p>
              {transaction.disputes.length === 0 ? (
                <p className="text-white/40">None</p>
              ) : (
                <ul className="space-y-1">
                  {transaction.disputes.map((dispute) => (
                    <li key={dispute.id} className="flex justify-between">
                      <StatusBadge label={dispute.status} tone="warning" />
                      <span className="font-mono">
                        {formatAdminCents(dispute.amountCents, transaction.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </AdminPanel>
      </div>

      {transaction.adminFlaggedAt && (
        <AdminPanel title="Admin flag">
          <p className="text-sm text-amber-300">
            Flagged {formatAdminDate(transaction.adminFlaggedAt)}
          </p>
          <p className="mt-2 text-sm text-white/60">{transaction.adminFlagReason}</p>
        </AdminPanel>
      )}
    </div>
  );
}
