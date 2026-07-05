'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Award, CreditCard, Wallet } from 'lucide-react';
import { CERTIFICATE_ENABLEMENT_FEE_CENTS } from '@smartklass/shared';
import {
  createCertificateCheckout,
  enableCertificateWithBalance,
  getCreatorWallet,
  type CreatorWallet,
} from '@/lib/api/billing';
import { getMyCourseStudio } from '@/lib/api/courses';
import { ApiRequestError } from '@/lib/api/types';
import { courseBuilderUrl } from '@/lib/courses';
import { formatPrice } from '@/lib/utils';

type CertificatePaymentClientProps = {
  courseId: string;
};

export function CertificatePaymentClient({ courseId }: CertificatePaymentClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const [courseTitle, setCourseTitle] = useState('Your course');
  const [wallet, setWallet] = useState<CreatorWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayingStripe, setIsPayingStripe] = useState(false);
  const [isPayingBalance, setIsPayingBalance] = useState(false);

  const feeLabel = formatPrice(CERTIFICATE_ENABLEMENT_FEE_CENTS);
  const builderUrl = courseBuilderUrl(courseId);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [course, walletData] = await Promise.all([
        getMyCourseStudio(courseId),
        getCreatorWallet(),
      ]);
      setCourseTitle(course.title);
      setWallet(walletData);

      if (course.offersCertificate) {
        router.replace(`${builderUrl}?certificate=enabled`);
      }
    } catch (loadError) {
      const message =
        loadError instanceof ApiRequestError
          ? loadError.message
          : 'Could not load payment details.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, builderUrl, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status === 'success') {
      router.replace(`${builderUrl}?certificate=enabled`);
    }
  }, [status, builderUrl, router]);

  const handleStripeCheckout = async () => {
    setIsPayingStripe(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const checkout = await createCertificateCheckout({
        courseId,
        successUrl: `${origin}/studio/payments?courseId=${encodeURIComponent(courseId)}&status=success`,
        cancelUrl: `${origin}/studio/payments?courseId=${encodeURIComponent(courseId)}&status=cancelled`,
      });
      window.location.href = checkout.checkoutUrl;
    } catch (checkoutError) {
      const message =
        checkoutError instanceof ApiRequestError
          ? checkoutError.message
          : 'Could not start Stripe checkout.';
      setError(message);
      setIsPayingStripe(false);
    }
  };

  const handleBalancePayment = async () => {
    setIsPayingBalance(true);
    setError(null);

    try {
      await enableCertificateWithBalance(courseId);
      router.replace(`${builderUrl}?certificate=enabled`);
    } catch (balanceError) {
      const message =
        balanceError instanceof ApiRequestError
          ? balanceError.message
          : 'Could not pay with account balance.';
      setError(message);
      setIsPayingBalance(false);
    }
  };

  const canUseBalance =
    wallet !== null &&
    wallet.availableBalanceCents >= CERTIFICATE_ENABLEMENT_FEE_CENTS;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-sm text-muted-foreground">
        Loading payment options…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href={builderUrl}
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Back to course builder
        </Link>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-foreground">
          Enable certificate
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pay the one-time {feeLabel} platform fee for{' '}
          <span className="font-medium text-foreground">{courseTitle}</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted">
            <Award size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Certificate fee</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{feeLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              One-time per course. Your course will appear in the Certificates tab on Discover once
              enabled, and learners receive a certificate of completion when they finish — a milestone
              many students value for the sense of accomplishment it brings.
            </p>
          </div>
        </div>

        {wallet && (
          <div className="mt-5 rounded-xl border border-border-subtle bg-muted/30 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Wallet size={16} className="text-accent" />
              Available balance: {formatPrice(wallet.availableBalanceCents)}
            </p>
            {wallet.withdrawnBalanceCents > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPrice(wallet.withdrawnBalanceCents)} already withdrawn from your account.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {status === 'cancelled' && (
          <p className="mt-4 text-sm text-muted-foreground">
            Stripe checkout was cancelled. You can try again below.
          </p>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleStripeCheckout}
            disabled={isPayingStripe || isPayingBalance}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <CreditCard size={16} />
            {isPayingStripe ? 'Redirecting to Stripe…' : `Pay ${feeLabel} with Stripe`}
          </button>

          {canUseBalance && (
            <button
              type="button"
              onClick={handleBalancePayment}
              disabled={isPayingStripe || isPayingBalance}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-border-subtle disabled:opacity-60"
            >
              <Wallet size={16} />
              {isPayingBalance
                ? 'Processing…'
                : `Use account balance (${formatPrice(wallet.availableBalanceCents)})`}
            </button>
          )}

          {wallet && !canUseBalance && wallet.availableBalanceCents > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Your balance covers part of the fee. Pay the remaining{' '}
              {formatPrice(CERTIFICATE_ENABLEMENT_FEE_CENTS - wallet.availableBalanceCents)} with
              Stripe.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
