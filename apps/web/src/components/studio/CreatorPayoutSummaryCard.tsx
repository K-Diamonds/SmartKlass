'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getCreatorPayoutSummary,
  type CreatorPayoutSummary,
} from '@/lib/api/billing';
import { formatPrice } from '@/lib/utils';

function formatPayoutDate(isoDate: string | null): string {
  if (!isoDate) {
    return '—';
  }

  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

type PayoutMetricProps = {
  label: string;
  value: string;
  hint?: string;
};

function PayoutMetric({ label, value, hint }: PayoutMetricProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-background/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CreatorPayoutSummaryCard() {
  const [summary, setSummary] = useState<CreatorPayoutSummary | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getCreatorPayoutSummary();
        if (!cancelled) {
          setSummary(data);
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const currency = summary?.currency ?? 'USD';
  const platformFeeLabel = `${summary?.platformFeePercent ?? 20}%`;
  const platformFeeHint =
    summary != null
      ? `$${((summary.platformFeeMinimumCents ?? 500) / 100).toFixed(0)} minimum`
      : undefined;

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Creator dashboard
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live balances from your connected Stripe account. Pending funds wait{' '}
            {summary?.payoutDelayDays ?? 30} days before payout.
          </p>
        </div>
        {ready && summary && !summary.stripeConnected && (
          <Link
            href="/studio/settings"
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border-subtle"
          >
            Connect Stripe
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PayoutMetric
          label="Available"
          value={
            ready && summary
              ? formatPrice(summary.availableBalanceCents, currency)
              : '…'
          }
        />
        <PayoutMetric
          label="Pending"
          value={
            ready && summary
              ? formatPrice(summary.pendingBalanceCents, currency)
              : '…'
          }
          hint={
            ready && summary && summary.pendingBalanceCents > 0
              ? 'Held during refund/dispute window'
              : undefined
          }
        />
        <PayoutMetric
          label="Next payout"
          value={
            ready && summary
              ? formatPayoutDate(summary.nextPayoutDate)
              : '…'
          }
        />
        <PayoutMetric
          label="Platform fee"
          value={ready ? platformFeeLabel : '…'}
          hint={platformFeeHint}
        />
        <PayoutMetric
          label="Stripe fees"
          value={
            ready && summary
              ? formatPrice(summary.stripeFeesCents, currency)
              : '…'
          }
          hint={ready ? 'Last 30 days' : undefined}
        />
      </div>
    </section>
  );
}
