import { apiFetch } from './client';

export type CreatorWallet = {
  availableBalanceCents: number;
  withdrawnBalanceCents: number;
  certificateEnablementFeeCents: number;
};

export type CertificateCheckout = {
  checkoutUrl: string;
  sessionId: string;
  courseId: string;
  amountCents: number;
  currency: string;
};

export type EnableCertificateResult = {
  courseId: string;
  offersCertificate: boolean;
  certificatePaidAt: string | null;
  availableBalanceCents?: number;
};

export type CoursePlanCheckout = {
  checkoutUrl: string;
  sessionId: string;
  accessPlanId: string;
  courseId: string;
  planType: string;
  amountCents: number;
  currency: string;
  billingInterval: string | null;
  platformFeeCents: number;
  creatorEarningsCents: number;
};

export type OwnerSelfSubscribeResult = {
  courseId: string;
  accessPlanId: string;
  alreadySubscribed: boolean;
};

export type StripeConnectStatus = {
  connected: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  stripeConfigured: boolean;
  payoutDelayDays: number;
};

export type StripeConnectLink = {
  url: string;
};

export function createCoursePlanCheckout(input: {
  accessPlanId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CoursePlanCheckout> {
  return apiFetch<CoursePlanCheckout>('/checkout/course-plan', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function ownerSelfSubscribeCoursePlan(
  accessPlanId: string,
): Promise<OwnerSelfSubscribeResult> {
  return apiFetch<OwnerSelfSubscribeResult>('/checkout/owner-self-subscribe', {
    method: 'POST',
    body: JSON.stringify({ accessPlanId }),
  });
}

export function getStripeConnectStatus(): Promise<StripeConnectStatus> {
  return apiFetch<StripeConnectStatus>('/billing/creator/stripe-connect/status');
}

export function createStripeConnectOnboardingLink(input: {
  returnUrl: string;
  refreshUrl: string;
}): Promise<StripeConnectLink> {
  return apiFetch<StripeConnectLink>('/billing/creator/stripe-connect/onboard', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createStripeConnectDashboardLink(): Promise<StripeConnectLink> {
  return apiFetch<StripeConnectLink>('/billing/creator/stripe-connect/dashboard', {
    method: 'POST',
  });
}

export type CreatorPayoutSummary = {
  stripeConnected: boolean;
  availableBalanceCents: number;
  pendingBalanceCents: number;
  nextPayoutDate: string | null;
  platformFeePercent: number;
  platformFeeMinimumCents: number;
  stripeFeesCents: number;
  payoutDelayDays: number;
  currency: string;
};

export function getCreatorPayoutSummary(): Promise<CreatorPayoutSummary> {
  return apiFetch<CreatorPayoutSummary>('/billing/creator/payouts/summary');
}

export function getCreatorWallet(): Promise<CreatorWallet> {
  return apiFetch<CreatorWallet>('/billing/creator/wallet');
}

export function createCertificateCheckout(input: {
  courseId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CertificateCheckout> {
  return apiFetch<CertificateCheckout>('/checkout/certificate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function enableCertificateWithBalance(
  courseId: string,
): Promise<EnableCertificateResult> {
  return apiFetch<EnableCertificateResult>(
    `/billing/creator/courses/${courseId}/certificate/enable-balance`,
    { method: 'POST' },
  );
}
