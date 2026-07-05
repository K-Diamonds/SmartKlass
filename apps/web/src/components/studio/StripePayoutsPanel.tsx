'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createStripeConnectDashboardLink,
  createStripeConnectOnboardingLink,
  getStripeConnectStatus,
  type StripeConnectStatus,
} from '@/lib/api/billing';
import { ApiRequestError } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function buildSettingsReturnUrl(): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  const search = window.location.search;
  return `${origin}${path}${search}`;
}

function resolveStatusLabel(status: StripeConnectStatus): string {
  if (!status.connected) {
    return 'Stripe not connected';
  }

  if (!status.detailsSubmitted) {
    return 'Stripe connected · Setup incomplete';
  }

  if (!status.payoutsEnabled) {
    return 'Stripe connected · Payouts pending';
  }

  return 'Stripe connected · Payouts enabled';
}

function resolveStatusTone(status: StripeConnectStatus): 'success' | 'warning' {
  if (status.connected && status.detailsSubmitted && status.payoutsEnabled) {
    return 'success';
  }

  return 'warning';
}

function resolveActionLabel(status: StripeConnectStatus): string {
  if (!status.connected || !status.detailsSubmitted || !status.payoutsEnabled) {
    return status.connected ? 'Continue Stripe setup' : 'Connect with Stripe';
  }

  return 'Manage Stripe account';
}

function formatLoadError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 404) {
      return 'Payout status is unavailable. Restart the API server, then refresh this page.';
    }

    return err.message;
  }

  return 'Could not load Stripe payout status.';
}

const disconnectedStatus: StripeConnectStatus = {
  connected: false,
  payoutsEnabled: false,
  chargesEnabled: false,
  detailsSubmitted: false,
  stripeConfigured: false,
  payoutDelayDays: 30,
};

export function StripePayoutsPanel() {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setError(null);

    try {
      const nextStatus = await getStripeConnectStatus();
      setStatus(nextStatus);
    } catch (err) {
      setError(formatLoadError(err));
      setStatus(disconnectedStatus);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleAction = async () => {
    setIsRedirecting(true);
    setError(null);

    try {
      const returnUrl = buildSettingsReturnUrl();
      const currentStatus = status ?? disconnectedStatus;

      if (
        !currentStatus.connected ||
        !currentStatus.detailsSubmitted ||
        !currentStatus.payoutsEnabled
      ) {
        const link = await createStripeConnectOnboardingLink({
          returnUrl,
          refreshUrl: returnUrl,
        });
        window.location.href = link.url;
        return;
      }

      const link = await createStripeConnectDashboardLink();
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.status === 404
            ? 'Stripe payout endpoints are unavailable. Restart the API server and try again.'
            : err.message
          : 'Could not open Stripe. Please try again.';
      setError(message);
    } finally {
      setIsRedirecting(false);
    }
  };

  const currentStatus = status ?? disconnectedStatus;
  const statusLabel = isLoading
    ? 'Loading Stripe status…'
    : resolveStatusLabel(currentStatus);
  const statusTone = isLoading ? 'warning' : resolveStatusTone(currentStatus);
  const actionLabel = resolveActionLabel(currentStatus);
  const stripeUnavailable = !isLoading && currentStatus.stripeConfigured === false;

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
      <h2 className="text-sm font-medium text-foreground">Payouts</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Connect your Stripe account to receive payouts. Learner payments go to your
        connected Stripe balance first; bank payouts are delayed{' '}
        {status?.payoutDelayDays ?? 30} days so refunds, disputes, and chargebacks
        can be handled before you receive funds. SmartKlass keeps its platform fee
        automatically.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-subtle bg-border-subtle/30 px-4 py-3">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            isLoading
              ? 'bg-muted-foreground/40'
              : statusTone === 'success'
                ? 'bg-emerald-500'
                : 'bg-amber-500',
          )}
          aria-hidden
        />
        <span className="text-sm text-foreground">{statusLabel}</span>
      </div>

      {stripeUnavailable && (
        <p className="mt-3 text-sm text-muted-foreground">
          Stripe payouts are not configured in this environment yet. Add{' '}
          <code className="rounded bg-border-subtle px-1 py-0.5 text-xs">
            STRIPE_SECRET_KEY
          </code>{' '}
          to enable account connection.
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleAction()}
        disabled={isLoading || isRedirecting || stripeUnavailable}
        className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border-subtle disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRedirecting ? 'Opening Stripe…' : actionLabel}
      </button>

      {!isLoading && error && (
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            void loadStatus();
          }}
          className="mt-2 text-sm font-medium text-accent hover:underline"
        >
          Retry status check
        </button>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
