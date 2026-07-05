import Stripe from 'stripe';

export function unwrapStripeResource<T extends { id: string }>(
  value: string | T | null | undefined,
): T | null {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? null : value;
}

export function getSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice,
): string | null {
  if (
    invoice.parent?.type !== 'subscription_details' ||
    !invoice.parent.subscription_details
  ) {
    return null;
  }

  const subscription = invoice.parent.subscription_details.subscription;

  return typeof subscription === 'string' ? subscription : subscription.id;
}

export function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
} {
  const firstItem = subscription.items?.data?.[0];

  if (firstItem?.current_period_start && firstItem?.current_period_end) {
    return {
      currentPeriodStart: new Date(firstItem.current_period_start * 1000),
      currentPeriodEnd: new Date(firstItem.current_period_end * 1000),
    };
  }

  const fallbackStart = new Date(subscription.start_date * 1000);

  return {
    currentPeriodStart: fallbackStart,
    currentPeriodEnd: fallbackStart,
  };
}

export function getInvoicePaymentIntentId(
  invoice: Stripe.Invoice,
): string | null {
  const payment = invoice.payments?.data?.[0];

  if (!payment || payment.payment.type !== 'payment_intent') {
    return null;
  }

  const paymentIntent = payment.payment.payment_intent;

  return typeof paymentIntent === 'string'
    ? paymentIntent
    : (paymentIntent?.id ?? null);
}
