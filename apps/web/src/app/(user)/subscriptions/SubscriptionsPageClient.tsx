'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components';
import { useAuthSession } from '@/hooks/useAuthSession';
import { listMySubscriptions, type SubscriptionItem } from '@/lib/api/subscriptions';
import { formatPrice } from '@/lib/utils';

const ACTIVE_STATUSES = new Set(['ACTIVE', 'TRIALING']);

function formatRenewalDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBillingSuffix(interval: string | null): string {
  switch (interval) {
    case 'WEEKLY':
      return '/wk';
    case 'MONTHLY':
      return '/mo';
    case 'YEARLY':
      return '/yr';
    default:
      return '';
  }
}

export function SubscriptionsPageClient() {
  const { isAuthenticated, isLoading: authLoading } = useAuthSession();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptions([]);
      setReady(true);
      return;
    }

    let cancelled = false;

    async function loadSubscriptions() {
      try {
        const items = await listMySubscriptions();
        if (!cancelled) {
          setSubscriptions(items);
        }
      } catch {
        if (!cancelled) {
          setSubscriptions([]);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void loadSubscriptions();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => ACTIVE_STATUSES.has(subscription.status)),
    [subscriptions],
  );

  if (authLoading || !ready) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Subscriptions
        </h1>
        <p className="mt-8 text-sm text-muted-foreground">Loading subscriptions…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Subscriptions
      </h1>
      <p className="mt-1 text-muted-foreground">Manage your active course subscriptions</p>

      {activeSubscriptions.length > 0 ? (
        <div className="mt-8 space-y-4">
          {activeSubscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {sub.accessPlan.course.title}
                  </h3>
                  <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {sub.accessPlan.name} · {formatPrice(sub.accessPlan.priceCents)}
                  {formatBillingSuffix(sub.accessPlan.billingInterval)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Renews {formatRenewalDate(sub.currentPeriodEnd)}
                </p>
              </div>
              <Link
                href="/settings/billing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Manage billing →
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title="No active subscriptions"
          description="Subscribe to a course for ongoing weekly, monthly, or yearly access."
          action={
            <Link
              href="/discover"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              Explore courses
            </Link>
          }
        />
      )}
    </div>
  );
}
