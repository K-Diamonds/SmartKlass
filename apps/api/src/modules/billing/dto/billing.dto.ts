import { IsString, IsUrl } from 'class-validator';

export class CreateCoursePlanCheckoutDto {
  @IsString()
  accessPlanId!: string;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class OwnerSelfSubscribeDto {
  @IsString()
  accessPlanId!: string;
}

export class OwnerSelfSubscribeResultDto {
  courseId!: string;
  accessPlanId!: string;
  alreadySubscribed!: boolean;
}

export class CreateCertificateCheckoutDto {
  @IsString()
  courseId!: string;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class CoursePlanCheckoutDto {
  checkoutUrl!: string;
  sessionId!: string;
  accessPlanId!: string;
  courseId!: string;
  planType!: string;
  amountCents!: number;
  currency!: string;
  billingInterval!: string | null;
  platformFeeCents!: number;
  creatorEarningsCents!: number;
}

export class CertificateCheckoutDto {
  checkoutUrl!: string;
  sessionId!: string;
  courseId!: string;
  amountCents!: number;
  currency!: string;
}

export class CreatorWalletDto {
  availableBalanceCents!: number;
  withdrawnBalanceCents!: number;
  certificateEnablementFeeCents!: number;
}

export class CreatorPayoutSummaryDto {
  stripeConnected!: boolean;
  availableBalanceCents!: number;
  pendingBalanceCents!: number;
  nextPayoutDate!: string | null;
  platformFeePercent!: number;
  platformFeeMinimumCents!: number;
  stripeFeesCents!: number;
  payoutDelayDays!: number;
  currency!: string;
}

export class EnableCertificateResultDto {
  courseId!: string;
  offersCertificate!: boolean;
  certificatePaidAt!: string | null;
  availableBalanceCents?: number;
}

export class BillingPaymentDto {
  id!: string;
  status!: string;
  amountCents!: number;
  currency!: string;
  paidAt!: string | null;
  createdAt!: string;
}

export class BillingPurchaseDto {
  id!: string;
  courseId!: string;
  accessPlanId!: string;
  status!: string;
  amountCents!: number;
  currency!: string;
  purchasedAt!: string | null;
  expiresAt!: string | null;
  course!: {
    slug: string;
    title: string;
  };
  accessPlan!: {
    name: string;
    planType: string;
  };
}

export class BillingSubscriptionDto {
  id!: string;
  accessPlanId!: string;
  status!: string;
  currentPeriodStart!: string;
  currentPeriodEnd!: string;
  canceledAt!: string | null;
  accessPlan!: {
    name: string;
    planType: string;
    billingInterval: string | null;
    courseId: string;
    course: {
      slug: string;
      title: string;
    };
  };
}

export class BillingMeDto {
  payments!: BillingPaymentDto[];
  purchases!: BillingPurchaseDto[];
  subscriptions!: BillingSubscriptionDto[];
  summary!: {
    totalPayments: number;
    completedPurchases: number;
    activeSubscriptions: number;
  };
}

export class StripeWebhookResponseDto {
  received!: boolean;
  message!: string;
}

export class StripeConnectStatusDto {
  connected!: boolean;
  payoutsEnabled!: boolean;
  chargesEnabled!: boolean;
  detailsSubmitted!: boolean;
  stripeConfigured!: boolean;
  payoutDelayDays!: number;
}

export class StripeConnectLinkDto {
  url!: string;
}

export class CreateStripeConnectLinkDto {
  @IsUrl({ require_tld: false })
  returnUrl!: string;

  @IsUrl({ require_tld: false })
  refreshUrl!: string;
}
